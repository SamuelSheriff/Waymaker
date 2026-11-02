import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, Sparkles } from "lucide-react";
import type { Goal, GoalKind, Reminder } from "@/lib/types";
import { GOAL_CATEGORIES, KIND_META, WEEKDAYS } from "@/lib/types";
import { defaultDraft, newReminder, useGoalStore, type GoalDraft } from "@/lib/store";
import { ensureNotifyPermission, sendNotification } from "@/lib/reminders";
import { generateIntelligentPlan } from "@/lib/intelligence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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

function KindPills({
  value,
  onChange,
}: {
  value: GoalKind;
  onChange: (k: GoalKind) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(Object.keys(KIND_META) as GoalKind[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "h-16 rounded-md border px-2 text-center transition-colors duration-150",
            value === k
              ? "border-primary bg-secondary text-foreground"
              : "border-border bg-transparent text-muted-foreground",
          )}
        >
          <div className="text-sm font-medium text-foreground">{KIND_META[k].label}</div>
          <div className="mt-0.5 text-xs leading-tight">{KIND_META[k].hint}</div>
        </button>
      ))}
    </div>
  );
}

function DraftFields({
  draft,
  setDraft,
  lockKind,
}: {
  draft: GoalDraft;
  setDraft: (fn: (d: GoalDraft) => GoalDraft) => void;
  lockKind?: boolean;
}) {
  function setKind(kind: GoalKind) {
    const meta = KIND_META[kind];
    setDraft((d) => ({
      ...d,
      kind,
      unit: meta.defaultUnit,
      target: meta.defaultTarget,
    }));
  }

  function handleAiDecompose() {
    if (!draft.title.trim()) {
      toast("Type a rough goal name or idea first");
      return;
    }
    const suggestion = generateIntelligentPlan(draft.title, draft.kind);
    setDraft((d) => ({
      ...d,
      title: suggestion.title,
      why: suggestion.why,
      category: suggestion.category,
      priority: suggestion.priority,
      obstacle: suggestion.obstacle,
      protocol: suggestion.protocol,
      target: suggestion.target,
      unit: suggestion.unit,
      milestones: suggestion.milestones,
    }));
    toast("AI generated a structured plan & psychological guardrails!");
  }

  const hideTarget = lockKind && draft.kind === "project";

  return (
    <>
      {lockKind ? null : <KindPills value={draft.kind} onChange={setKind} />}

      {/* Goal Title with AI Assistant Button */}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="goal-title">Name</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleAiDecompose}
            className="h-6 gap-1 px-1.5 text-xs text-sage hover:text-sage"
          >
            <Sparkles className="size-3" />
            <span>AI Breakdown</span>
          </Button>
        </div>
        <Input
          id="goal-title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder={
            draft.kind === "purchase"
              ? "Leica Q3 camera fund"
              : draft.kind === "habit"
                ? "Run 5km before morning work"
                : "Launch SaaS Vertical Slice"
          }
        />
      </div>

      {/* Category & Priority Selector */}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="goal-category">Domain / Category</Label>
          <select
            id="goal-category"
            value={draft.category || "Craft & Work"}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {GOAL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="goal-priority">Priority</Label>
          <select
            id="goal-priority"
            value={draft.priority || "medium"}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                priority: e.target.value as "gentle" | "medium" | "core",
              }))
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="gentle">Gentle Focus</option>
            <option value="medium">Steady Rhythm</option>
            <option value="core">Core Priority</option>
          </select>
        </div>
      </div>

      {/* Target & Unit */}
      {hideTarget ? null : (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="goal-target">{draft.kind === "project" ? "Steps" : "Target"}</Label>
            <Input
              id="goal-target"
              type="number"
              min={1}
              inputMode="decimal"
              value={Number.isFinite(draft.target) && draft.target > 0 ? draft.target : ""}
              onChange={(e) => {
                const raw = e.target.value;
                setDraft((d) => ({
                  ...d,
                  target: raw === "" ? 0 : Number(raw),
                }));
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="goal-unit">Unit</Label>
            <Input
              id="goal-unit"
              value={draft.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Habit Cadence Frequency */}
      {draft.kind === "habit" && (
        <div className="grid gap-1.5">
          <Label htmlFor="goal-frequency">Target Frequency</Label>
          <select
            id="goal-frequency"
            value={draft.frequencyPerWeek || 7}
            onChange={(e) => setDraft((d) => ({ ...d, frequencyPerWeek: Number(e.target.value) }))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={7}>Daily (7 days / week)</option>
            <option value={5}>Weekdays (5 days / week)</option>
            <option value={4}>4 times / week</option>
            <option value={3}>3 times / week</option>
            <option value={2}>Twice / week</option>
          </select>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="goal-deadline">Deadline / Target Horizon</Label>
        <Input
          id="goal-deadline"
          type="date"
          value={draft.deadline ? draft.deadline.slice(0, 10) : ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              deadline: e.target.value ? new Date(`${e.target.value}T18:00:00`).toISOString() : null,
            }))
          }
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="goal-why">The Deep Why</Label>
        <Textarea
          id="goal-why"
          value={draft.why}
          onChange={(e) => setDraft((d) => ({ ...d, why: e.target.value }))}
          placeholder="The core personal meaning you will remember when resistance hits."
          className="min-h-16"
        />
      </div>

      {/* Psychological Guardrails (WOOP / Implementation Intentions) */}
      <div className="rounded-lg border border-border/80 bg-secondary/30 p-3 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Psychological Guardrails
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="goal-obstacle" className="text-xs">
            Anticipated Friction / Obstacle
          </Label>
          <Input
            id="goal-obstacle"
            value={draft.obstacle || ""}
            onChange={(e) => setDraft((d) => ({ ...d, obstacle: e.target.value }))}
            placeholder="e.g. Afternoon exhaustion, temptation to doomscroll"
            className="text-xs"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="goal-protocol" className="text-xs">
            If-Then Strategy ("If obstacle occurs, then I will...")
          </Label>
          <Input
            id="goal-protocol"
            value={draft.protocol || ""}
            onChange={(e) => setDraft((d) => ({ ...d, protocol: e.target.value }))}
            placeholder="e.g. Put shoes on immediately and step outside for 2 mins"
            className="text-xs"
          />
        </div>
      </div>
    </>
  );
}

export function GoalComposer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const addGoal = useGoalStore((s) => s.addGoal);
  const [draft, setDraft] = useState<GoalDraft>(defaultDraft());

  useEffect(() => {
    if (open) setDraft(defaultDraft());
  }, [open]);

  function submit() {
    if (!draft.title.trim()) {
      toast("Give it a name");
      return;
    }
    const id = addGoal(draft);
    setDraft(defaultDraft());
    onOpenChange(false);
    toast("Mark set with intelligent plan");
    void navigate({ to: "/goals/$goalId", params: { goalId: id } });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New Mark</DrawerTitle>
          <DrawerDescription>A purchase, a habit, or a project with meaningful steps.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          <DraftFields draft={draft} setDraft={(fn) => setDraft(fn)} />
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" onClick={submit}>
            Plant this mark
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function EditGoalSheet({
  goal,
  open,
  onOpenChange,
}: {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateGoal = useGoalStore((s) => s.updateGoal);
  const [draft, setDraft] = useState<GoalDraft>(defaultDraft());

  useEffect(() => {
    if (open && goal) {
      setDraft({
        title: goal.title,
        why: goal.why,
        kind: goal.kind,
        target: goal.target,
        unit: goal.unit,
        deadline: goal.deadline,
        category: goal.category,
        priority: goal.priority,
        obstacle: goal.obstacle,
        protocol: goal.protocol,
        frequencyPerWeek: goal.frequencyPerWeek,
      });
    }
  }, [open, goal]);

  if (!goal) return null;
  const current = goal;

  function submit() {
    if (!draft.title.trim()) {
      toast("Give it a name");
      return;
    }
    const target = Number.isFinite(draft.target) && draft.target > 0 ? draft.target : current.target;
    updateGoal(current.id, {
      title: draft.title.trim(),
      why: draft.why.trim(),
      target: Math.max(1, target),
      unit: draft.unit.trim() || current.unit,
      deadline: draft.deadline,
      category: draft.category,
      priority: draft.priority,
      obstacle: draft.obstacle,
      protocol: draft.protocol,
      frequencyPerWeek: draft.frequencyPerWeek,
    });
    onOpenChange(false);
    toast("Mark updated");
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Mark</DrawerTitle>
          <DrawerDescription>Recalibrate purpose, targets, and guardrails.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          <DraftFields draft={draft} setDraft={(fn) => setDraft(fn)} lockKind />
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" onClick={submit}>
            Save changes
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function LogProgressSheet({
  goal,
  open,
  onOpenChange,
}: {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const logProgress = useGoalStore((s) => s.logProgress);
  const suggested = goal?.kind === "purchase" ? "200" : "1";
  const [amount, setAmount] = useState(suggested);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(suggested);
      setNote("");
    }
  }, [open, suggested]);

  if (!goal) return null;
  const current = goal;

  function submit() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) {
      toast("Enter an amount");
      return;
    }
    logProgress(current.id, n, note);
    setNote("");
    onOpenChange(false);
    toast("Progress logged");
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Log Progress</DrawerTitle>
          <DrawerDescription>{goal.title}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="log-amount">Amount ({goal.unit})</Label>
            <Input
              id="log-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {goal.kind === "habit" ? (
              <div className="flex gap-2 pt-1">
                {["1", "2", "3"].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setAmount(n)}
                  >
                    +{n}
                  </Button>
                ))}
              </div>
            ) : null}
            {goal.kind === "purchase" ? (
              <div className="flex gap-2 pt-1">
                {["50", "100", "250", "500"].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setAmount(n)}
                  >
                    +{n}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="log-note">Reflection / Note</Label>
            <Textarea
              id="log-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did today feel? Any insight or friction?"
              className="min-h-20"
            />
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" onClick={submit}>
            Save Log
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function ReminderSheet({
  goal,
  open,
  onOpenChange,
}: {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const setReminder = useGoalStore((s) => s.setReminder);
  const [local, setLocal] = useState<Reminder>(newReminder());

  useEffect(() => {
    if (open && goal) setLocal(goal.reminder ?? newReminder());
  }, [open, goal]);

  if (!goal) return null;
  const current = goal;

  async function save() {
    if (local.enabled) {
      const ok = await ensureNotifyPermission();
      if (!ok) {
        toast("Please grant notification permission in your browser");
      }
    }
    setReminder(current.id, local.enabled ? local : null);
    onOpenChange(false);
    toast(local.enabled ? "Reminder set" : "Reminder removed");
  }

  function toggleDay(d: number) {
    const set = new Set(local.days);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    setLocal((r) => ({ ...r, days: Array.from(set).sort() }));
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Reminder</DrawerTitle>
          <DrawerDescription>A nudge at the hour you are most receptive.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="rem-enabled">Enable reminder</Label>
            <Switch
              id="rem-enabled"
              checked={local.enabled}
              onCheckedChange={(checked) => setLocal((r) => ({ ...r, enabled: checked }))}
            />
          </div>
          {local.enabled ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="rem-time">Time</Label>
                <Input
                  id="rem-time"
                  type="time"
                  value={local.time}
                  onChange={(e) => setLocal((r) => ({ ...r, time: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Days of the week</Label>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((w) => {
                    const on = local.days.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleDay(w.id)}
                        className={cn(
                          "h-10 rounded-md border text-xs font-medium transition-colors",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rem-msg">Message</Label>
                <Input
                  id="rem-msg"
                  value={local.message}
                  onChange={(e) => setLocal((r) => ({ ...r, message: e.target.value }))}
                  placeholder={goal.title}
                />
              </div>
            </>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" onClick={save}>
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const profile = useGoalStore((s) => s.profile);
  const setName = useGoalStore((s) => s.setName);
  const setProfile = useGoalStore((s) => s.setProfile);
  const exportSnapshot = useGoalStore((s) => s.exportSnapshot);
  const importSnapshot = useGoalStore((s) => s.importSnapshot);
  const resetToSeed = useGoalStore((s) => s.resetToSeed);
  const fileRef = useRef<HTMLInputElement>(null);

  const [localName, setLocalName] = useState(profile.name);
  const [apiKey, setApiKey] = useState(profile.aiApiKey || "");
  const [provider, setProvider] = useState<"offline" | "gemini" | "openai" | "groq">(
    profile.aiProvider || "offline",
  );
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalName(profile.name);
      setApiKey(profile.aiApiKey || "");
      setProvider(profile.aiProvider || "offline");
    }
  }, [open, profile]);

  function save() {
    setName(localName);
    setProfile({
      aiApiKey: apiKey.trim() || undefined,
      aiProvider: provider,
    });
    onOpenChange(false);
    toast("Settings saved");
  }

  function downloadBackup() {
    const snap = exportSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waymaker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup downloaded");
  }

  function onPickFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!importSnapshot(parsed)) {
          toast("That file is not a valid Waymaker backup");
          return;
        }
        onOpenChange(false);
        toast("Backup restored successfully!");
      } catch {
        toast("Could not read backup file");
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Settings & Profile</DrawerTitle>
            <DrawerDescription>Waymaker local profile, cloud sync, and AI engine.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
            {/* User Name */}
            <div className="grid gap-1.5">
              <Label htmlFor="you-name">Your Name</Label>
              <Input
                id="you-name"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="What should Waymaker call you?"
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
              />
            </div>

            {/* AI Engine Configuration */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="size-3.5 text-sage" />
                <span>Waymaker Intelligence Engine</span>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ai-provider" className="text-xs">
                  AI Mode
                </Label>
                <select
                  id="ai-provider"
                  value={provider}
                  onChange={(e) =>
                    setProvider(e.target.value as "offline" | "gemini" | "openai" | "groq")
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="offline">Built-in Intelligent Planner (Offline & Fast)</option>
                  <option value="gemini">Google Gemini API</option>
                  <option value="openai">OpenAI API</option>
                  <option value="groq">Groq (Ultra-fast LLM)</option>
                </select>
              </div>
              {provider !== "offline" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="ai-key" className="text-xs">
                    Custom API Key
                  </Label>
                  <Input
                    id="ai-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-... or AIzaSy..."
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Stored securely only on your local browser/device.
                  </p>
                </div>
              )}
            </div>

            {/* Backup & Restore */}
            <div className="flex flex-col gap-2">
              <Button type="button" variant="secondary" onClick={downloadBackup}>
                Export Backup (JSON)
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                Restore Backup from File
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                aria-label="Restore backup file"
                onChange={(e) => {
                  onPickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Notifications Test */}
            <div className="rounded-md border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">System Notifications</span>
                <span className="font-medium text-foreground capitalize">
                  {typeof window !== "undefined" && "Notification" in window
                    ? Notification.permission
                    : "Not supported"}
                </span>
              </div>
              <div className="mt-2.5 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={async () => {
                    const ok = await ensureNotifyPermission();
                    if (ok) {
                      await sendNotification("Waymaker Test", {
                        body: "Quiet reminders are working properly!",
                        icon: "/icon-192.png",
                      });
                      toast("Test notification sent!");
                    } else {
                      toast("Notification permission was not granted.");
                    }
                  }}
                >
                  Test notification
                </Button>
              </div>
            </div>

            <button
              type="button"
              className="text-left text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline pt-1"
              onClick={() => setConfirmReset(true)}
            >
              Reset to sample marks
            </button>
          </DrawerBody>
          <DrawerFooter>
            <Button type="button" onClick={save}>
              Save Settings
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset everything to samples?</AlertDialogTitle>
            <AlertDialogDescription>
              Your local marks, logs, and boards will be reset. Download a backup first if you wish to keep them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep mine</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                resetToSeed();
                setConfirmReset(false);
                onOpenChange(false);
                toast("Sample marks restored");
              }}
            >
              Reset to samples
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
