import { createClient } from "@supabase/supabase-js";
import type { Goal, Board, Profile, Sticky, BoardConnection } from "./types";
import { nid } from "./utils";

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

const CLIENT_ID_KEY = "waymark_client_uuid";

export function getClientId(): string {
  if (typeof window === "undefined") return "default_client";
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : nid();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export async function fetchGoalsFromCloud(): Promise<Goal[] | null> {
  try {
    const clientId = getClientId();
    // Fetch only this client's goals (or legacy goals without client_id for migration)
    const { data, error } = await supabase
      .from(TABLES.GOALS)
      .select("*")
      .or(`client_id.eq.${clientId},client_id.is.null`)
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
      category: row.category || undefined,
      priority: row.priority || undefined,
      obstacle: row.obstacle || undefined,
      protocol: row.protocol || undefined,
      frequencyPerWeek: row.frequency_per_week ? Number(row.frequency_per_week) : undefined,
      updatedAt: row.updated_at || undefined,
    }));
  } catch (err) {
    console.warn("[Supabase] Fetch goals exception:", err);
    return null;
  }
}

export async function syncGoalsBatch(goals: Goal[]): Promise<void> {
  if (goals.length === 0) return;
  try {
    const clientId = getClientId();
    const payload = goals.map((goal) => ({
      id: goal.id,
      client_id: clientId,
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
      category: goal.category,
      priority: goal.priority,
      obstacle: goal.obstacle,
      protocol: goal.protocol,
      frequency_per_week: goal.frequencyPerWeek,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from(TABLES.GOALS).upsert(payload);
    if (error) {
      console.warn("[Supabase] Goals batch upsert warning:", error.message);
    }
  } catch (err) {
    console.warn("[Supabase] Goals batch sync exception:", err);
  }
}

export async function deleteGoalFromCloud(id: string): Promise<void> {
  try {
    const clientId = getClientId();
    await supabase.from(TABLES.GOALS).delete().match({ id, client_id: clientId });
  } catch (err) {
    console.warn("[Supabase] Goal delete exception:", err);
  }
}

export async function fetchBoardsFromCloud(): Promise<Board[] | null> {
  try {
    const clientId = getClientId();
    const { data, error } = await supabase
      .from(TABLES.BOARDS)
      .select("*")
      .or(`client_id.eq.${clientId},client_id.is.null`);

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
      connections: Array.isArray(row.connections) ? row.connections : [],
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn("[Supabase] Fetch boards exception:", err);
    return null;
  }
}

export async function syncBoardsBatch(boards: Board[]): Promise<void> {
  if (boards.length === 0) return;
  try {
    const clientId = getClientId();
    const payload = boards.map((board) => ({
      id: board.id,
      client_id: clientId,
      title: board.title,
      goal_id: board.goalId,
      strokes: board.strokes,
      stickies: board.stickies,
      connections: board.connections || [],
      updated_at: board.updatedAt || new Date().toISOString(),
    }));

    const { error } = await supabase.from(TABLES.BOARDS).upsert(payload);
    if (error) {
      console.warn("[Supabase] Boards batch upsert warning:", error.message);
    }
  } catch (err) {
    console.warn("[Supabase] Boards batch sync exception:", err);
  }
}

export async function deleteBoardFromCloud(id: string): Promise<void> {
  try {
    const clientId = getClientId();
    await supabase.from(TABLES.BOARDS).delete().match({ id, client_id: clientId });
  } catch (err) {
    console.warn("[Supabase] Board delete exception:", err);
  }
}

export async function fetchProfileFromCloud(): Promise<Profile | null> {
  try {
    const clientId = getClientId();
    const { data, error } = await supabase
      .from(TABLES.PROFILE)
      .select("*")
      .eq("id", clientId)
      .maybeSingle();

    if (error) {
      console.warn("[Supabase] Profile fetch warning:", error.message);
      return null;
    }

    if (!data) return null;
    return {
      name: data.name || "",
      aiApiKey: data.ai_api_key || undefined,
      aiProvider: data.ai_provider || undefined,
    };
  } catch (err) {
    console.warn("[Supabase] Profile fetch exception:", err);
    return null;
  }
}

export async function syncProfileToCloud(profile: Profile): Promise<void> {
  try {
    const clientId = getClientId();
    const payload = {
      id: clientId,
      client_id: clientId,
      name: profile.name,
      ai_api_key: profile.aiApiKey || null,
      ai_provider: profile.aiProvider || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(TABLES.PROFILE).upsert(payload);
    if (error) {
      console.warn("[Supabase] Profile upsert warning:", error.message);
    }
  } catch (err) {
    console.warn("[Supabase] Profile sync exception:", err);
  }
}
