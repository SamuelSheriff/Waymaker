import { useGoalStore } from "./store";
import {
  fetchGoalsFromCloud,
  fetchBoardsFromCloud,
  fetchProfileFromCloud,
  syncGoalToCloud,
  syncBoardToCloud,
  syncProfileToCloud,
  deleteGoalFromCloud,
  deleteBoardFromCloud,
  supabase,
  TABLES,
} from "./supabase";

let initialized = false;
let isSyncing = false;

export async function initCloudSync(): Promise<void> {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    // 1. Initial pull from Supabase
    const [cloudGoals, cloudBoards, cloudProfile] = await Promise.all([
      fetchGoalsFromCloud(),
      fetchBoardsFromCloud(),
      fetchProfileFromCloud(),
    ]);

    const state = useGoalStore.getState();

    // If cloud has goals, load them
    if (cloudGoals && cloudGoals.length > 0) {
      useGoalStore.setState({ goals: cloudGoals });
    } else if (state.goals.length > 0) {
      // Cloud is empty, push existing local seed/goals up
      for (const g of state.goals) {
        await syncGoalToCloud(g);
      }
    }

    // If cloud has boards, load them
    if (cloudBoards && cloudBoards.length > 0) {
      useGoalStore.setState({ boards: cloudBoards });
    } else if (state.boards.length > 0) {
      for (const b of state.boards) {
        await syncBoardToCloud(b);
      }
    }

    // If cloud has profile, load it
    if (cloudProfile && cloudProfile.name) {
      useGoalStore.setState({ profile: cloudProfile });
    } else if (state.profile.name) {
      await syncProfileToCloud(state.profile);
    }

    // 2. Setup Real-time Subscription for multi-device sync
    supabase
      .channel("waymark_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLES.GOALS },
        async () => {
          if (isSyncing) return;
          const freshGoals = await fetchGoalsFromCloud();
          if (freshGoals) useGoalStore.setState({ goals: freshGoals });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLES.BOARDS },
        async () => {
          if (isSyncing) return;
          const freshBoards = await fetchBoardsFromCloud();
          if (freshBoards) useGoalStore.setState({ boards: freshBoards });
        },
      )
      .subscribe();

    // 3. Listen to local Zustand store mutations and sync to cloud (debounced)
    let syncTimeout: number | undefined;
    useGoalStore.subscribe((curr, prev) => {
      if (curr.goals === prev.goals && curr.boards === prev.boards && curr.profile === prev.profile) {
        return;
      }

      window.clearTimeout(syncTimeout);
      syncTimeout = window.setTimeout(async () => {
        isSyncing = true;
        try {
          // Sync any new/updated goals
          for (const g of curr.goals) {
            await syncGoalToCloud(g);
          }
          // Detect deleted goals
          const deletedGoals = prev.goals.filter((pg) => !curr.goals.some((cg) => cg.id === pg.id));
          for (const dg of deletedGoals) {
            await deleteGoalFromCloud(dg.id);
          }

          // Sync any new/updated boards
          for (const b of curr.boards) {
            await syncBoardToCloud(b);
          }
          // Detect deleted boards
          const deletedBoards = prev.boards.filter((pb) => !curr.boards.some((cb) => cb.id === pb.id));
          for (const db of deletedBoards) {
            await deleteBoardFromCloud(db.id);
          }

          // Sync profile
          if (curr.profile.name !== prev.profile.name) {
            await syncProfileToCloud(curr.profile);
          }
        } finally {
          isSyncing = false;
        }
      }, 800);
    });
  } catch (err) {
    console.warn("[CloudSync] Initialization warning:", err);
  }
}
