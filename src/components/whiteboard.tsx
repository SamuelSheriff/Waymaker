import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Circle,
  Copy,
  Diamond,
  Download,
  Eraser,
  Flag,
  Heart,
  Highlighter,
  Lightbulb,
  Maximize2,
  MousePointer2,
  Move,
  PenLine,
  Plus,
  RefreshCw,
  Sparkles,
  Square,
  Star,
  StickyNote,
  Target,
  Trash2,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import type {
  Board,
  BoardConnection,
  BoardNodeKind,
  BoardSymbol,
  DrawTool,
  Sticky,
  StickyTone,
  Stroke,
  StrokePoint,
} from "@/lib/types";
import { clamp, nid } from "@/lib/utils";
import { useGoalStore } from "@/lib/store";
import { generateIntelligentPlan } from "@/lib/intelligence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PEN_COLORS = [
  { id: "paper", value: "#e7e1d4" },
  { id: "sage", value: "#8aa58c" },
  { id: "stone", value: "#9c9890" },
  { id: "gold", value: "#d4a373" },
  { id: "clay", value: "#d08c78" },
] as const;

const SIZES: Record<DrawTool, number> = {
  pen: 2.5,
  line: 2.2,
  highlighter: 16,
  eraser: 20,
};

const SYMBOL_ICONS: Record<BoardSymbol, typeof Star> = {
  star: Star,
  target: Target,
  flag: Flag,
  sparkle: Sparkles,
  alert: Zap,
  heart: Heart,
  lightbulb: Lightbulb,
  check: Check,
};

const TONE_CLASSES: Record<StickyTone, { card: string; border: string; bg: string }> = {
  paper: {
    card: "bg-paper text-paper-foreground border-stone/20",
    border: "border-paper-foreground/30",
    bg: "#e7e1d4",
  },
  sage: {
    card: "bg-sage text-sage-foreground border-sage/40",
    border: "border-sage-foreground/40",
    bg: "#8aa58c",
  },
  ink: {
    card: "bg-ink text-foreground border-border",
    border: "border-foreground/30",
    bg: "#161614",
  },
  clay: {
    card: "bg-[#2a1e1c] text-[#f2ded9] border-[#d08c78]/40",
    border: "border-[#d08c78]/50",
    bg: "#d08c78",
  },
  gold: {
    card: "bg-[#282218] text-[#f7e7ce] border-[#d4a373]/40",
    border: "border-[#d4a373]/50",
    bg: "#d4a373",
  },
};

