export type GoalKind = "purchase" | "habit" | "project";
export type GoalStatus = "active" | "paused" | "completed";
export type StickyTone = "paper" | "sage" | "ink";
export type DrawTool = "pen" | "line" | "highlighter" | "eraser";

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface CheckIn {
  id: string;
  at: string;
  amount: number;
  note: string;
}

export interface Reminder {
  enabled: boolean;
  time: string;
  days: number[];
  lastFiredDate: string | null;
  message: string;
}

export interface Goal {
  id: string;
  title: string;
  why: string;
  kind: GoalKind;
  status: GoalStatus;
  target: number;
  current: number;
  unit: string;
  deadline: string | null;
  createdAt: string;
  milestones: Milestone[];
  checkIns: CheckIn[];
  reminder: Reminder | null;
  boardId: string;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: StrokePoint[];
}

export interface Sticky {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  tone: StickyTone;
}

export interface Board {
  id: string;
  title: string;
  goalId: string | null;
  strokes: Stroke[];
  stickies: Sticky[];
  updatedAt: string;
}

export interface Profile {
  name: string;
}

export const KIND_META: Record<
  GoalKind,
  { label: string; hint: string; defaultUnit: string; defaultTarget: number }
> = {
  purchase: {
    label: "Purchase",
    hint: "Save toward a thing you want",
    defaultUnit: "USD",
    defaultTarget: 500,
  },
  habit: {
    label: "Habit",
    hint: "Show up, count the days",
    defaultUnit: "days",
    defaultTarget: 30,
  },
  project: {
    label: "Project",
    hint: "Break a bigger thing into marks",
    defaultUnit: "steps",
    defaultTarget: 5,
  },
};

export const WEEKDAYS = [
  { id: 0, label: "S", name: "Sunday" },
  { id: 1, label: "M", name: "Monday" },
  { id: 2, label: "T", name: "Tuesday" },
  { id: 3, label: "W", name: "Wednesday" },
  { id: 4, label: "T", name: "Thursday" },
  { id: 5, label: "F", name: "Friday" },
  { id: 6, label: "S", name: "Saturday" },
] as const;
