import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChartNoAxesColumn, Flag, House, PenLine, Plus, UserRound } from "lucide-react";
import { Toaster } from "sonner";
import { useGoalStore } from "@/lib/store";
import { tickReminders } from "@/lib/reminders";
import { registerServiceWorker } from "@/lib/pwa";
import { initCloudSync } from "@/lib/sync";
import { GoalComposer, SettingsSheet } from "@/components/composer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: House, exact: true },
  { to: "/goals", label: "Marks", icon: Flag, exact: false },
  { to: "/board", label: "Board", icon: PenLine, exact: false },
  { to: "/insights", label: "Pulse", icon: ChartNoAxesColumn, exact: false },
] as const;

const NEW_MARK_EVENT = "waymark:new";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [composer, setComposer] = useState(false);
  const [settings, setSettings] = useState(false);
  const isBoard = pathname.startsWith("/board");

  useLayoutEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    let fallback = 0;

    const finish = () => {
      if (cancelled) return;
      if (fallback) {
        window.clearTimeout(fallback);
        fallback = 0;
      }
      useGoalStore.getState().ensureSeeded();
      tickReminders();
    };

    if (useGoalStore.persist.hasHydrated()) {
      finish();
    } else {
      unsub = useGoalStore.persist.onFinishHydration(finish);
      fallback = window.setTimeout(finish, 400);
    }

    return () => {
      cancelled = true;
      unsub?.();
      if (fallback) window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    registerServiceWorker();
    void initCloudSync();
  }, []);

  useEffect(() => {
    const t = window.setInterval(tickReminders, 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onNew = () => setComposer(true);
    window.addEventListener(NEW_MARK_EVENT, onNew);
    return () => window.removeEventListener(NEW_MARK_EVENT, onNew);
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          className: "font-sans",
          style: {
            background: "var(--color-popover)",
            color: "var(--color-popover-foreground)",
            border: "1px solid var(--color-border)",
          },
        }}
      />
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col md:max-w-none md:flex-row">
        <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-border md:pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div className="px-5 pb-6">
            <Link to="/" className="font-display text-2xl tracking-tight italic">
              Waymark
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">Mark the path. Walk it.</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-2 p-3 pb-6">
            <Button className="w-full" onClick={() => setComposer(true)}>
              <Plus className="size-4" />
              New mark
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => setSettings(true)}>
              <UserRound className="size-4" />
              You
            </Button>
          </div>
        </aside>

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          {!isBoard ? (
            <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 md:hidden">
              <Link to="/" className="font-display text-xl tracking-tight italic">
                Waymark
              </Link>
              <div className="flex items-center gap-1">
                <Button size="icon-sm" variant="ghost" aria-label="You" onClick={() => setSettings(true)}>
                  <UserRound className="size-4" />
                </Button>
                <Button size="sm" onClick={() => setComposer(true)}>
                  <Plus className="size-3.5" />
                  New
                </Button>
              </div>
            </header>
          ) : null}

          <main
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              isBoard ? "pb-0" : "px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10 md:pt-8",
            )}
          >
            {children}
          </main>
        </div>
      </div>

      {!isBoard ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
          <div className="mx-auto flex max-w-3xl items-stretch pb-[env(safe-area-inset-bottom)]">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      <GoalComposer open={composer} onOpenChange={setComposer} />
      <SettingsSheet open={settings} onOpenChange={setSettings} />
    </div>
  );
}
