import { toast } from "sonner";
import { hhmmOf, todayKey, weekdayOf } from "./format";
import { useGoalStore } from "./store";

export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
}

export async function sendNotification(
  title: string,
  options?: NotificationOptions,
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // 1. Mobile Chrome & iOS standalone PWA require service worker showNotification
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, options);
        return;
      }
    } catch {
      // Fallback to Notification constructor below
    }
  }

  // 2. Desktop browser fallback
  try {
    new Notification(title, options);
  } catch {
    /* Ignored: thrown by mobile browsers that forbid window Notification constructor */
  }
}

export function tickReminders(): void {
  if (typeof window === "undefined") return;
  const { goals, markReminderFired } = useGoalStore.getState();
  const now = new Date();
  const today = todayKey(now);
  const day = weekdayOf(now);
  const hhmm = hhmmOf(now);
  const nowMin = minutesOf(hhmm);

  for (const goal of goals) {
    if (goal.status !== "active") continue;
    const r = goal.reminder;
    if (!r?.enabled) continue;
    if (r.lastFiredDate === today) continue;
    if (!r.days.includes(day)) continue;
    const remMin = minutesOf(r.time);
    if (nowMin < remMin) continue;
    // Missed by more than 90 minutes — mark quiet, don't toast hours later.
    if (nowMin - remMin > 90) {
      markReminderFired(goal.id, today);
      continue;
    }

    const body = r.message.trim() || goal.title;
    markReminderFired(goal.id, today);

    if ("Notification" in window && Notification.permission === "granted") {
      void sendNotification("Waymark", {
        body,
        tag: `waymark-${goal.id}`,
        icon: "/icon-192.png",
        badge: "/favicon.svg",
      });
    }
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(40);
    }
    toast(goal.title, { description: body });
  }
}

