import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Check, Pause, PenLine, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGoalStore } from "@/lib/store";
import { deadlineCopy, formatAmount, formatDay, progressLabel, progressOf } from "@/lib/format";
import { KIND_META } from "@/lib/types";
import { daysUntil, habitStreak, remainingOf, weeklyNeeded } from "@/lib/stats";
import { ProgressRing } from "@/components/progress-ring";
import { HabitWeek } from "@/components/habit-week";
import { EditGoalSheet, LogProgressSheet, ReminderSheet } from "@/components/composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/goals/$goalId")({ component: GoalDetail });

function GoalDetail() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  const goal = useGoalStore((s) => s.goals.find((g) => g.id === goalId));
  const toggleMilestone = useGoalStore((s) => s.toggleMilestone);
  const addMilestone = useGoalStore((s) => s.addMilestone);
  const removeMilestone = useGoalStore((s) => s.removeMilestone);
  const setStatus = useGoalStore((s) => s.setStatus);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const undoLastCheckIn = useGoalStore((s) => s.undoLastCheckIn);
  const [logOpen, setLogOpen] = useState(false);
  const [remOpen, setRemOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [step, setStep] = useState("");

  if (!goal) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="font-display text-2xl italic">That mark is gone</p>
        <Button asChild className="mt-4" variant="secondary">
          <Link to="/goals">Back to marks</Link>
        </Button>
      </div>
    );
  }

  const pct = Math.round(progressOf(goal) * 100);
  const due = deadlineCopy(goal.deadline);
  const history = [...goal.checkIns].reverse();
  const streak = goal.kind === "habit" ? habitStreak(goal) : 0;
  const remaining = remainingOf(goal);
  const weekly = weeklyNeeded(goal);
  const days = daysUntil(goal.deadline);
  const showLog = goal.kind !== "project";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pt-1">
      <div className="flex items-center gap-2">
        <Button asChild size="icon-sm" variant="ghost" aria-label="Back">
          <Link to="/goals">
            <ArrowLeft />
          </Link>
        </Button>
        <span className="flex-1 text-xs text-muted-foreground">Mark</span>
        <Button size="icon-sm" variant="ghost" aria-label="Edit mark" onClick={() => setEditOpen(true)}>
          <Pencil />
        </Button>
      </div>

      <header className="flex items-start gap-5">
        <ProgressRing value={progressOf(goal)} size={96} stroke={7}>
          <span className="font-display text-xl tabular-nums">{pct}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge>{KIND_META[goal.kind].label}</Badge>
            {goal.status === "completed" ? <Badge variant="sage">Done</Badge> : null}
            {goal.status === "paused" ? <Badge variant="outline">Paused</Badge> : null}
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">{goal.title}</h1>
          {due ? (
            <p className={cn("mt-1 text-sm", due.includes("overdue") ? "text-destructive" : "text-muted-foreground")}>
              {due}
            </p>
          ) : null}
        </div>
      </header>

      {goal.why ? <p className="text-sm leading-relaxed text-muted-foreground">{goal.why}</p> : null}

      <div>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="tabular-nums">{progressLabel(goal)}</span>
          <span className="tabular-nums text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} />
      </div>

      {goal.kind === "habit" ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-display text-lg tabular-nums">{streak}</span>
              <span className="ml-2 text-muted-foreground">day streak</span>
            </p>
            <HabitWeek goal={goal} />
          </div>
        </div>
      ) : null}

      {goal.kind === "purchase" && remaining > 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm">
            <span className="font-display text-lg tabular-nums">{formatAmount(remaining, goal.unit)}</span>
            <span className="ml-2 text-muted-foreground">to go</span>
          </p>
          {weekly !== null && days !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {days > 0
                ? `${formatAmount(Math.ceil(weekly), goal.unit)} a week for the next ${days} days`
                : "Past the date you set. Keep going, or edit the deadline."}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Set a deadline to see a weekly pace.</p>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {showLog ? <Button onClick={() => setLogOpen(true)}>Log progress</Button> : null}
        <Button asChild variant={showLog ? "secondary" : "default"}>
          <Link to="/board" search={{ goal: goal.id }}>
            <PenLine className="size-4" />
            Board
          </Link>
        </Button>
        <Button variant="outline" onClick={() => setRemOpen(true)}>
          <Bell className="size-4" />
          {goal.reminder?.enabled ? `${goal.reminder.time}` : "Reminder"}
        </Button>
        {goal.status === "completed" ? (
          <Button variant="outline" onClick={() => setStatus(goal.id, "active")}>
            Reopen
          </Button>
        ) : goal.status === "paused" ? (
          <Button variant="outline" onClick={() => setStatus(goal.id, "active")}>
            <Play className="size-4" />
            Resume
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setStatus(goal.id, "completed")}>
            <Check className="size-4" />
            Complete
          </Button>
        )}
      </div>

      {goal.status === "active" ? (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => {
            setStatus(goal.id, "paused");
            toast("Paused");
          }}
        >
          <Pause className="size-4" />
          Pause this mark
        </Button>
      ) : null}

      <section>
        <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Plan</h2>
        {goal.milestones.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">Break it into steps if the whole thing feels heavy.</p>
        ) : null}
        <ul className="space-y-2">
          {goal.milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleMilestone(goal.id, m.id)}
                className={cn(
                  "flex min-h-11 flex-1 items-center gap-3 rounded-md border px-3 text-left text-sm transition-colors duration-150",
                  m.done ? "border-border bg-secondary text-muted-foreground" : "border-border bg-card",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    m.done ? "border-sage bg-sage text-sage-foreground" : "border-border",
                  )}
                >
                  {m.done ? <Check className="size-3" /> : null}
                </span>
                <span className={cn(m.done && "line-through")}>{m.title}</span>
              </button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Remove step"
                onClick={() => removeMilestone(goal.id, m.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!step.trim()) return;
            addMilestone(goal.id, step);
            setStep("");
          }}
        >
          <Input
            value={step}
            onChange={(e) => setStep(e.target.value)}
            placeholder="Add a step"
            aria-label="Add a step"
          />
          <Button type="submit" size="icon" variant="secondary" aria-label="Add step">
            <Plus />
          </Button>
        </form>
      </section>

      <Separator />

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">History</h2>
          {history.length > 0 ? (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                undoLastCheckIn(goal.id);
                toast("Last log undone");
              }}
            >
              Undo last
            </button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logs yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.slice(0, 12).map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{formatDay(c.at)}</span>
                <span className="min-w-0 flex-1 truncate">{c.note || "Logged"}</span>
                <span className="tabular-nums text-foreground">
                  {c.amount > 0 ? "+" : ""}
                  {formatAmount(c.amount, goal.unit)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pt-4 pb-8">
        <Button variant="ghost" className="text-destructive" onClick={() => setConfirm(true)}>
          <Trash2 className="size-4" />
          Delete mark
        </Button>
      </div>

      <LogProgressSheet goal={goal} open={logOpen} onOpenChange={setLogOpen} />
      <ReminderSheet goal={goal} open={remOpen} onOpenChange={setRemOpen} />
      <EditGoalSheet goal={goal} open={editOpen} onOpenChange={setEditOpen} />
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this mark?</AlertDialogTitle>
            <AlertDialogDescription>
              Logs, steps, and its board go with it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                deleteGoal(goal.id);
                void navigate({ to: "/goals" });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
