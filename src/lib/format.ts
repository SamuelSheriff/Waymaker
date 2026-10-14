import { formatDistanceToNowStrict, format, isToday, isPast, parseISO } from "date-fns";
import type { Goal } from "./types";

export function formatAmount(n: number, unit: string): string {
  if (unit === "USD" || unit === "$") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  }
  if (unit === "%") return `${Math.round(n)}%`;
  if (n === 1 && unit.endsWith("s")) return `1 ${unit.slice(0, -1)}`;
  return `${n} ${unit}`;
}

export function effectiveCurrent(goal: Goal): number {
  if (goal.kind === "project" && goal.milestones.length > 0) {
    return goal.milestones.filter((m) => m.done).length;
  }
  return goal.current;
}

export function effectiveTarget(goal: Goal): number {
  if (goal.kind === "project" && goal.milestones.length > 0) {
    return goal.milestones.length;
  }
  return Math.max(1, goal.target);
}

export function progressOf(goal: Goal): number {
  return Math.min(1, Math.max(0, effectiveCurrent(goal) / effectiveTarget(goal)));
}

export function progressLabel(goal: Goal): string {
  return `${formatAmount(effectiveCurrent(goal), goal.unit)} of ${formatAmount(effectiveTarget(goal), goal.unit)}`;
}

export function deadlineCopy(deadline: string | null): string | null {
  if (!deadline) return null;
  const d = parseISO(deadline);
  if (Number.isNaN(d.getTime())) return null;
  if (isToday(d)) return "Due today";
  const dist = formatDistanceToNowStrict(d, { roundingMethod: "floor" });
  if (isPast(d)) return `${dist} overdue`;
  return `${dist} left`;
}

export function formatDay(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  return format(d, "d MMM");
}

export function greetingFor(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function todayKey(now = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

export function weekdayOf(now = new Date()): number {
  return now.getDay();
}

export function hhmmOf(now = new Date()): string {
  return format(now, "HH:mm");
}
