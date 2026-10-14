import { cn } from "@/lib/utils";
import { weekDots } from "@/lib/stats";
import type { Goal } from "@/lib/types";

export function HabitWeek({ goal, className }: { goal: Goal; className?: string }) {
  const dots = weekDots(goal);
  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-hidden>
      {dots.map((d) => (
        <span
          key={d.key}
          className={cn(
            "size-2 rounded-full",
            d.on ? "bg-sage" : "bg-track",
            d.isToday && "ring-1 ring-primary ring-offset-1 ring-offset-card",
          )}
        />
      ))}
    </div>
  );
}
