import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Board, Goal, GoalKind, GoalStatus, Reminder, Sticky, Stroke } from "./types";
import { KIND_META } from "./types";
import { nid } from "./utils";
import { INBOX_BOARD_ID, SEED_BOARDS, SEED_GOALS } from "./seed";
import { effectiveTarget } from "./format";

export interface GoalDraft {
  title: string;
  why: string;
  kind: GoalKind;
  target: number;
  unit: string;
  deadline: string | null;
}

export interface WaymarkSnapshot {
  v: 2;
  profile: { name: string };
  goals: Goal[];
  boards: Board[];
  lastBoardId: string;
}

interface GoalState {
  hasInitialized: boolean;
  profile: { name: string };
  goals: Goal[];
  boards: Board[];
  lastBoardId: string;
  hydrateReady: boolean;
  setHydrateReady: (v: boolean) => void;
  ensureSeeded: () => void;
  resetToSeed: () => void;
  setName: (name: string) => void;
  addGoal: (draft: GoalDraft) => string;
  updateGoal: (
    id: string,
    patch: Partial<Pick<Goal, "title" | "why" | "target" | "unit" | "deadline" | "status">>,
  ) => void;
  deleteGoal: (id: string) => void;
  setStatus: (id: string, status: GoalStatus) => void;
  logProgress: (id: string, amount: number, note: string) => void;
  undoLastCheckIn: (id: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  addMilestone: (goalId: string, title: string) => void;
  removeMilestone: (goalId: string, milestoneId: string) => void;
  setReminder: (goalId: string, reminder: Reminder | null) => void;
  markReminderFired: (goalId: string, dateKey: string) => void;
  addStroke: (boardId: string, stroke: Stroke) => void;
  setBoardStrokes: (boardId: string, strokes: Stroke[]) => void;
  addSticky: (boardId: string, sticky: Omit<Sticky, "id">) => string;
  updateSticky: (boardId: string, stickyId: string, patch: Partial<Sticky>) => void;
  removeSticky: (boardId: string, stickyId: string) => void;
  setLastBoard: (id: string) => void;
  createBoard: (title: string, goalId: string | null) => string;
  renameBoard: (boardId: string, title: string) => void;
  clearBoard: (boardId: string) => void;
  deleteBoard: (boardId: string) => void;
  exportSnapshot: () => WaymarkSnapshot;
  importSnapshot: (data: unknown) => boolean;
}

const emptyReminder = (): Reminder => ({
  enabled: true,
  time: "08:00",
  days: [1, 2, 3, 4, 5],
  lastFiredDate: null,
  message: "",
});

const EMPTY_INBOX: Board = {
  id: INBOX_BOARD_ID,
  title: "Ideas",
  goalId: null,
  strokes: [],
  stickies: [],
  updatedAt: new Date(0).toISOString(),
};

function syncProjectCurrent(goal: Goal): Goal {
  if (goal.kind !== "project" || goal.milestones.length === 0) return goal;
  const current = goal.milestones.filter((m) => m.done).length;
  const target = goal.milestones.length;
  const completed = current >= target;
  return {
    ...goal,
    current,
    target,
    status: completed ? "completed" : goal.status === "completed" ? "active" : goal.status,
  };
}

function isGoalArray(v: unknown): v is Goal[] {
  return Array.isArray(v);
}

function isBoardArray(v: unknown): v is Board[] {
  return Array.isArray(v);
}

function repairBoards(boards: Board[], lastBoardId: string): { boards: Board[]; lastBoardId: string } {
  const next = boards.slice();
  if (!next.some((b) => b.id === INBOX_BOARD_ID)) {
    next.unshift({ ...EMPTY_INBOX, updatedAt: new Date().toISOString() });
  }
  const last = next.some((b) => b.id === lastBoardId) ? lastBoardId : INBOX_BOARD_ID;
  return { boards: next, lastBoardId: last };
}

function isSnapshot(data: unknown): data is WaymarkSnapshot | (WaymarkSnapshot & { v?: number }) {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return isGoalArray(d.goals) && isBoardArray(d.boards) && typeof d.profile === "object" && d.profile !== null;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      hasInitialized: false,
      hydrateReady: true,
      profile: { name: "" },
      goals: SEED_GOALS,
      boards: SEED_BOARDS,
      lastBoardId: INBOX_BOARD_ID,
      setHydrateReady: (v) => set({ hydrateReady: v }),
      ensureSeeded: () => {
        if (!useGoalStore.persist.hasHydrated()) return;
        const state = get();
        if (!state.hasInitialized) {
          set({
            hasInitialized: true,
            hydrateReady: true,
            goals: state.goals.length > 0 ? state.goals : SEED_GOALS,
            boards: state.boards.length > 0 ? state.boards : SEED_BOARDS,
            lastBoardId: state.lastBoardId || INBOX_BOARD_ID,
          });
          return;
        }
        const repaired = repairBoards(state.boards, state.lastBoardId);
        set({
          hydrateReady: true,
          boards: repaired.boards,
          lastBoardId: repaired.lastBoardId,
        });
      },
      resetToSeed: () =>
        set({
          hasInitialized: true,
          hydrateReady: true,
          goals: SEED_GOALS,
          boards: SEED_BOARDS,
          lastBoardId: INBOX_BOARD_ID,
        }),
      setName: (name) => set({ profile: { name } }),
      addGoal: (draft) => {
        const id = nid();
        const kindMeta = KIND_META[draft.kind];
        const boardId = draft.kind === "project" ? nid() : INBOX_BOARD_ID;
        const target = Number.isFinite(draft.target) && draft.target > 0 ? draft.target : kindMeta.defaultTarget;
        const goal: Goal = {
          id,
          title: draft.title.trim(),
          why: draft.why.trim(),
          kind: draft.kind,
          status: "active",
          target: Math.max(1, target),
          current: 0,
          unit: draft.unit || kindMeta.defaultUnit,
          deadline: draft.deadline,
          createdAt: new Date().toISOString(),
          milestones:
            draft.kind === "project"
              ? Array.from({ length: Math.max(1, Math.round(target || 3)) }, (_, i) => ({
                  id: nid(),
                  title: `Step ${i + 1}`,
                  done: false,
                }))
              : [],
          checkIns: [],
          reminder: null,
          boardId,
        };
        const boards = get().boards.slice();
        if (draft.kind === "project") {
          boards.push({
            id: boardId,
            title: goal.title,
            goalId: id,
            strokes: [],
            stickies: [],
            updatedAt: new Date().toISOString(),
          });
        }
        set({ goals: [goal, ...get().goals], boards, lastBoardId: boardId });
        return id;
      },
      updateGoal: (id, patch) => {
        const goals = get().goals.map((g) => (g.id === id ? { ...g, ...patch } : g));
        let boards = get().boards;
        if (typeof patch.title === "string") {
          const goal = goals.find((g) => g.id === id);
          if (goal?.kind === "project") {
            boards = boards.map((b) =>
              b.goalId === id
                ? { ...b, title: patch.title!.trim() || b.title, updatedAt: new Date().toISOString() }
                : b,
            );
          }
        }
        set({ goals, boards });
      },
      deleteGoal: (id) => {
        const goal = get().goals.find((g) => g.id === id);
        set({
          goals: get().goals.filter((g) => g.id !== id),
          boards: get().boards.filter((b) => !(goal && b.id === goal.boardId && b.goalId === id)),
        });
      },
      setStatus: (id, status) =>
        set({
          goals: get().goals.map((g) => (g.id === id ? { ...g, status } : g)),
        }),
      logProgress: (id, amount, note) =>
        set({
          goals: get().goals.map((g) => {
            if (g.id !== id) return g;
            const milestoneDriven = g.kind === "project" && g.milestones.length > 0;
            const current = milestoneDriven ? g.current : Math.max(0, g.current + amount);
            const next: Goal = {
              ...g,
              current,
              checkIns: [
                ...g.checkIns,
                { id: nid(), at: new Date().toISOString(), amount, note: note.trim() },
              ],
            };
            if (!milestoneDriven && current >= effectiveTarget(next) && next.status === "active") {
              next.status = "completed";
            }
            return next;
          }),
        }),
      undoLastCheckIn: (id) =>
        set({
          goals: get().goals.map((g) => {
            if (g.id !== id || g.checkIns.length === 0) return g;
            const last = g.checkIns[g.checkIns.length - 1];
            const milestoneDriven = g.kind === "project" && g.milestones.length > 0;
            const current = milestoneDriven ? g.current : Math.max(0, g.current - last.amount);
            const next: Goal = {
              ...g,
              current,
              checkIns: g.checkIns.slice(0, -1),
            };
            if (!milestoneDriven && g.status === "completed" && current < effectiveTarget(next)) {
              next.status = "active";
            }
            return next;
          }),
        }),
      toggleMilestone: (goalId, milestoneId) =>
        set({
          goals: get().goals.map((g) => {
            if (g.id !== goalId) return g;
            const milestones = g.milestones.map((m) =>
              m.id === milestoneId ? { ...m, done: !m.done } : m,
            );
            return syncProjectCurrent({ ...g, milestones });
          }),
        }),
      addMilestone: (goalId, title) =>
        set({
          goals: get().goals.map((g) => {
            if (g.id !== goalId) return g;
            return syncProjectCurrent({
              ...g,
              milestones: [...g.milestones, { id: nid(), title: title.trim(), done: false }],
            });
          }),
        }),
      removeMilestone: (goalId, milestoneId) =>
        set({
          goals: get().goals.map((g) => {
            if (g.id !== goalId) return g;
            return syncProjectCurrent({
              ...g,
              milestones: g.milestones.filter((m) => m.id !== milestoneId),
            });
          }),
        }),
      setReminder: (goalId, reminder) =>
        set({
          goals: get().goals.map((g) => (g.id === goalId ? { ...g, reminder } : g)),
        }),
      markReminderFired: (goalId, dateKey) =>
        set({
          goals: get().goals.map((g) =>
            g.id === goalId && g.reminder
              ? { ...g, reminder: { ...g.reminder, lastFiredDate: dateKey } }
              : g,
          ),
        }),
      addStroke: (boardId, stroke) =>
        set({
          boards: get().boards.map((b) =>
            b.id === boardId
              ? { ...b, strokes: [...b.strokes, stroke].slice(-400), updatedAt: new Date().toISOString() }
              : b,
          ),
        }),
      setBoardStrokes: (boardId, strokes) =>
        set({
          boards: get().boards.map((b) =>
            b.id === boardId ? { ...b, strokes, updatedAt: new Date().toISOString() } : b,
          ),
        }),
      addSticky: (boardId, sticky) => {
        const id = nid();
        set({
          boards: get().boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  stickies: [...b.stickies, { ...sticky, id }],
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        });
        return id;
      },
      updateSticky: (boardId, stickyId, patch) =>
        set({
          boards: get().boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  stickies: b.stickies.map((s) => (s.id === stickyId ? { ...s, ...patch } : s)),
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        }),
      removeSticky: (boardId, stickyId) =>
        set({
          boards: get().boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  stickies: b.stickies.filter((s) => s.id !== stickyId),
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        }),
      setLastBoard: (id) => set({ lastBoardId: id }),
      createBoard: (title, goalId) => {
        const id = nid();
        set({
          boards: [
            ...get().boards,
            {
              id,
              title: title.trim() || "Untitled",
              goalId,
              strokes: [],
              stickies: [],
              updatedAt: new Date().toISOString(),
            },
          ],
          lastBoardId: id,
        });
        return id;
      },
      renameBoard: (boardId, title) =>
        set({
          boards: get().boards.map((b) =>
            b.id === boardId
              ? { ...b, title: title.trim() || b.title, updatedAt: new Date().toISOString() }
              : b,
          ),
        }),
      clearBoard: (boardId) =>
        set({
          boards: get().boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  strokes: [],
                  stickies: b.id === INBOX_BOARD_ID ? b.stickies : [],
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        }),
      deleteBoard: (boardId) => {
        if (boardId === INBOX_BOARD_ID) return;
        const next = get().boards.filter((b) => b.id !== boardId);
        const repaired = repairBoards(next, get().lastBoardId === boardId ? INBOX_BOARD_ID : get().lastBoardId);
        set({
          boards: repaired.boards,
          lastBoardId: repaired.lastBoardId,
          goals: get().goals.map((g) => (g.boardId === boardId ? { ...g, boardId: INBOX_BOARD_ID } : g)),
        });
      },
      exportSnapshot: () => {
        const { profile, goals, boards, lastBoardId } = get();
        return { v: 2, profile, goals, boards, lastBoardId };
      },
      importSnapshot: (data) => {
        if (!isSnapshot(data)) return false;
        const repaired = repairBoards(data.boards, typeof data.lastBoardId === "string" ? data.lastBoardId : INBOX_BOARD_ID);
        const profile =
          data.profile && typeof data.profile === "object" && typeof (data.profile as { name?: unknown }).name === "string"
            ? { name: (data.profile as { name: string }).name }
            : { name: "" };
        set({
          hasInitialized: true,
          hydrateReady: true,
          profile,
          goals: data.goals,
          boards: repaired.boards,
          lastBoardId: repaired.lastBoardId,
        });
        return true;
      },
    }),
    {
      name: "waymark.v2",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      skipHydration: true,
      partialize: (s) => ({
        hasInitialized: s.hasInitialized,
        profile: s.profile,
        goals: s.goals,
        boards: s.boards,
        lastBoardId: s.lastBoardId,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GoalState>;
        const goals = isGoalArray(p.goals) ? p.goals : current.goals;
        const boards = isBoardArray(p.boards) ? p.boards : current.boards;
        return {
          ...current,
          ...p,
          goals,
          boards,
          lastBoardId: typeof p.lastBoardId === "string" ? p.lastBoardId : current.lastBoardId,
          profile: p.profile ?? current.profile,
          hydrateReady: true,
        };
      },
    },
  ),
);

export function newReminder(): Reminder {
  return emptyReminder();
}

export function defaultDraft(kind: GoalKind = "purchase"): GoalDraft {
  const meta = KIND_META[kind];
  return {
    title: "",
    why: "",
    kind,
    target: meta.defaultTarget,
    unit: meta.defaultUnit,
    deadline: null,
  };
}

export { effectiveTarget };

if (typeof window !== "undefined") {
  void useGoalStore.persist.rehydrate();
}
