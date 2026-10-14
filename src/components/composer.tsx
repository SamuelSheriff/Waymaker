import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Goal, GoalKind, Reminder } from "@/lib/types";
import { KIND_META, WEEKDAYS } from "@/lib/types";
import { defaultDraft, newReminder, useGoalStore, type GoalDraft } from "@/lib/store";
import { ensureNotifyPermission, sendNotification } from "@/lib/reminders";
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

  const hideTarget = lockKind && draft.kind === "project";

  return (
    <>
      {lockKind ? null : <KindPills value={draft.kind} onChange={setKind} />}
      <div className="grid gap-1.5">
        <Label htmlFor="goal-title">Name</Label>
        <Input
          id="goal-title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder={
            draft.kind === "purchase"
              ? "Leica Q3"
              : draft.kind === "habit"
                ? "Run before breakfast"
                : "Garden studio"
          }
        />
      </div>
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
      <div className="grid gap-1.5">
        <Label htmlFor="goal-deadline">Deadline</Label>
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
        <Label htmlFor="goal-why">Why it matters</Label>
        <Textarea
          id="goal-why"
          value={draft.why}
          onChange={(e) => setDraft((d) => ({ ...d, why: e.target.value }))}
          placeholder="The reason you will still want this in six months."
        />
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
    toast("Mark set");
    void navigate({ to: "/goals/$goalId", params: { goalId: id } });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New mark</DrawerTitle>
          <DrawerDescription>A purchase, a habit, or a project with steps.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4">
          <DraftFields draft={draft} setDraft={(fn) => setDraft(fn)} />
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" onClick={submit}>
            Set the mark
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
    });
    onOpenChange(false);
    toast("Mark updated");
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit mark</DrawerTitle>
          <DrawerDescription>Change the name, target, or the reason it matters.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4">
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
    toast("Logged");
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Log progress</DrawerTitle>
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
                  <Button key={n} type="button" size="sm" variant="secondary" onClick={() => setAmount(n)}>
                    +{n}
                  </Button>
                ))}
              </div>
            ) : null}
            {goal.kind === "purchase" ? (
              <div className="flex gap-2 pt-1">
                {["50", "100", "250", "500"].map((n) => (
                  <Button key={n} type="button" size="sm" variant="secondary" onClick={() => setAmount(n)}>
                    {n}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="log-note">Note</Label>
            <Textarea
              id="log-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" onClick={submit}>
            Save log
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
        toast("Reminders will ping in-app until notifications are allowed.");
      }
    }
    setReminder(current.id, local);
    onOpenChange(false);
    toast(local.enabled ? "Reminder set" : "Reminder off");
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Reminder</DrawerTitle>
          <DrawerDescription>
            A nudge on the days you chose. Works while Waymark is open, and as a system notification if
            you allow it.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-3">
            <Label htmlFor="rem-on" className="text-sm text-foreground">
              Enabled
            </Label>
            <Switch
              id="rem-on"
              checked={local.enabled}
              onCheckedChange={(enabled) => setLocal((r) => ({ ...r, enabled }))}
            />
          </div>
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
            <Label>Days</Label>
            <div className="flex gap-1">
              {WEEKDAYS.map((d) => {
                const on = local.days.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-label={d.name}
                    onClick={() =>
                      setLocal((r) => ({
                        ...r,
                        days: on ? r.days.filter((x) => x !== d.id) : [...r.days, d.id].sort(),
                      }))
                    }
                    className={cn(
                      "flex h-11 flex-1 items-center justify-center rounded-sm text-xs font-medium transition-colors duration-150",
                      on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {d.label}
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
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" onClick={() => void save()}>
            Save reminder
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
  const name = useGoalStore((s) => s.profile.name);
  const setName = useGoalStore((s) => s.setName);
  const resetToSeed = useGoalStore((s) => s.resetToSeed);
  const exportSnapshot = useGoalStore((s) => s.exportSnapshot);
  const importSnapshot = useGoalStore((s) => s.importSnapshot);
  const [local, setLocal] = useState(name);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setLocal(name);
  }, [open, name]);

  function save() {
    setName(local.trim());
    onOpenChange(false);
    toast(local.trim() ? `Hello, ${local.trim()}` : "Name cleared");
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(exportSnapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waymark-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
          toast("That file is not a Waymark backup");
          return;
        }
        onOpenChange(false);
        toast("Backup restored");
      } catch {
        toast("Could not read that file");
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>You</DrawerTitle>
            <DrawerDescription>A name for the greeting. Everything stays on this device.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="you-name">What should we call you?</Label>
              <Input
                id="you-name"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="Your name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="secondary" onClick={downloadBackup}>
                Download backup
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                Restore from file
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
            <div className="rounded-md border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Notifications</span>
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
                      await sendNotification("Waymark Test", {
                        body: "Notifications are working properly on your device!",
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
              className="text-left text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => setConfirmReset(true)}
            >
              Restore the sample marks
            </button>
          </DrawerBody>
          <DrawerFooter>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace everything with samples?</AlertDialogTitle>
            <AlertDialogDescription>
              Your marks, logs, and boards on this device will be overwritten. Download a backup first if
              you might want them back.
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
              Restore samples
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
