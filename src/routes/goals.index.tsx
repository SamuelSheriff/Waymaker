import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useGoalStore } from "@/lib/store";
import { GoalCard } from "@/components/goal-card";
import { LogProgressSheet } from "@/components/composer";
import { Input } from "@/components/ui/input";
import type { Goal, GoalKind, GoalStatus } from "@/lib/types";
import { KIND_META } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/goals/")({ component: GoalsPage });

type Filter = "all" | GoalKind | GoalStatus;

function GoalsPage() {
  const goals = useGoalStore((s) => s.goals);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [logGoal, setLogGoal] = useState<Goal | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return goals.filter((g) => {
      if (filter === "completed") {
        if (g.status !== "completed") return false;
      } else if (filter === "paused") {
        if (g.status !== "paused") return false;
      } else if (filter === "active") {
        if (g.status !== "active") return false;
      } else if (filter === "purchase" || filter === "habit" || filter === "project") {
        if (g.kind !== filter) return false;
      }
      if (!query) return true;
      return `${g.title} ${g.why}`.toLowerCase().includes(query);
    });
  }, [goals, q, filter]);

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "purchase", label: KIND_META.purchase.label },
    { id: "habit", label: KIND_META.habit.label },
    { id: "project", label: KIND_META.project.label },
    { id: "paused", label: "Paused" },
    { id: "completed", label: "Done" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pt-2">
      <header>
        <h1 className="font-display text-3xl font-medium tracking-tight italic">Marks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything you are walking toward.</p>
      </header>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search marks"
        aria-label="Search marks"
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={cn(
              "h-11 shrink-0 rounded-full px-3 text-xs font-medium transition-colors duration-150",
              filter === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nothing matches.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => (
            <GoalCard key={g.id} goal={g} onLog={setLogGoal} />
          ))}
        </div>
      )}
      <LogProgressSheet goal={logGoal} open={Boolean(logGoal)} onOpenChange={(v) => !v && setLogGoal(null)} />
    </div>
  );
}
