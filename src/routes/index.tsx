import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Bell, Check } from "lucide-react";
import { useGoalStore } from "@/lib/store";
import { greetingFor, progressOf } from "@/lib/format";
import { KIND_META } from "@/lib/types";
import { loggedToday, nextMilestone } from "@/lib/stats";
import { GoalCard } from "@/components/goal-card";
import { ProgressRing } from "@/components/progress-ring";
import { LogProgressSheet } from "@/components/composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-5">
          <ProgressRing value={overall} size={88} stroke={7}>
            <span className="font-display text-lg tabular-nums">{Math.round(overall * 100)}</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">On course</p>
            <p className="mt-1 font-display text-xl font-medium tracking-tight">
              {active.length} active · {done.length} complete
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Average across every mark you are holding.</p>
          </div>
        </div>
      </section>

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
                    <p className="truncate text-sm font-medium">{g.title}</p>
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
                  {g.kind === "project" ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/goals/$goalId" params={{ goalId: g.id }}>
                        Open
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setLogGoal(g)}>
                      Log
                    </Button>
                  )}
                </li>
              ))}
            {nextSteps.slice(0, 2).map(({ goal, step }) => (
              <li
                key={`s-${goal.id}-${step.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{goal.title}</p>
                  <p className="truncate text-xs text-muted-foreground">Next: {step.title}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toggleMilestone(goal.id, step.id)}
                  aria-label={`Complete ${step.title}`}
                >
                  <Check className="size-3.5" />
                  Done
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Active marks</h2>
          <Link to="/goals" className="text-xs text-muted-foreground hover:text-foreground">
            All
          </Link>
        </div>
        {active.length === 0 ? (
          <EmptyMarks />
        ) : (
          <div className="space-y-3">
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} onLog={setLogGoal} />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Complete</h2>
          <div className="space-y-3">
            {done.map((g) => (
              <GoalCard key={g.id} goal={g} compact />
            ))}
          </div>
        </section>
      ) : null}

      <p className="pb-4 text-center text-xs text-muted-foreground">
        On Android, open the browser menu and tap Add to Home screen to keep Waymark with your other apps.
      </p>

      <LogProgressSheet goal={logGoal} open={Boolean(logGoal)} onOpenChange={(v) => !v && setLogGoal(null)} />
    </div>
  );
}

function EmptyMarks() {
  return (
    <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
      <p className="font-display text-xl italic">No marks yet</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Set a purchase, a habit, or a project. The board is there when you need to think on paper.
      </p>
      <Button
        className="mt-5"
        onClick={() => window.dispatchEvent(new Event("waymark:new"))}
      >
        New mark
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">
        {KIND_META.purchase.label} · {KIND_META.habit.label} · {KIND_META.project.label}
      </p>
    </div>
  );
}
