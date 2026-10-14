import type { Board, Goal } from "./types";

function daysAgoIso(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 12, 0, 0);
  return d.toISOString();
}

function daysAheadIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const INBOX_BOARD_ID = "board-inbox";
export const STUDIO_BOARD_ID = "board-studio";
export const LENS_ID = "goal-lens";
export const RUN_ID = "goal-run";
export const STUDIO_ID = "goal-studio";
export const BOOK_ID = "goal-book";

export const SEED_GOALS: Goal[] = [
  {
    id: LENS_ID,
    title: "Leica Q3",
    why: "A camera I will actually carry. Save in quiet monthly deposits, no financing.",
    kind: "purchase",
    status: "active",
    target: 5800,
    current: 2140,
    unit: "USD",
    deadline: daysAheadIso(90),
    createdAt: daysAgoIso(64, 8),
    boardId: INBOX_BOARD_ID,
    reminder: {
      enabled: true,
      time: "10:00",
      days: [6],
      lastFiredDate: todayStamp(),
      message: "Move this week's camera money.",
    },
    milestones: [
      { id: "m-l1", title: "Emergency fund untouched", done: true },
      { id: "m-l2", title: "Hit $3,000 saved", done: false },
      { id: "m-l3", title: "Try it in-store once", done: false },
    ],
    checkIns: [
      { id: "c-l1", at: daysAgoIso(60, 11), amount: 400, note: "June leftover" },
      { id: "c-l2", at: daysAgoIso(48, 10), amount: 500, note: "Payday" },
      { id: "c-l3", at: daysAgoIso(32, 10), amount: 500, note: "Payday" },
      { id: "c-l4", at: daysAgoIso(18, 10), amount: 400, note: "Sold the old kit lens" },
      { id: "c-l5", at: daysAgoIso(7, 10), amount: 340, note: "Payday, a little extra" },
    ],
  },
  {
    id: RUN_ID,
    title: "Run before breakfast",
    why: "Thirty mornings. Not fast, just out the door before the phone.",
    kind: "habit",
    status: "active",
    target: 30,
    current: 11,
    unit: "days",
    deadline: daysAheadIso(24),
    createdAt: daysAgoIso(16, 6),
    boardId: INBOX_BOARD_ID,
    reminder: {
      enabled: true,
      time: "06:30",
      days: [1, 2, 3, 4, 5, 6],
      lastFiredDate: todayStamp(),
      message: "Shoes. Door. No debate.",
    },
    milestones: [],
    checkIns: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((d, i) => ({
      id: `c-r${i}`,
      at: daysAgoIso(d, 6),
      amount: 1,
      note: "",
    })),
  },
  {
    id: STUDIO_ID,
    title: "Garden studio",
    why: "A room with a door that is not the house. Draw the sequence before spending.",
    kind: "project",
    status: "active",
    target: 6,
    current: 2,
    unit: "steps",
    deadline: daysAheadIso(180),
    createdAt: daysAgoIso(40, 19),
    boardId: STUDIO_BOARD_ID,
    reminder: null,
    milestones: [
      { id: "m-s1", title: "Measure the plot", done: true },
      { id: "m-s2", title: "Sketch plan on the board", done: true },
      { id: "m-s3", title: "Get three builder quotes", done: false },
      { id: "m-s4", title: "Permits", done: false },
      { id: "m-s5", title: "Slab and frame", done: false },
      { id: "m-s6", title: "Desk, stove, lock the door", done: false },
    ],
    checkIns: [
      { id: "c-s1", at: daysAgoIso(28, 16), amount: 1, note: "Tape measure evening" },
      { id: "c-s2", at: daysAgoIso(12, 21), amount: 1, note: "First board sketch" },
    ],
  },
  {
    id: BOOK_ID,
    title: "Read Atomic Habits",
    why: "Finish the book I keep recommending.",
    kind: "habit",
    status: "completed",
    target: 18,
    current: 18,
    unit: "chapters",
    deadline: daysAgoIso(3, 22),
    createdAt: daysAgoIso(40, 21),
    boardId: INBOX_BOARD_ID,
    reminder: null,
    milestones: [],
    checkIns: [38, 30, 22, 15, 8, 3].map((d, i) => ({
      id: `c-b${i}`,
      at: daysAgoIso(d, 22),
      amount: 3,
      note: "",
    })),
  },
];

export const SEED_BOARDS: Board[] = [
  {
    id: INBOX_BOARD_ID,
    title: "Ideas",
    goalId: null,
    strokes: [],
    stickies: [
      {
        id: "st-i1",
        x: 28,
        y: 72,
        w: 180,
        h: 110,
        tone: "paper",
        text: "If it is not on a board, it is a wish. Put the ugly version down first.",
      },
    ],
    updatedAt: daysAgoIso(2, 20),
  },
  {
    id: STUDIO_BOARD_ID,
    title: "Garden studio",
    goalId: STUDIO_ID,
    strokes: [
      {
        id: "sk-s1",
        tool: "pen",
        color: "#8aa58c",
        size: 2.2,
        points: [
          { x: 214, y: 64 },
          { x: 352, y: 64 },
        ],
      },
      {
        id: "sk-s2",
        tool: "pen",
        color: "#8aa58c",
        size: 2.2,
        points: [
          { x: 352, y: 64 },
          { x: 352, y: 156 },
        ],
      },
      {
        id: "sk-s3",
        tool: "pen",
        color: "#8aa58c",
        size: 2.2,
        points: [
          { x: 352, y: 156 },
          { x: 214, y: 156 },
        ],
      },
      {
        id: "sk-s4",
        tool: "pen",
        color: "#8aa58c",
        size: 2.2,
        points: [
          { x: 214, y: 156 },
          { x: 214, y: 64 },
        ],
      },
      {
        id: "sk-s5",
        tool: "line",
        color: "#e7e1d4",
        size: 2,
        points: [
          { x: 352, y: 110 },
          { x: 410, y: 110 },
        ],
      },
    ],
    stickies: [
      {
        id: "st-s1",
        x: 24,
        y: 64,
        w: 168,
        h: 96,
        tone: "ink",
        text: "Why: a door that is not the house.",
      },
      {
        id: "st-s2",
        x: 24,
        y: 180,
        w: 160,
        h: 88,
        tone: "paper",
        text: "1. Measure plot\nSouth fence, 3.2 × 4.1m",
      },
      {
        id: "st-s3",
        x: 200,
        y: 180,
        w: 160,
        h: 88,
        tone: "paper",
        text: "2. Quotes\nThree builders, same brief",
      },
      {
        id: "st-s4",
        x: 24,
        y: 292,
        w: 160,
        h: 88,
        tone: "sage",
        text: "3. Permits\nDo not pour until paper is real",
      },
      {
        id: "st-s5",
        x: 200,
        y: 292,
        w: 160,
        h: 88,
        tone: "sage",
        text: "4. Build\nSlab → frame → power → desk",
      },
    ],
    updatedAt: daysAgoIso(12, 21),
  },
];
