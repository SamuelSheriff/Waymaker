import { useGoalStore } from "./store";
import {
  fetchGoalsFromCloud,
  fetchBoardsFromCloud,
  fetchProfileFromCloud,
  syncGoalsBatch,
  syncBoardsBatch,
  syncProfileToCloud,
  deleteGoalFromCloud,
  deleteBoardFromCloud,
  supabase,
  TABLES,
  getClientId,
} from "./supabase";
import type { Goal, Board } from "./types";

let initialized = false;
let isSyncing = false;

function mergeGoals(local: Goal[], cloud: Goal[]): Goal[] {
  const map = new Map<string, Goal>();
  for (const g of local) map.set(g.id, g);
  for (const cg of cloud) {
    const lg = map.get(cg.id);
    if (!lg) {
      map.set(cg.id, cg);
    } else {
      // Pick newer by updatedAt or checkIn count
      const localTime = new Date(lg.updatedAt || lg.createdAt).getTime();
      const cloudTime = new Date(cg.updatedAt || cg.createdAt).getTime();
      if (cloudTime > localTime || cg.checkIns.length > lg.checkIns.length) {
        map.set(cg.id, cg);
      }
    }
  }
  return Array.from(map.values());
}

function mergeBoards(local: Board[], cloud: Board[]): Board[] {
  const map = new Map<string, Board>();
  for (const b of local) map.set(b.id, b);
  for (const cb of cloud) {
    const lb = map.get(cb.id);
    if (!lb) {
      map.set(cb.id, cb);
    } else {
      const localTime = new Date(lb.updatedAt).getTime();
      const cloudTime = new Date(cb.updatedAt).getTime();
      if (cloudTime > localTime) {
        map.set(cb.id, cb);
      }
    }
  }
  return Array.from(map.values());
}

export async function initCloudSync(): Promise<void> {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    const clientId = getClientId();

    // 1. Initial pull from Supabase
    const [cloudGoals, cloudBoards, cloudProfile] = await Promise.all([
      fetchGoalsFromCloud(),
      fetchBoardsFromCloud(),
      fetchProfileFromCloud(),
    ]);

    const state = useGoalStore.getState();

    // Intelligent two-way merge for goals
    if (cloudGoals && cloudGoals.length > 0) {
      const merged = mergeGoals(state.goals, cloudGoals);
      useGoalStore.setState({ goals: merged });
      // Push back any local goals that were missing in cloud
      await syncGoalsBatch(merged);
    } else if (state.goals.length > 0) {
      await syncGoalsBatch(state.goals);
    }

    // Intelligent two-way merge for boards
    if (cloudBoards && cloudBoards.length > 0) {
      const mergedBoards = mergeBoards(state.boards, cloudBoards);
      useGoalStore.setState({ boards: mergedBoards });
      await syncBoardsBatch(mergedBoards);
    } else if (state.boards.length > 0) {
      await syncBoardsBatch(state.boards);
    }

    // Sync profile
    if (cloudProfile && cloudProfile.name) {
      useGoalStore.setState({ profile: cloudProfile });
    } else if (state.profile.name) {
      await syncProfileToCloud(state.profile);
    }

    // 2. Setup Real-time Subscription for multi-device sync scoped to clientId
    supabase
      .channel(`waymark_realtime_${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.GOALS,
          filter: `client_id=eq.${clientId}`,
        },
        async () => {
          if (isSyncing) return;
          const freshGoals = await fetchGoalsFromCloud();
          if (freshGoals && freshGoals.length > 0) {
            useGoalStore.setState((s) => ({ goals: mergeGoals(s.goals, freshGoals) }));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.BOARDS,
          filter: `client_id=eq.${clientId}`,
        },
        async () => {
          if (isSyncing) return;
          const freshBoards = await fetchBoardsFromCloud();
          if (freshBoards && freshBoards.length > 0) {
            useGoalStore.setState((s) => ({ boards: mergeBoards(s.boards, freshBoards) }));
          }
        },
      )
      .subscribe();

    // 3. Listen to local Zustand store mutations and sync to cloud (batch debounced)
    let syncTimeout: number | undefined;
    useGoalStore.subscribe((curr, prev) => {
      if (curr.goals === prev.goals && curr.boards === prev.boards && curr.profile === prev.profile) {
        return;
      }

      window.clearTimeout(syncTimeout);
      syncTimeout = window.setTimeout(async () => {
        isSyncing = true;
        try {
          // Batch sync all current goals
          if (curr.goals.length > 0) {
            await syncGoalsBatch(curr.goals);
          }

          // Detect deleted goals
          const deletedGoals = prev.goals.filter((pg) => !curr.goals.some((cg) => cg.id === pg.id));
          for (const dg of deletedGoals) {
            await deleteGoalFromCloud(dg.id);
          }

          // Batch sync all current boards
          if (curr.boards.length > 0) {
            await syncBoardsBatch(curr.boards);
          }

          // Detect deleted boards
          const deletedBoards = prev.boards.filter((pb) => !curr.boards.some((cb) => cb.id === pb.id));
          for (const db of deletedBoards) {
            await deleteBoardFromCloud(db.id);
          }

          // Sync profile
          if (
            curr.profile.name !== prev.profile.name ||
            curr.profile.aiApiKey !== prev.profile.aiApiKey ||
            curr.profile.aiProvider !== prev.profile.aiProvider
          ) {
            await syncProfileToCloud(curr.profile);
          }
        } finally {
          isSyncing = false;
        }
      }, 700);
    });
  } catch (err) {
    console.warn("[CloudSync] Initialization warning:", err);
  }
}
