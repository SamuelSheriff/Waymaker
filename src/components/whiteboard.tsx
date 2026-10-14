import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowUpRight, Eraser, Highlighter, PenLine, StickyNote, Trash2, Undo2 } from "lucide-react";
import type { Board, DrawTool, Sticky, StickyTone, Stroke, StrokePoint } from "@/lib/types";
import { clamp, nid } from "@/lib/utils";
import { useGoalStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
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

const PEN_COLORS = [
  { id: "paper", value: "#e7e1d4" },
  { id: "sage", value: "#8aa58c" },
  { id: "stone", value: "#9c9890" },
] as const;

const SIZES: Record<DrawTool, number> = {
  pen: 2.4,
  line: 2.2,
  highlighter: 14,
  eraser: 18,
};

function dist(a: StrokePoint, b: StrokePoint) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
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
    ctx.globalAlpha = 0.28;
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
  const dpr = canvas.clientWidth > 0 ? canvas.width / canvas.clientWidth : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  for (const s of strokes) drawStroke(ctx, s);
  if (live) drawStroke(ctx, live);
}

const TONE_CLASS: Record<StickyTone, string> = {
  paper: "bg-paper text-paper-foreground",
  sage: "bg-sage text-sage-foreground",
  ink: "bg-ink text-foreground border border-border",
};

export function Whiteboard({ board }: { board: Board }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<Stroke | null>(null);
  const drawing = useRef(false);
  const addStroke = useGoalStore((s) => s.addStroke);
  const setBoardStrokes = useGoalStore((s) => s.setBoardStrokes);
  const addSticky = useGoalStore((s) => s.addSticky);
  const updateSticky = useGoalStore((s) => s.updateSticky);
  const removeSticky = useGoalStore((s) => s.removeSticky);
  const clearBoard = useGoalStore((s) => s.clearBoard);

  const [tool, setTool] = useState<DrawTool | "sticky">("pen");
  const [color, setColor] = useState<string>(PEN_COLORS[0].value);
  const [stickyTone, setStickyTone] = useState<StickyTone>("paper");
  const [live, setLive] = useState<Stroke | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const strokes = board.strokes;
  const stickies = board.stickies;

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (strokes.length === 0) return;
        setBoardStrokes(board.id, strokes.slice(0, -1));
        return;
      }
      if (e.key === "p" || e.key === "P") setTool("pen");
      if (e.key === "a" || e.key === "A") setTool("line");
      if (e.key === "h" || e.key === "H") setTool("highlighter");
      if (e.key === "e" || e.key === "E") setTool("eraser");
      if (e.key === "n" || e.key === "N") setTool("sticky");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [board.id, setBoardStrokes, strokes]);

  function localPoint(e: PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (tool === "sticky") {
      const p = localPoint(e);
      const wrap = wrapRef.current;
      const w = 168;
      const h = 96;
      const maxX = Math.max(8, (wrap?.clientWidth ?? 400) - w - 8);
      const maxY = Math.max(8, (wrap?.clientHeight ?? 400) - h - 8);
      const id = addSticky(board.id, {
        x: clamp(p.x - 80, 8, maxX),
        y: clamp(p.y - 40, 8, maxY),
        w,
        h,
        text: "",
        tone: stickyTone,
      });
      setFocusId(id);
      return;
    }
    drawing.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = localPoint(e);
    const stroke: Stroke = {
      id: nid(),
      tool,
      color,
      size: SIZES[tool],
      points: [p],
    };
    liveRef.current = stroke;
    setLive(stroke);
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !liveRef.current) return;
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

  function undo() {
    if (strokes.length === 0) return;
    setBoardStrokes(board.id, strokes.slice(0, -1));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={wrapRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-ink touch-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--color-foreground) 8%, transparent) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      >
        <canvas
          ref={canvasRef}
          className={cn("absolute inset-0 size-full", tool === "sticky" ? "cursor-copy" : "cursor-crosshair")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {stickies.map((s) => (
          <StickyCard
            key={s.id}
            sticky={s}
            autoFocus={focusId === s.id}
            boundsRef={wrapRef}
            onChange={(patch) => updateSticky(board.id, s.id, patch)}
            onRemove={() => removeSticky(board.id, s.id)}
          />
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-border bg-card px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} label="Pen">
          <PenLine />
        </ToolBtn>
        <ToolBtn active={tool === "line"} onClick={() => setTool("line")} label="Arrow">
          <ArrowUpRight />
        </ToolBtn>
        <ToolBtn active={tool === "highlighter"} onClick={() => setTool("highlighter")} label="Highlighter">
          <Highlighter />
        </ToolBtn>
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} label="Eraser">
          <Eraser />
        </ToolBtn>
        <ToolBtn active={tool === "sticky"} onClick={() => setTool("sticky")} label="Note">
          <StickyNote />
        </ToolBtn>
        <div className="mx-1 h-6 w-px shrink-0 bg-border" />
        {tool === "sticky"
          ? (["paper", "sage", "ink"] as StickyTone[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-label={t}
                onClick={() => setStickyTone(t)}
                className={cn(
                  "size-7 shrink-0 rounded-full border",
                  t === "paper" && "bg-paper",
                  t === "sage" && "bg-sage",
                  t === "ink" && "bg-ink",
                  stickyTone === t ? "border-primary" : "border-border",
                )}
              />
            ))
          : PEN_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.id}
                onClick={() => setColor(c.value)}
                className={cn(
                  "size-7 shrink-0 rounded-full border",
                  color === c.value ? "border-primary" : "border-border",
                )}
                style={{ background: c.value }}
              />
            ))}
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" size="icon-sm" variant="ghost" onClick={undo} aria-label="Undo">
            <Undo2 />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => setConfirmClear(true)}
            aria-label="Clear drawing"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this board?</AlertDialogTitle>
            <AlertDialogDescription>
              Drawings will be removed. Notes on the Ideas board stay; notes on other boards go with the ink.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
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

