import type {
  Goal,
  GoalKind,
  GoalDraft,
  Milestone,
  Sticky,
  BoardConnection,
  BoardNodeKind,
  BoardSymbol,
  StickyTone,
} from "./types";
import { nid } from "./utils";
import { differenceInDays, parseISO, subDays } from "date-fns";
import { habitStreak } from "./stats";

export interface AIPlanSuggestion {
  title: string;
  why: string;
  kind: GoalKind;
  target: number;
  unit: string;
  category: string;
  priority: "gentle" | "medium" | "core";
  obstacle: string;
  protocol: string;
  milestones: Array<{ title: string; notes?: string }>;
  boardNodes: Array<{
    text: string;
    kind: BoardNodeKind;
    tone: StickyTone;
    symbol?: BoardSymbol;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  boardConnections: Array<{ fromIdx: number; toIdx: number; label?: string }>;
}

export interface MomentumInsight {
  score: number; // 0 - 100
  level: "Thriving" | "Steady" | "Building" | "Rekindling";
  summary: string;
  recommendations: string[];
  projectedCompletions: Array<{ goalTitle: string; estimatedDate: string; onTrack: boolean }>;
}

/**
 * Built-in intelligent goal architect heuristics.
 * Covers fitness, career/code, finance, writing, habits, learning, and projects.
 */
export function generateIntelligentPlan(prompt: string, defaultKind?: GoalKind): AIPlanSuggestion {
  const p = prompt.toLowerCase();

  // 1. Running / Fitness / Health
  if (p.includes("run") || p.includes("marathon") || p.includes("gym") || p.includes("workout") || p.includes("fit") || p.includes("weight")) {
    return {
      title: prompt.trim() || "Build Consistent Physical Vitality",
      why: "To cultivate sustained daily energy, physical strength, and mental clarity through steady movement.",
      kind: defaultKind || "habit",
      target: 30,
      unit: "sessions",
      category: "Health & Body",
      priority: "core",
      obstacle: "Low morning motivation or unexpected fatigue after long work days.",
      protocol: "If I feel exhausted or low on willpower, I will put on my running shoes and commit to just 5 minutes.",
      milestones: [
        { title: "Baseline Assessment & Gear Check", notes: "Establish starting pace and comfortable footwear" },
        { title: "Week 1: Three structured 20-min sessions", notes: "Focus on aerobic zone, not speed" },
        { title: "Week 2: Add recovery & mobility routine", notes: "10 mins stretching or foam rolling post-run" },
        { title: "Midway Benchmark: Test distance without stopping", notes: "Celebrate cardiovascular adaptation" },
        { title: "Sustained Rhythm: 15 consecutive check-ins", notes: "Habit automation unlocked" },
      ],
      boardNodes: [
        { text: prompt || "Physical Vitality Target", kind: "circle", tone: "sage", symbol: "target", x: 60, y: 140, w: 180, h: 90 },
        { text: "Core Habit: 3x / week morning movement", kind: "card", tone: "paper", symbol: "sparkle", x: 300, y: 70, w: 200, h: 100 },
        { text: "Friction point: Late nights lead to skipped mornings", kind: "diamond", tone: "clay", symbol: "alert", x: 300, y: 220, w: 210, h: 100 },
        { text: "Protocol: Sleep in workout gear or lay it out by bed", kind: "pill", tone: "gold", symbol: "lightbulb", x: 570, y: 225, w: 230, h: 80 },
        { text: "Milestone: 30-day streak milestone", kind: "rectangle", tone: "sage", symbol: "flag", x: 570, y: 75, w: 210, h: 90 },
      ],
      boardConnections: [
        { fromIdx: 0, toIdx: 1, label: "driver" },
        { fromIdx: 0, toIdx: 2, label: "watch out" },
        { fromIdx: 2, toIdx: 3, label: "if-then" },
        { fromIdx: 1, toIdx: 4, label: "leads to" },
      ],
    };
  }

  // 2. Software / Craft / Coding / Portfolio / Project
  if (p.includes("build") || p.includes("app") || p.includes("code") || p.includes("saas") || p.includes("portfolio") || p.includes("launch")) {
    return {
      title: prompt.trim() || "Ship High-Impact Software Product",
      why: "To bring an idea into reality, sharpen technical craft, and create genuine value for users.",
      kind: defaultKind || "project",
      target: 6,
      unit: "steps",
      category: "Craft & Work",
      priority: "core",
      obstacle: "Getting stuck polishing edge-case architecture rather than shipping working vertical slices.",
      protocol: "If I spend more than 2 hours debating architecture, I will ship the simplest naive implementation and test it immediately.",
      milestones: [
        { title: "Define Core User Journey & Minimal Scope", notes: "One single killer capability done exceptionally" },
        { title: "Scaffold Architecture & Local Storage / DB Schema", notes: "Solid, reactive data model" },
        { title: "Implement Interactive UI Flow with Feedback", notes: "Delightful inputs and states" },
        { title: "Polish Visual Polish & Mobile Viewport", notes: "Zero awkward horizontal overflow" },
        { title: "Pre-Launch Testing & Bug Scrub", notes: "Verify edge cases and offline states" },
        { title: "Release Live Deployment to Real Users", notes: "Gather first feedback and observe usage" },
      ],
      boardNodes: [
        { text: prompt || "Ship Project V1", kind: "circle", tone: "ink", symbol: "target", x: 60, y: 150, w: 180, h: 90 },
        { text: "1. Core Spec: Single vertical slice", kind: "rectangle", tone: "paper", symbol: "lightbulb", x: 300, y: 70, w: 200, h: 90 },
        { text: "2. Working Prototype & UI flow", kind: "rectangle", tone: "sage", symbol: "flag", x: 560, y: 70, w: 200, h: 90 },
        { text: "3. Scope Creep Risk: Feature bloat", kind: "diamond", tone: "clay", symbol: "alert", x: 300, y: 230, w: 200, h: 90 },
        { text: "4. Guardrail: Must ship to beta by Friday", kind: "pill", tone: "gold", symbol: "star", x: 560, y: 235, w: 220, h: 80 },
      ],
      boardConnections: [
        { fromIdx: 0, toIdx: 1, label: "phase 1" },
        { fromIdx: 1, toIdx: 2, label: "phase 2" },
        { fromIdx: 0, toIdx: 3, label: "friction" },
        { fromIdx: 3, toIdx: 4, label: "countermeasure" },
      ],
    };
  }

  // 3. Money / Saving / Purchase
  if (p.includes("save") || p.includes("buy") || p.includes("purchase") || p.includes("fund") || p.includes("budget") || p.includes("$")) {
    return {
      title: prompt.trim() || "Intentional Purchase Fund",
      why: "To purchase something deeply meaningful without debt, maintaining peace of mind.",
      kind: defaultKind || "purchase",
      target: 1000,
      unit: "USD",
      category: "Finance",
      priority: "medium",
      obstacle: "Impulse micro-spending on dining or online checkout diverting regular contributions.",
      protocol: "If I am tempted to make an unplanned purchase, I will wait 48 hours and transfer half that amount directly to this fund instead.",
      milestones: [
        { title: "Open Dedicated Vault / Allocation", notes: "Isolate funds from daily spending" },
        { title: "Reach 25% Seed Milestone", notes: "Momentum started" },
        { title: "Reach Halfway Mark (50%)", notes: "Re-evaluate product model and reviews" },
        { title: "Reach 75% Home Stretch", notes: "Final weeks of disciplined deposits" },
        { title: "Full Target Reached (100%)", notes: "Purchase made in cash and celebrated" },
      ],
      boardNodes: [
        { text: prompt || "Purchase Goal", kind: "circle", tone: "gold", symbol: "target", x: 60, y: 150, w: 180, h: 90 },
        { text: "Regular Weekly Transfer Strategy", kind: "card", tone: "paper", symbol: "sparkle", x: 300, y: 70, w: 210, h: 90 },
        { text: "Trap: Frictionless 1-click purchases", kind: "diamond", tone: "clay", symbol: "alert", x: 300, y: 230, w: 210, h: 90 },
        { text: "Rule: 48-hour cooling off period", kind: "pill", tone: "sage", symbol: "check", x: 570, y: 235, w: 220, h: 80 },
        { text: "Celebration: Cash in hand, zero debt", kind: "rectangle", tone: "gold", symbol: "star", x: 570, y: 75, w: 220, h: 90 },
      ],
      boardConnections: [
        { fromIdx: 0, toIdx: 1, label: "inflow" },
        { fromIdx: 0, toIdx: 2, label: "threat" },
        { fromIdx: 2, toIdx: 3, label: "guardrail" },
        { fromIdx: 1, toIdx: 4, label: "outcome" },
      ],
    };
  }

  // 4. Learning / Reading / Language / Mindset
  return {
    title: prompt.trim() || "Cultivate New Mastery & Practice",
    why: "To expand horizons, build deep capability, and quiet the noise of distraction.",
    kind: defaultKind || "habit",
    target: 30,
    unit: "days",
    category: "Mind & Spirit",
    priority: "core",
    obstacle: "Distraction from notifications and fragmented attention during designated focus windows.",
    protocol: "If I find myself reaching for my phone during practice, I will place it in another room and set a 20-minute visual timer.",
    milestones: [
      { title: "Set up Dedicated Sanctuary & Tools", notes: "No distractions, ready materials" },
      { title: "First 7 Days of Consistent Practice", notes: "Establishing the friction-free cue" },
      { title: "Week 2: Deep Dive into Foundations", notes: "Focus on technique and comprehension" },
      { title: "Week 3: Practical Application", notes: "Build or teach something using what was learned" },
      { title: "Month 1 Review & Next Horizon", notes: "Reflect on growth and recalibrate" },
    ],
    boardNodes: [
      { text: prompt || "Mastery Pathway", kind: "circle", tone: "sage", symbol: "star", x: 60, y: 150, w: 180, h: 90 },
      { text: "Daily 25-minute deep focus ritual", kind: "card", tone: "paper", symbol: "lightbulb", x: 300, y: 70, w: 210, h: 90 },
      { text: "Obstacle: Attention drift & digital noise", kind: "diamond", tone: "clay", symbol: "alert", x: 300, y: 230, w: 210, h: 90 },
      { text: "Ritual: Airplane mode + physical notebook", kind: "pill", tone: "sage", symbol: "check", x: 570, y: 235, w: 230, h: 80 },
      { text: "Outcome: Measurable fluency & deep craft", kind: "rectangle", tone: "ink", symbol: "flag", x: 570, y: 75, w: 220, h: 90 },
    ],
    boardConnections: [
      { fromIdx: 0, toIdx: 1, label: "daily ritual" },
      { fromIdx: 0, toIdx: 2, label: "friction" },
      { fromIdx: 2, toIdx: 3, label: "solution" },
      { fromIdx: 1, toIdx: 4, label: "results in" },
    ],
  };
}

/**
 * Intelligent momentum & trajectory analyzer for the user's active marks.
 */
export function calculateMomentum(goals: Goal[]): MomentumInsight {
  const active = goals.filter((g) => g.status === "active");
  if (active.length === 0) {
    return {
      score: 0,
      level: "Rekindling",
      summary: "No active marks set yet. Plant your first mark to start building momentum.",
      recommendations: ["Create an achievable 7-day habit or 3-step project to ignite progress."],
      projectedCompletions: [],
    };
  }

  const now = new Date();
  const twoWeeksAgo = subDays(now, 14);

  let recentCheckInCount = 0;
  let activeHabitStreaks = 0;
  let completedMilestones = 0;
  let totalMilestones = 0;

  for (const g of active) {
    for (const c of g.checkIns) {
      const d = parseISO(c.at);
      if (!Number.isNaN(d.getTime()) && d >= twoWeeksAgo) {
        recentCheckInCount++;
      }
    }
    if (g.kind === "habit") {
      activeHabitStreaks += habitStreak(g);
    }
    if (g.kind === "project") {
      completedMilestones += g.milestones.filter((m) => m.done).length;
      totalMilestones += g.milestones.length;
    }
  }

  // Calculate score 0 - 100
  const checkInFactor = Math.min(recentCheckInCount * 4, 45); // up to 45 pts
  const streakFactor = Math.min(activeHabitStreaks * 6, 35); // up to 35 pts
  const milestoneFactor = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 20 : 10;
  const rawScore = Math.round(checkInFactor + streakFactor + milestoneFactor);
  const score = Math.max(5, Math.min(100, rawScore));

  let level: MomentumInsight["level"] = "Building";
  if (score >= 75) level = "Thriving";
  else if (score >= 50) level = "Steady";
  else if (score >= 25) level = "Building";
  else level = "Rekindling";

  const recommendations: string[] = [];
  const dormantHabits = active.filter((g) => g.kind === "habit" && habitStreak(g) === 0);
  if (dormantHabits.length > 0) {
    recommendations.push(
      `Check in on "${dormantHabits[0].title}" today to restart your momentum chain.`,
    );
  }

  const projectsNearCompletion = active.filter(
    (g) => g.kind === "project" && g.milestones.length > 0 && g.current / g.target >= 0.7 && g.current < g.target,
  );
  if (projectsNearCompletion.length > 0) {
    recommendations.push(
      `"${projectsNearCompletion[0].title}" is in the home stretch (${projectsNearCompletion[0].current}/${projectsNearCompletion[0].target} steps). Complete one more step to finish!`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Your rhythm is consistent. Protect your quiet morning hours for highest leverage focus.");
  }

  const projectedCompletions = active.map((g) => {
    if (g.kind === "purchase") {
      const remaining = Math.max(0, g.target - g.current);
      const weeklyAvg = g.checkIns.length > 0 ? (g.current / Math.max(1, g.checkIns.length)) * 2 : 20;
      const weeksLeft = Math.ceil(remaining / Math.max(1, weeklyAvg));
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + weeksLeft * 7);
      return {
        goalTitle: g.title,
        estimatedDate: estDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        onTrack: weeksLeft <= 12,
      };
    }
    return {
      goalTitle: g.title,
      estimatedDate: g.deadline ? new Date(g.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Open horizon",
      onTrack: true,
    };
  });

  return {
    score,
    level,
    summary:
      level === "Thriving"
        ? "Exceptional velocity. Your check-ins show deeply ingrained habit loops and relentless progress."
        : level === "Steady"
          ? "Solid consistent pace. You are holding your ground across your active commitments."
          : level === "Building"
            ? "Momentum is taking root. A few consecutive daily check-ins will compound rapidly."
            : "Gentle restart time. Pick one micro-action today to ignite the flywheel.",
    recommendations,
    projectedCompletions,
  };
}

/**
 * Converts any existing Goal into a connected visual board layout.
 */
export function populateGoalBoard(goal: Goal): {
  stickies: Sticky[];
  connections: BoardConnection[];
} {
  const stickies: Sticky[] = [];
  const connections: BoardConnection[] = [];

  // 1. Center goal node
  const goalNodeId = nid();
  stickies.push({
    id: goalNodeId,
    text: goal.title,
    kind: "circle",
    tone: goal.kind === "habit" ? "sage" : goal.kind === "purchase" ? "gold" : "ink",
    symbol: "target",
    x: 60,
    y: 160,
    w: 190,
    h: 100,
    linkedGoalId: goal.id,
  });

  // 2. Why / Purpose note
  if (goal.why) {
    const whyId = nid();
    stickies.push({
      id: whyId,
      text: `Why: ${goal.why}`,
      kind: "card",
      tone: "paper",
      symbol: "sparkle",
      x: 310,
      y: 50,
      w: 220,
      h: 90,
      linkedGoalId: goal.id,
    });
    connections.push({ id: nid(), fromId: goalNodeId, toId: whyId, label: "driven by" });
  }

  // 3. Milestones or steps
  let lastNodeId = goalNodeId;
  const startX = 310;
  let startY = 170;

  if (goal.milestones.length > 0) {
    goal.milestones.forEach((m, idx) => {
      const stepId = nid();
      stickies.push({
        id: stepId,
        text: m.title,
        kind: "rectangle",
        tone: m.done ? "sage" : "paper",
        symbol: m.done ? "check" : "flag",
        status: m.done ? "done" : "todo",
        x: startX + (idx % 2 === 0 ? 0 : 250),
        y: startY + Math.floor(idx / 2) * 110,
        w: 210,
        h: 90,
        linkedGoalId: goal.id,
        linkedMilestoneId: m.id,
      });
      connections.push({ id: nid(), fromId: lastNodeId, toId: stepId, label: `step ${idx + 1}` });
      lastNodeId = stepId;
    });
  }

  // 4. Obstacle & Strategy if present
  if (goal.obstacle || goal.protocol) {
    const obsId = nid();
    stickies.push({
      id: obsId,
      text: `Obstacle: ${goal.obstacle || "Distraction"}\nStrategy: ${goal.protocol || "Take micro-step"}`,
      kind: "diamond",
      tone: "clay",
      symbol: "alert",
      x: startX + 260,
      y: 50,
      w: 240,
      h: 100,
      linkedGoalId: goal.id,
    });
    connections.push({ id: nid(), fromId: goalNodeId, toId: obsId, label: "watch out" });
  }

  return { stickies, connections };
}

