import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Pause,
  PenLine,
  Pencil,
  Play,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useGoalStore } from "@/lib/store";
import { deadlineCopy, formatAmount, formatDay, progressLabel, progressOf } from "@/lib/format";
import { KIND_META } from "@/lib/types";
import { daysUntil, habitStreak, remainingOf, weeklyNeeded } from "@/lib/stats";
import { populateGoalBoard } from "@/lib/intelligence";
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
  const reorderMilestones = useGoalStore((s) => s.reorderMilestones);
  const setStatus = useGoalStore((s) => s.setStatus);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const undoLastCheckIn = useGoalStore((s) => s.undoLastCheckIn);
  const populateBoardWithPlan = useGoalStore((s) => s.populateBoardWithPlan);

  const [logOpen, setLogOpen] = useState(false);
  const [remOpen, setRemOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [step, setStep] = useState("");
  const [stepNotes, setStepNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);

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

  function handleMapToBoard() {
    if (!goal) return;
    const { stickies, connections } = populateGoalBoard(goal);
    populateBoardWithPlan(goal.boardId, stickies, connections);
    toast("Mapped goal, milestones & guardrails onto your visual board!");
    void navigate({ to: "/board", search: { goal: goal.id } });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pt-1">
      {/* Top Header */}
      <div className="flex items-center gap-2">
        <Button asChild size="icon-sm" variant="ghost" aria-label="Back">
          <Link to="/goals">
            <ArrowLeft />
          </Link>
        </Button>
        <span className="flex-1 text-xs text-muted-foreground uppercase tracking-wider">Mark Overview</span>
        <Button size="icon-sm" variant="ghost" aria-label="Edit mark" onClick={() => setEditOpen(true)}>
          <Pencil />
        </Button>
      </div>

      <header className="flex items-start gap-5">
        <ProgressRing value={progressOf(goal)} size={96} stroke={7}>
          <span className="font-display text-xl tabular-nums">{pct}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge>{KIND_META[goal.kind].label}</Badge>
            {goal.category && <Badge variant="outline">{goal.category}</Badge>}
            {goal.priority && (
              <Badge
                variant={goal.priority === "core" ? "default" : "outline"}
                className="capitalize"
              >
                {goal.priority}
              </Badge>
            )}
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

      {/* The Deep Why */}
      {goal.why ? (
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            The Deep Why
          </p>
          <p className="text-sm leading-relaxed text-foreground italic">"{goal.why}"</p>
        </div>
      ) : null}

      {/* Progress Bar */}
      <div>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="tabular-nums">{progressLabel(goal)}</span>
          <span className="tabular-nums text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} />
      </div>

      {/* Habit Metrics */}
      {goal.kind === "habit" ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm">
                <span className="font-display text-lg tabular-nums">{streak}</span>
                <span className="ml-2 text-muted-foreground">day streak</span>
              </p>
              {goal.frequencyPerWeek && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {goal.frequencyPerWeek} days / week
                </p>
              )}
            </div>
            <HabitWeek goal={goal} />
          </div>
        </div>
      ) : null}

      {/* Purchase Metrics */}
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

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {showLog ? <Button onClick={() => setLogOpen(true)}>Log Progress</Button> : null}
        <Button asChild variant={showLog ? "secondary" : "default"}>
          <Link to="/board" search={{ goal: goal.id }}>
            <PenLine className="size-4" />
            Visual Board
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

      {/* 1-Click Visual Board Generation Card */}
      <div className="rounded-xl border border-sage/40 bg-secondary/30 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sage">
            <Sparkles className="size-4" />
            <span>Visual Concept Mapping</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Map this goal, its milestones, and psychological strategies into connected nodes on your visual board.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleMapToBoard} className="shrink-0 gap-1.5 text-xs">
          <span>Map to Board</span>
        </Button>
      </div>

      {/* Psychological Guardrails Card */}
      {(goal.obstacle || goal.protocol) && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Zap className="size-3.5 text-amber-500" />
            <span>Psychological Guardrails</span>
          </div>
          {goal.obstacle && (
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">Anticipated Friction: </span>
              <span className="text-foreground">{goal.obstacle}</span>
            </div>
          )}
          {goal.protocol && (
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">If-Then Strategy: </span>
              <span className="text-foreground font-mono bg-secondary/50 px-1 py-0.5 rounded">
                {goal.protocol}
              </span>
            </div>
          )}
        </section>
      )}

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

      {/* Milestones Plan Section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Milestones & Steps ({goal.milestones.filter((m) => m.done).length}/{goal.milestones.length})
          </h2>
        </div>

        {goal.milestones.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Break it into steps to clarify your trajectory.
          </p>
        ) : null}

        <ul className="space-y-2">
          {goal.milestones.map((m, idx) => (
            <li key={m.id} className="flex flex-col gap-1 rounded-md border border-border bg-card p-2">
              <div className="flex items-center gap-2">
                {/* Reorder Buttons */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => reorderMilestones(goal.id, idx, idx - 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                    title="Move step up"
                  >
                    <ChevronUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === goal.milestones.length - 1}
                    onClick={() => reorderMilestones(goal.id, idx, idx + 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                    title="Move step down"
                  >
                    <ChevronDown className="size-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => toggleMilestone(goal.id, m.id)}
                  className="flex flex-1 items-center gap-3 text-left text-sm"
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      m.done ? "border-sage bg-sage text-sage-foreground" : "border-border",
                    )}
                  >
                    {m.done ? <Check className="size-3" /> : null}
                  </span>
                  <span className={cn(m.done && "line-through text-muted-foreground")}>{m.title}</span>
                </button>

                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remove step"
                  onClick={() => removeMilestone(goal.id, m.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {m.notes && <p className="pl-9 text-xs text-muted-foreground">{m.notes}</p>}
            </li>
          ))}
        </ul>

        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!step.trim()) return;
            addMilestone(goal.id, step, stepNotes.trim() || undefined);
            setStep("");
            setStepNotes("");
            setShowNotesInput(false);
          }}
        >
          <div className="flex gap-2">
            <Input
              value={step}
              onChange={(e) => setStep(e.target.value)}
              placeholder="Add next actionable step"
              aria-label="Add a step"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNotesInput(!showNotesInput)}
              title="Add notes"
            >
              Note
            </Button>
            <Button type="submit" size="icon" variant="secondary" aria-label="Add step">
              <Plus />
            </Button>
          </div>
          {showNotesInput && (
            <Input
              value={stepNotes}
              onChange={(e) => setStepNotes(e.target.value)}
              placeholder="Optional notes or details for this step"
              className="text-xs"
            />
          )}
        </form>
      </section>

      <Separator />

      {/* History & Reflections */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Check-In History & Reflections
          </h2>
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
              <li key={c.id} className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-card p-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{formatDay(c.at)}</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {c.amount > 0 ? "+" : ""}
                    {formatAmount(c.amount, goal.unit)}
                  </span>
                </div>
                {c.note && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{c.note}"</p>
                )}
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