function ToolBtn({
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
        "flex size-11 shrink-0 items-center justify-center rounded-sm transition-colors duration-150 [&_svg]:size-4",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

function StickyCard({
  sticky,
  autoFocus,
  boundsRef,
  onChange,
  onRemove,
}: {
  sticky: Sticky;
  autoFocus?: boolean;
  boundsRef: { current: HTMLDivElement | null };
  onChange: (patch: Partial<Sticky>) => void;
  onRemove: () => void;
}) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const pos = useRef({ x: sticky.x, y: sticky.y });
  const elRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    pos.current = { x: sticky.x, y: sticky.y };
  }, [sticky.x, sticky.y]);

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  function clampToBoard(x: number, y: number) {
    const wrap = boundsRef.current;
    const el = elRef.current;
    const w = el?.offsetWidth ?? sticky.w;
    const h = el?.offsetHeight ?? sticky.h;
    const maxX = Math.max(0, (wrap?.clientWidth ?? 400) - w);
    const maxY = Math.max(0, (wrap?.clientHeight ?? 400) - h);
    return { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
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

  return (
    <div
      ref={elRef}
      data-sticky
      className={cn("absolute z-10 flex flex-col rounded-md p-2 shadow-card", TONE_CLASS[sticky.tone])}
      style={{ left: sticky.x, top: sticky.y, width: sticky.w, minHeight: sticky.h }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="h-1 w-8 rounded-full bg-current opacity-20" />
        <button
          type="button"
          onClick={onRemove}
          className="text-xs opacity-50 hover:opacity-100"
          aria-label="Remove note"
        >
          ×
        </button>
      </div>
      <textarea
        ref={textRef}
        value={sticky.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="A step, a why, a constraint…"
        className="h-full min-h-16 w-full resize-none bg-transparent text-sm leading-snug outline-none placeholder:opacity-40"
      />
    </div>
  );
}