function dist(a: StrokePoint, b: StrokePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points;
  if (pts.length === 0) return;
  ctx.save();
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else if (stroke.tool === "highlighter") {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 0.32;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = stroke.size;

  if (stroke.tool === "line" && pts.length >= 2) {
    const a = pts[0];
    const b = pts[pts.length - 1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const head = 12;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(angle - 0.4), b.y - head * Math.sin(angle - 0.4));
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(angle + 0.4), b.y - head * Math.sin(angle + 0.4));
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (pts.length < 2) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.stroke();
  ctx.restore();
}

function paintAll(canvas: HTMLCanvasElement, strokes: Stroke[], live: Stroke | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  for (const s of strokes) drawStroke(ctx, s);
  if (live) drawStroke(ctx, live);
  ctx.restore();
}

export function Whiteboard({ board }: { board: Board }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<Stroke | null>(null);
  const drawing = useRef(false);

  // Store actions
  const addStroke = useGoalStore((s) => s.addStroke);
  const setBoardStrokes = useGoalStore((s) => s.setBoardStrokes);
  const addSticky = useGoalStore((s) => s.addSticky);
  const updateSticky = useGoalStore((s) => s.updateSticky);
  const removeSticky = useGoalStore((s) => s.removeSticky);
  const addConnection = useGoalStore((s) => s.addConnection);
  const removeConnection = useGoalStore((s) => s.removeConnection);
  const clearBoard = useGoalStore((s) => s.clearBoard);
  const populateBoardWithPlan = useGoalStore((s) => s.populateBoardWithPlan);

  // Interaction mode: "select" (move/connect shapes) or "draw" (handwrite)
  const [boardMode, setBoardMode] = useState<"select" | "draw">("select");
  const [drawTool, setDrawTool] = useState<DrawTool>("pen");
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0].value);
  const [activeTone, setActiveTone] = useState<StickyTone>("paper");
  const [live, setLive] = useState<Stroke | null>(null);

  // Connecting state
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Dialogs
  const [confirmClear, setConfirmClear] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [scratchpadOpen, setScratchpadOpen] = useState(false);

  const strokes = board.strokes;
  const stickies = board.stickies;
  const connections = board.connections || [];

  // Canvas scaling with HiDPI support
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    paintAll(canvas, strokes, liveRef.current);
  }, [strokes]);

  useEffect(() => {
    resize();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const obs = new ResizeObserver(() => resize());
    obs.observe(wrap);
    return () => obs.disconnect();
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintAll(canvas, strokes, live);
  }, [strokes, live, board.id]);

  // Pointer drawing for handwriting layer
  function localPoint(e: PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (boardMode !== "draw") return;
    drawing.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = localPoint(e);
    const stroke: Stroke = {
      id: nid(),
      tool: drawTool,
      color: penColor,
      size: SIZES[drawTool],
      points: [p],
    };
    liveRef.current = stroke;
    setLive(stroke);
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !liveRef.current || boardMode !== "draw") return;
    const p = localPoint(e);
    const pts = liveRef.current.points;
    const last = pts[pts.length - 1];
    if (last && dist(last, p) < 1.6 && liveRef.current.tool !== "line") return;
    const next =
      liveRef.current.tool === "line"
        ? { ...liveRef.current, points: [pts[0], p] }
        : { ...liveRef.current, points: [...pts, p] };
    liveRef.current = next;
    setLive(next);
  }

  function onPointerUp() {
    if (!drawing.current) return;
    drawing.current = false;
    const stroke = liveRef.current;
    liveRef.current = null;
    setLive(null);
    if (stroke && stroke.points.length > 0) addStroke(board.id, stroke);
  }

  function undoDrawing() {
    if (strokes.length === 0) return;
    setBoardStrokes(board.id, strokes.slice(0, -1));
  }

  // Add new Shape / Card
  function spawnShape(kind: BoardNodeKind = "card", symbol?: BoardSymbol) {
    const wrap = wrapRef.current;
    const w = kind === "circle" ? 120 : kind === "diamond" ? 140 : kind === "pill" ? 180 : 180;
    const h = kind === "circle" ? 120 : kind === "diamond" ? 140 : kind === "pill" ? 64 : 100;
    const scrollX = (wrap?.clientWidth ?? 400) / 2 - w / 2;
    const scrollY = (wrap?.clientHeight ?? 400) / 2 - h / 2;

    const id = addSticky(board.id, {
      x: clamp(scrollX + (Math.random() * 40 - 20), 20, (wrap?.clientWidth ?? 500) - w - 20),
      y: clamp(scrollY + (Math.random() * 40 - 20), 20, (wrap?.clientHeight ?? 500) - h - 20),
      w,
      h,
      text: kind === "symbol" ? (symbol || "Key Mark") : "",
      tone: activeTone,
      kind,
      symbol,
      status: "todo",
    });
    setSelectedNodeId(id);
    setBoardMode("select");
  }

  // Join / Connect two nodes
  function handleNodeConnectClick(nodeId: string) {
    if (!connectingFromId) {
      setConnectingFromId(nodeId);
      toast("Connecting: now click target card/shape to join");
    } else if (connectingFromId === nodeId) {
      setConnectingFromId(null);
    } else {
      addConnection(board.id, {
        fromId: connectingFromId,
        toId: nodeId,
        label: "",
        style: "arrow",
      });
      setConnectingFromId(null);
      toast("Parts joined with arrow!");
    }
  }

  // AI Intelligent Plan Generation for Board
  function applyAiPlan() {
    if (!aiPrompt.trim()) return;
    const suggestion = generateIntelligentPlan(aiPrompt);

    const generatedStickies: Sticky[] = suggestion.boardNodes.map((n) => ({
      id: nid(),
      text: n.text,
      kind: n.kind,
      tone: n.tone,
      symbol: n.symbol,
      x: n.x,
      y: n.y,
      w: n.w,
      h: n.h,
      status: "todo",
    }));

    const generatedConnections: BoardConnection[] = suggestion.boardConnections.map((c) => ({
      id: nid(),
      fromId: generatedStickies[c.fromIdx]?.id || generatedStickies[0].id,
      toId: generatedStickies[c.toIdx]?.id || generatedStickies[1].id,
      label: c.label,
      style: "arrow",
    }));

    populateBoardWithPlan(board.id, generatedStickies, generatedConnections);
    setAiModalOpen(false);
    setAiPrompt("");
    toast("Intelligent visual plan mapped onto board!");
  }

  // Export board as PNG
  function exportBoardImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${board.title || "waymaker-board"}-${Date.now()}.png`;
    a.click();
    toast("Board snapshot exported");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top Banner Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/60 px-3 py-1.5 backdrop-blur-xs">
        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <div className="flex rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => {
                setBoardMode("select");
                setConnectingFromId(null);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                boardMode === "select"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MousePointer2 className="size-3.5" />
              <span>Plan & Shapes</span>
            </button>
            <button
              type="button"
              onClick={() => setBoardMode("draw")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                boardMode === "draw"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <PenLine className="size-3.5" />
              <span>Handwrite & Draw</span>
            </button>
          </div>

          {connectingFromId && (
            <div className="flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-xs text-primary animate-pulse">
              <span>Click target shape to join</span>
              <button
                type="button"
                onClick={() => setConnectingFromId(null)}
                className="hover:opacity-75"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => setAiModalOpen(true)}
          >
            <Sparkles className="size-3 text-sage" />
            <span className="hidden sm:inline">Smart Brainstorm</span>
          </Button>

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={exportBoardImage}
            title="Download PNG Snapshot"
          >
            <Download className="size-3.5" />
          </Button>

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => setConfirmClear(true)}
            title="Clear Board"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Board Canvas & Shape Layer */}
      <div
        ref={wrapRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-ink touch-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--color-foreground) 8%, transparent) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* SVG Connectors Layer */}
        <svg className="pointer-events-none absolute inset-0 size-full z-5">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="var(--color-muted-foreground)" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="var(--color-primary)" />
            </marker>
          </defs>
          {connections.map((c) => {
            const from = stickies.find((s) => s.id === c.fromId);
            const to = stickies.find((s) => s.id === c.toId);
            if (!from || !to) return null;

            const x1 = from.x + from.w / 2;
            const y1 = from.y + from.h / 2;
            const x2 = to.x + to.w / 2;
            const y2 = to.y + to.h / 2;

            // Calculate bezier control curvature
            const dx = x2 - x1;
            const dy = y2 - y1;
            const cx1 = x1 + dx * 0.4;
            const cy1 = y1;
            const cx2 = x1 + dx * 0.6;
            const cy2 = y2;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={c.id} className="group pointer-events-auto cursor-pointer">
                <path
                  d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--color-muted-foreground)"
                  strokeWidth="2"
                  strokeDasharray={c.style === "dashed" ? "5 4" : undefined}
                  markerEnd="url(#arrowhead)"
                  className="transition-all hover:stroke-primary hover:stroke-[3px]"
                />
                {c.label && (
                  <text
                    x={midX}
                    y={midY - 6}
                    fill="var(--color-foreground)"
                    fontSize="11"
                    textAnchor="middle"
                    className="font-medium bg-card px-1"
                  >
                    {c.label}
                  </text>
                )}
                {/* Delete connector hover badge */}
                <circle
                  cx={midX}
                  cy={midY}
                  r="9"
                  className="fill-background stroke-border opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeConnection(board.id, c.id)}
                />
                <text
                  x={midX}
                  y={midY + 3.5}
                  fontSize="10"
                  textAnchor="middle"
                  fill="var(--color-destructive)"
                  className="opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                  onClick={() => removeConnection(board.id, c.id)}
                >
                  ×
                </text>
              </g>
            );
          })}
        </svg>

        {/* Handwriting Canvas Layer */}
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 size-full z-10",
            boardMode === "draw" ? "cursor-crosshair pointer-events-auto" : "pointer-events-none",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {/* Draggable Planning Shapes and Cards */}
        {stickies.map((s) => (
          <InteractiveNode
            key={s.id}
            node={s}
            isSelected={selectedNodeId === s.id}
            isConnecting={connectingFromId === s.id}
            boundsRef={wrapRef}
            onSelect={() => setSelectedNodeId(s.id)}
            onConnect={() => handleNodeConnectClick(s.id)}
            onChange={(patch) => updateSticky(board.id, s.id, patch)}
            onRemove={() => removeSticky(board.id, s.id)}
          />
        ))}
      </div>

      {/* Bottom Toolbars & Palettes */}
      <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {boardMode === "select" ? (
          /* Shapes & Parts Spawning Toolbar */
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-medium text-muted-foreground mr-1">Add:</span>
            <ShapeSpawnBtn onClick={() => spawnShape("card")} icon={StickyNote} label="Note Card" />
            <ShapeSpawnBtn onClick={() => spawnShape("rectangle")} icon={Square} label="Step / Block" />
            <ShapeSpawnBtn onClick={() => spawnShape("circle")} icon={Circle} label="Milestone" />
            <ShapeSpawnBtn onClick={() => spawnShape("diamond")} icon={Diamond} label="Decision" />
            <ShapeSpawnBtn onClick={() => spawnShape("pill")} icon={Sparkles} label="Rule / Pill" />

            <div className="mx-1.5 h-5 w-px bg-border" />

            {/* Quick Symbols */}
            <span className="text-xs font-medium text-muted-foreground mr-1">Symbol:</span>
            <ShapeSpawnBtn onClick={() => spawnShape("symbol", "star")} icon={Star} label="Star" />
            <ShapeSpawnBtn onClick={() => spawnShape("symbol", "target")} icon={Target} label="Target" />
            <ShapeSpawnBtn onClick={() => spawnShape("symbol", "flag")} icon={Flag} label="Flag" />
            <ShapeSpawnBtn onClick={() => spawnShape("symbol", "lightbulb")} icon={Lightbulb} label="Idea" />

            <div className="mx-1.5 h-5 w-px bg-border" />

            {/* Tone Selector */}
            <div className="flex items-center gap-1">
              {(["paper", "sage", "ink", "gold", "clay"] as StickyTone[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-label={t}
                  onClick={() => setActiveTone(t)}
                  className={cn(
                    "size-5.5 rounded-full border transition-transform",
                    activeTone === t ? "scale-115 border-primary ring-1 ring-primary" : "border-border",
                  )}
                  style={{ background: TONE_CLASSES[t].bg }}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Handwriting & Drawing Toolbar */
          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1">
              <DrawToolBtn active={drawTool === "pen"} onClick={() => setDrawTool("pen")} label="Pen">
                <PenLine className="size-4" />
              </DrawToolBtn>
              <DrawToolBtn active={drawTool === "line"} onClick={() => setDrawTool("line")} label="Straight Arrow">
                <ArrowUpRight className="size-4" />
              </DrawToolBtn>
              <DrawToolBtn
                active={drawTool === "highlighter"}
                onClick={() => setDrawTool("highlighter")}
                label="Highlighter"
              >
                <Highlighter className="size-4" />
              </DrawToolBtn>
              <DrawToolBtn active={drawTool === "eraser"} onClick={() => setDrawTool("eraser")} label="Eraser">
                <Eraser className="size-4" />
              </DrawToolBtn>
            </div>

            <div className="mx-1 h-5 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={c.id}
                  onClick={() => setPenColor(c.value)}
                  className={cn(
                    "size-5.5 rounded-full border transition-transform",
                    penColor === c.value ? "scale-120 border-primary ring-1 ring-primary" : "border-border",
                  )}
                  style={{ background: c.value }}
                />
              ))}
            </div>

            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={undoDrawing}
              disabled={strokes.length === 0}
              className="ml-auto"
              title="Undo Stroke"
            >
              <Undo2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* AI Brainstorm / Plan Generator Drawer */}
      <Drawer open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DrawerContent className="max-w-md mx-auto">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 font-display text-xl italic">
              <Sparkles className="size-5 text-sage" />
              <span>Intelligent Plan Architect</span>
            </DrawerTitle>
            <DrawerDescription>
              Describe your idea, goal, or creative project. The intelligent engine will construct a connected
              concept map with milestones, obstacles, and next actions directly on this board.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="py-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Build an offline habit tracker, Run 10k in 6 weeks, Launch design newsletter"
              onKeyDown={(e) => {
                if (e.key === "Enter") applyAiPlan();
              }}
              autoFocus
            />
          </DrawerBody>
          <DrawerFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setAiModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyAiPlan} className="gap-1.5">
              <Sparkles className="size-4" />
              <span>Map onto Board</span>
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Confirm Clear Alert */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this visual board?</AlertDialogTitle>
            <AlertDialogDescription>
              All handwritten strokes and planned shapes will be cleared from this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                clearBoard(board.id);
                setConfirmClear(false);
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Draggable Interactive Node / Shape
function InteractiveNode({
  node,
  isSelected,
  isConnecting,
  boundsRef,
  onSelect,
  onConnect,
  onChange,
  onRemove,
}: {
  node: Sticky;
  isSelected: boolean;
  isConnecting: boolean;
  boundsRef: { current: HTMLDivElement | null };
  onSelect: () => void;
  onConnect: () => void;
  onChange: (patch: Partial<Sticky>) => void;
  onRemove: () => void;
}) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const pos = useRef({ x: node.x, y: node.y });
  const elRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    pos.current = { x: node.x, y: node.y };
  }, [node.x, node.y]);

  function clampToBoard(x: number, y: number) {
    const wrap = boundsRef.current;
    const el = elRef.current;
    const w = el?.offsetWidth ?? node.w;
    const h = el?.offsetHeight ?? node.h;
    const maxX = Math.max(0, (wrap?.clientWidth ?? 400) - w);
    const maxY = Math.max(0, (wrap?.clientHeight ?? 400) - h);
    return { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "BUTTON") {
      return;
    }
    onSelect();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.current.x, dy: e.clientY - pos.current.y };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const next = clampToBoard(e.clientX - drag.current.dx, e.clientY - drag.current.dy);
    pos.current = next;
    if (elRef.current) {
      elRef.current.style.left = `${next.x}px`;
      elRef.current.style.top = `${next.y}px`;
    }
  }

  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    onChange({ x: pos.current.x, y: pos.current.y });
  }

  const tone = TONE_CLASSES[node.tone || "paper"];
  const kind = node.kind || "card";
  const SymbolIcon = node.symbol ? SYMBOL_ICONS[node.symbol] : null;

  return (
    <div
      ref={elRef}
      className={cn(
        "absolute z-20 flex flex-col p-2.5 shadow-md transition-shadow cursor-grab active:cursor-grabbing",
        tone.card,
        kind === "circle" ? "rounded-full items-center justify-center text-center aspect-square" : "",
        kind === "diamond" ? "rotate-45 aspect-square items-center justify-center" : "",
        kind === "pill" ? "rounded-full px-4 py-2" : "rounded-xl border",
        kind === "card" ? "rounded-lg" : "",
        isSelected ? "ring-2 ring-primary shadow-lg" : "",
        isConnecting ? "ring-2 ring-emerald-500 animate-pulse" : "",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        minHeight: kind === "pill" ? undefined : node.h,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onSelect}
    >
      <div className={cn("flex w-full flex-col h-full", kind === "diamond" ? "-rotate-45" : "")}>
        {/* Node Header Controls */}
        <div className="flex items-center justify-between pb-1 gap-1 text-xs opacity-75 hover:opacity-100">
          <div className="flex items-center gap-1.5 min-w-0">
            {SymbolIcon && <SymbolIcon className="size-3.5 shrink-0" />}
            {kind === "rectangle" && (
              <button
                type="button"
                onClick={() => onChange({ status: node.status === "done" ? "todo" : "done" })}
                className={cn(
                  "size-3.5 rounded-sm border flex items-center justify-center text-[9px]",
                  node.status === "done" ? "bg-primary text-primary-foreground border-primary" : "border-current",
                )}
              >
                {node.status === "done" && "✓"}
              </button>
            )}
            <span className="truncate text-[10px] uppercase font-semibold tracking-wider opacity-60">
              {kind === "symbol" ? (node.symbol || "Symbol") : kind}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Join / Connect Anchor Button */}
            <button
              type="button"
              onClick={onConnect}
              title="Join / Connect to another part"
              className={cn(
                "rounded-full p-1 transition-colors",
                isConnecting ? "bg-emerald-500 text-white" : "hover:bg-foreground/10",
              )}
            >
              <ArrowRight className="size-3" />
            </button>

            <button
              type="button"
              onClick={onRemove}
              className="rounded-full p-1 hover:bg-destructive/20 hover:text-destructive"
              title="Remove"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>

        {/* Text Area / Content */}
        <textarea
          ref={textRef}
          value={node.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder={
            kind === "circle"
              ? "Milestone name…"
              : kind === "diamond"
                ? "Key decision…"
                : "Plan thought, step, or insight…"
          }
          className={cn(
            "w-full flex-1 resize-none bg-transparent text-sm leading-snug outline-none placeholder:opacity-40",
            kind === "circle" || kind === "diamond" ? "text-center" : "",
            node.status === "done" ? "line-through opacity-60" : "",
          )}
        />
      </div>
    </div>
  );
}

function ShapeSpawnBtn({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: typeof Square;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onClick}
      className="h-8 gap-1.5 px-2 text-xs font-normal"
      title={`Add ${label}`}
    >
      <Icon className="size-3.5" />
      <span className="hidden md:inline">{label}</span>
    </Button>
  );
}

function DrawToolBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
