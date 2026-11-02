import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Bell, Check, ChevronRight, PenLine, Sparkles, Zap } from "lucide-react";
import { useGoalStore } from "@/lib/store";
import { greetingFor, progressOf } from "@/lib/format";
import { KIND_META } from "@/lib/types";
import { loggedToday, nextMilestone } from "@/lib/stats";
import { calculateMomentum } from "@/lib/intelligence";
import { GoalCard } from "@/components/goal-card";
import { ProgressRing } from "@/components/progress-ring";
import { LogProgressSheet } from "@/components/composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Goal } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const goals = useGoalStore((s) => s.goals);
  const name = useGoalStore((s) => s.profile.name);
  const setName = useGoalStore((s) => s.setName);
  const logProgress = useGoalStore((s) => s.logProgress);
  const toggleMilestone = useGoalStore((s) => s.toggleMilestone);
  const [logGoal, setLogGoal] = useState<Goal | null>(null);

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "completed");
  const overall = useMemo(() => {
    if (goals.length === 0) return 0;
    const sum = goals.reduce((a, g) => a + progressOf(g), 0);
    return sum / goals.length;
  }, [goals]);

  const dueToday = active.filter((g) => {
    const r = g.reminder;
    if (!r?.enabled) return false;
    return r.days.includes(new Date().getDay());
  });

  const todayHabits = active.filter((g) => g.kind === "habit");
  const nextSteps = active.flatMap((g) => {
    if (g.kind !== "project") return [];
    const step = nextMilestone(g);
    return step ? [{ goal: g, step }] : [];
  });

  const momentum = useMemo(() => calculateMomentum(goals), [goals]);

  const greet = greetingFor();
  const hello = name.trim() ? `${greet}, ${name.trim()}` : greet;

  return (
    <div className="stagger-in mx-auto w-full max-w-2xl space-y-6 pt-2">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {format(new Date(), "EEEE d MMMM")}
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight italic">{hello}</h1>
        {!name.trim() ? (
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="What should we call you?"
              aria-label="Your name"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") setName((e.target as HTMLInputElement).value);
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) setName(e.target.value);
              }}
            />
          </div>
        ) : null}
      </header>

      {/* Progress & Momentum Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* On Course Average */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <ProgressRing value={overall} size={76} stroke={6}>
            <span className="font-display text-base tabular-nums">{Math.round(overall * 100)}%</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">On Course</p>
            <p className="mt-0.5 font-display text-lg font-medium tracking-tight">
              {active.length} active · {done.length} complete
            </p>
            <p className="text-xs text-muted-foreground">Overall life alignment</p>
          </div>
        </div>

        {/* Intelligent Momentum Score */}
        <div className="rounded-xl border border-sage/40 bg-secondary/30 p-4 shadow-card flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-sage/20 border border-sage/40 text-sage font-display text-lg tabular-nums">
            {momentum.score}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-sage" />
              <p className="text-xs font-semibold tracking-wide text-sage uppercase">
                {momentum.level}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {momentum.summary}
            </p>
          </div>
        </div>
      </section>

      {/* Intelligent Nudge Banner */}
      {momentum.recommendations.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-card/60 p-3 text-xs">
          <Zap className="size-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-foreground">Intelligent Focus Nudge: </span>
            <span className="text-muted-foreground">{momentum.recommendations[0]}</span>
          </div>
        </div>
      )}

      {/* Today Section */}
      {todayHabits.length > 0 || dueToday.length > 0 || nextSteps.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Today</h2>
          <ul className="space-y-2">
            {todayHabits.map((g) => {
              const doneToday = loggedToday(g);
              return (
                <li
                  key={`h-${g.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{g.title}</p>
                      {g.category && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {g.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {doneToday ? "Logged today" : "Not yet today"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={doneToday ? "secondary" : "default"}
                    onClick={() => !doneToday && logProgress(g.id, 1, "")}
                    aria-label={doneToday ? `${g.title} logged` : `Check in ${g.title}`}
                    disabled={doneToday}
                  >
                    <Check className="size-3.5" />
                    {doneToday ? "Done" : "Log"}
                  </Button>
                </li>
              );
            })}
            {dueToday
              .filter((g) => g.kind !== "habit")
              .map((g) => (
                <li
                  key={`d-${g.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <Bell className="size-4 shrink-0 text-sage" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.title}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{g.reminder?.time}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setLogGoal(g)}>
                    Log
                  </Button>
                </li>
              ))}
            {nextSteps.map(({ goal: g, step }) => (
              <li
                key={`s-${step.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">Next for {g.title}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleMilestone(g.id, step.id)}
                  aria-label={`Mark ${step.title} complete`}
                >
                  <Check className="size-3.5" />
                  Done
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Visual Planning Quick Access */}
      <section className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-ink border border-border">
            <PenLine className="size-5 text-sage" />
          </div>
          <div>
            <p className="text-sm font-medium">Visual Planning Board</p>
            <p className="text-xs text-muted-foreground">
              Connect shapes, sticky notes, and handwritten sketches.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1 text-xs">
          <Link to="/board" search={{}}>
            <span>Open Board</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </section>

      {/* Active Marks List */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Marks</h2>
          <Link to="/goals" className="text-xs text-muted-foreground hover:text-foreground">
            All marks
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No marks active. Tap the plus below to begin.
          </div>
        ) : (
          <ul className="space-y-3">
            {active.map((g) => (
              <li key={g.id}>
                <GoalCard goal={g} onLog={() => setLogGoal(g)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <LogProgressSheet goal={logGoal} open={Boolean(logGoal)} onOpenChange={(v) => !v && setLogGoal(null)} />
    </div>
  );
}
