import { Link } from "@tanstack/react-router";
import { Check, ChevronRight } from "lucide-react";
import type { MouseEvent } from "react";
import type { Goal } from "@/lib/types";
import { KIND_META } from "@/lib/types";
import { deadlineCopy, formatAmount, progressLabel, progressOf } from "@/lib/format";
import { habitStreak, loggedToday, nextMilestone, remainingOf } from "@/lib/stats";
import { useGoalStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HabitWeek } from "@/components/habit-week";
import { cn } from "@/lib/utils";

export function GoalCard({
  goal,
  compact = false,
  onLog,
}: {
  goal: Goal;
  compact?: boolean;
  onLog?: (goal: Goal) => void;
}) {
  const logProgress = useGoalStore((s) => s.logProgress);
  const pct = Math.round(progressOf(goal) * 100);
  const due = deadlineCopy(goal.deadline);
  const overdue = due?.includes("overdue");
  const streak = goal.kind === "habit" ? habitStreak(goal) : 0;
  const todayDone = goal.kind === "habit" && loggedToday(goal);
  const next = nextMilestone(goal);
  const remaining = remainingOf(goal);
  const canQuickLog = goal.kind === "habit" || (goal.kind === "purchase" && onLog);

  function quickLog(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (goal.kind === "habit") {
      if (todayDone) return;
      logProgress(goal.id, 1, "");
      return;
    }
    onLog?.(goal);
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card shadow-card transition-[transform,border-color] duration-150 ease-out active:scale-[0.99]",
        goal.status === "completed" && "opacity-80",
        goal.status === "paused" && "opacity-70",
      )}
    >
      <Link to="/goals/$goalId" params={{ goalId: goal.id }} className="block p-4 pr-16">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{KIND_META[goal.kind].label}</Badge>
              {goal.status === "completed" ? <Badge variant="sage">Done</Badge> : null}
              {goal.status === "paused" ? <Badge variant="outline">Paused</Badge> : null}
              {streak > 1 ? <Badge variant="sage">{streak} streak</Badge> : null}
            </div>
            <h3 className="mt-2 font-display text-lg font-medium tracking-tight text-foreground">
              {goal.title}
            </h3>
            {!compact && goal.why ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{goal.why}</p>
            ) : null}
          </div>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="tabular-nums text-foreground">{progressLabel(goal)}</span>
            <span className="tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            {goal.kind === "habit" ? (
              <HabitWeek goal={goal} />
            ) : goal.kind === "purchase" ? (
              <span>{formatAmount(remaining, goal.unit)} to go</span>
            ) : next ? (
              <span className="truncate">Next: {next.title}</span>
            ) : (
              <span>{pct}% there</span>
            )}
            {due ? <span className={overdue ? "text-destructive" : ""}>{due}</span> : <span />}
          </div>
        </div>
      </Link>
      {goal.status === "active" && !compact && canQuickLog ? (
        <div className="absolute top-3 right-3">
          {goal.kind === "habit" ? (
            <Button
              size="icon-sm"
              variant={todayDone ? "secondary" : "default"}
              aria-label={todayDone ? `${goal.title} logged today` : `Log ${goal.title}`}
              onClick={quickLog}
            >
              <Check className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={quickLog} aria-label={`Log ${goal.title}`}>
              Log
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
