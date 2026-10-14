import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO, subDays } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGoalStore } from "@/lib/store";
import { formatAmount, progressOf, todayKey } from "@/lib/format";
import { habitStreak, logsInRange } from "@/lib/stats";
import { KIND_META, type GoalKind } from "@/lib/types";
import { ProgressRing } from "@/components/progress-ring";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/insights")({ component: InsightsPage });

function localKey(iso: string): string {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return todayKey(d);
}

function InsightsPage() {
  const goals = useGoalStore((s) => s.goals);
  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "completed");
  const overall = goals.length ? goals.reduce((a, g) => a + progressOf(g), 0) / goals.length : 0;

  const byKind = (Object.keys(KIND_META) as GoalKind[]).map((k) => {
    const list = goals.filter((g) => g.kind === k);
    const avg = list.length ? list.reduce((a, g) => a + progressOf(g), 0) / list.length : 0;
    return { kind: k, label: KIND_META[k].label, count: list.length, avg };
  });

  const series = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const key = format(d, "yyyy-MM-dd");
      let logs = 0;
      for (const g of goals) {
        for (const c of g.checkIns) {
          if (localKey(c.at) === key) logs += 1;
        }
      }
      return { day: format(d, "d"), key, logs };
    });
    return days;
  }, [goals]);

  const totalLogs = goals.reduce((a, g) => a + g.checkIns.length, 0);
  const weekStart = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const weekLogs = logsInRange(goals, weekStart, todayKey());
  const bestStreak = goals
    .filter((g) => g.kind === "habit" && g.status === "active")
    .reduce((best, g) => Math.max(best, habitStreak(g)), 0);

  const purchases = goals.filter((g) => g.kind === "purchase");
  const savedByUnit = new Map<string, { saved: number; count: number }>();
  for (const g of purchases) {
    const unit = g.unit || "USD";
    const row = savedByUnit.get(unit) ?? { saved: 0, count: 0 };
    row.saved += g.current;
    row.count += 1;
    savedByUnit.set(unit, row);
  }
  const savedRows = [...savedByUnit.entries()].filter(([, row]) => row.saved > 0);
  const purchaseCount = active.filter((g) => g.kind === "purchase").length || purchases.length;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pt-2">
      <header>
        <h1 className="font-display text-3xl font-medium tracking-tight italic">Pulse</h1>
        <p className="mt-1 text-sm text-muted-foreground">How the path looks from above.</p>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="On course" value={`${Math.round(overall * 100)}%`} />
        <Stat label="This week" value={String(weekLogs)} />
        <Stat label="Streak" value={String(bestStreak)} />
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Check-ins · 14 days
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {totalLogs} all time · {done.length} finished
          </span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  color: "var(--color-foreground)",
                  fontSize: 12,
                }}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as { key?: string } | undefined;
                  return row?.key ?? "";
                }}
              />
              <Area
                type="monotone"
                dataKey="logs"
                stroke="var(--color-sage)"
                fill="var(--color-sage)"
                fillOpacity={0.18}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {savedRows.length > 0 ? (
        <section className="rounded-xl border border-border bg-card px-4 py-4 shadow-card">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Saved toward things</p>
          <ul className="mt-1 space-y-1">
            {savedRows.map(([unit, row]) => (
              <li key={unit} className="font-display text-2xl tabular-nums">
                {formatAmount(row.saved, unit)}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm text-muted-foreground">
            Across {purchaseCount} {purchaseCount === 1 ? "purchase" : "purchases"}.
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">By kind</h2>
        <ul className="space-y-4">
          {byKind.map((row) => (
            <li key={row.kind}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span>{row.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.count} · {Math.round(row.avg * 100)}%
                </span>
              </div>
              <Progress value={Math.round(row.avg * 100)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">Each mark</h2>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No marks yet.</p>
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => {
              const pct = Math.round(progressOf(g) * 100);
              return (
                <li key={g.id} className="flex items-center gap-3">
                  <ProgressRing value={progressOf(g)} size={36} stroke={3} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{g.title}</p>
                    <p className="text-xs text-muted-foreground">{KIND_META[g.kind].label}</p>
                  </div>
                  <span className="tabular-nums text-sm text-muted-foreground">{pct}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-4 text-center shadow-card">
      <p className="font-display text-2xl tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
