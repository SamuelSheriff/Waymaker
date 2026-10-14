import { createClient } from "@supabase/supabase-js";
import type { Goal, Board, Profile } from "./types";

export const SUPABASE_URL = "https://whlgohipahpdazdodlwp.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobGdvaGlwYWhwZGF6ZG9kbHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTI3MjMsImV4cCI6MjA5OTI2ODcyM30.-CPYM8nRRsOnE38GZ7HyUO-iPEVCelfey06sXiUv5_I";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Isolated table names to prevent collision with other apps in the same Supabase project
export const TABLES = {
  GOALS: "waymark_goals",
  BOARDS: "waymark_boards",
  PROFILE: "waymark_profile",
} as const;

export async function fetchGoalsFromCloud(): Promise<Goal[] | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.GOALS)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Supabase] Failed to fetch goals:", error.message);
      return null;
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      why: row.why || "",
      kind: row.kind,
      status: row.status,
      target: Number(row.target) || 0,
      current: Number(row.current) || 0,
      unit: row.unit || "",
      deadline: row.deadline || null,
      createdAt: row.created_at || new Date().toISOString(),
      milestones: Array.isArray(row.milestones) ? row.milestones : [],
      checkIns: Array.isArray(row.check_ins) ? row.check_ins : [],
      reminder: row.reminder || null,
      boardId: row.board_id || row.id,
    }));
  } catch (err) {
    console.warn("[Supabase] Fetch goals exception:", err);
    return null;
  }
}

export async function syncGoalToCloud(goal: Goal): Promise<void> {
  try {
    const payload = {
      id: goal.id,
      title: goal.title,
      why: goal.why,
      kind: goal.kind,
      status: goal.status,
      target: goal.target,
      current: goal.current,
      unit: goal.unit,
      deadline: goal.deadline,
      created_at: goal.createdAt,
      milestones: goal.milestones,
      check_ins: goal.checkIns,
      reminder: goal.reminder,
      board_id: goal.boardId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(TABLES.GOALS).upsert(payload);
    if (error) {
      console.warn("[Supabase] Goal upsert warning:", error.message);
    }
  } catch (err) {
    console.warn("[Supabase] Goal sync exception:", err);
  }
}

export async function deleteGoalFromCloud(id: string): Promise<void> {
  try {
    await supabase.from(TABLES.GOALS).delete().eq("id", id);
  } catch (err) {
    console.warn("[Supabase] Goal delete exception:", err);
  }
}

export async function fetchBoardsFromCloud(): Promise<Board[] | null> {
  try {
    const { data, error } = await supabase.from(TABLES.BOARDS).select("*");
    if (error) {
      console.warn("[Supabase] Failed to fetch boards:", error.message);
      return null;
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      goalId: row.goal_id || null,
      strokes: Array.isArray(row.strokes) ? row.strokes : [],
      stickies: Array.isArray(row.stickies) ? row.stickies : [],
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn("[Supabase] Fetch boards exception:", err);
    return null;
  }
}

export async function syncBoardToCloud(board: Board): Promise<void> {
  try {
    const payload = {
      id: board.id,
      title: board.title,
      goal_id: board.goalId,
      strokes: board.strokes,
      stickies: board.stickies,
      updated_at: board.updatedAt || new Date().toISOString(),
    };

    const { error } = await supabase.from(TABLES.BOARDS).upsert(payload);
    if (error) {
      console.warn("[Supabase] Board upsert warning:", error.message);
    }
  } catch (err) {
    console.warn("[Supabase] Board sync exception:", err);
  }
}

export async function deleteBoardFromCloud(id: string): Promise<void> {
  try {
    await supabase.from(TABLES.BOARDS).delete().eq("id", id);
  } catch (err) {
    console.warn("[Supabase] Board delete exception:", err);
  }
}

export async function fetchProfileFromCloud(): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILE)
      .select("name")
      .eq("id", "default_user")
      .maybeSingle();

    if (error || !data) return null;
    return { name: data.name || "" };
  } catch {
    return null;
  }
}

export async function syncProfileToCloud(profile: Profile): Promise<void> {
  try {
    await supabase.from(TABLES.PROFILE).upsert({
      id: "default_user",
      name: profile.name,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[Supabase] Profile sync exception:", err);
  }
}
