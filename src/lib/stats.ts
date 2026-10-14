import { addDays, format, parseISO } from "date-fns";
import type { CheckIn, Goal, Milestone } from "./types";
import { effectiveCurrent, effectiveTarget, todayKey } from "./format";

function checkInKey(iso: string): string {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return todayKey(d);
}

export function checkInDays(checkIns: CheckIn[]): Set<string> {
  return new Set(checkIns.map((c) => checkInKey(c.at)));
}

export function loggedOn(goal: Goal, dateKey: string): boolean {
  return goal.checkIns.some((c) => checkInKey(c.at) === dateKey);
}

export function loggedToday(goal: Goal, now = new Date()): boolean {
  return loggedOn(goal, todayKey(now));
}

export function habitStreak(goal: Goal, now = new Date()): number {
  const days = checkInDays(goal.checkIns);
  if (days.size === 0) return 0;
  const cursor = new Date(now);
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function weekDots(goal: Goal, now = new Date()): { key: string; on: boolean; isToday: boolean }[] {
  const days = checkInDays(goal.checkIns);
  const today = todayKey(now);
  const start = addDays(now, -6);
  return Array.from({ length: 7 }, (_, i) => {
    const key = format(addDays(start, i), "yyyy-MM-dd");
    return { key, on: days.has(key), isToday: key === today };
  });
}

export function remainingOf(goal: Goal): number {
  return Math.max(0, effectiveTarget(goal) - effectiveCurrent(goal));
}

export function daysUntil(deadline: string | null, now = new Date()): number | null {
  if (!deadline) return null;
  const d = parseISO(deadline);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function weeklyNeeded(goal: Goal, now = new Date()): number | null {
  const left = remainingOf(goal);
  if (left <= 0) return 0;
  const days = daysUntil(goal.deadline, now);
  if (days === null) return null;
  const weeks = Math.max(1, days / 7);
  return left / weeks;
}

export function nextMilestone(goal: Goal): Milestone | undefined {
  return goal.milestones.find((m) => !m.done);
}

export function logsInRange(goals: Goal[], startKey: string, endKey: string): number {
  let n = 0;
  for (const g of goals) {
    for (const c of g.checkIns) {
      const k = checkInKey(c.at);
      if (k >= startKey && k <= endKey) n += 1;
    }
  }
  return n;
}
