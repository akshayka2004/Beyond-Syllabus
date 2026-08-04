"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MindMapNode,
  QuizQuestion,
  Flashcard,
} from "@/ai/flows/generate-interactive";
import {
  Check,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Timer,
  AlertTriangle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

export interface ConceptContext {
  sources: string;
  subjectName?: string;
  model?: string;
}

/** Pinch/scroll to zoom, drag the background to pan. Clicking a node still works. */
function ZoomPan({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(0.9);
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const zoom = (f: number) => setScale((s) => clamp(+(s * f).toFixed(2), 0.3, 2.5));
  const reset = () => {
    setScale(0.9);
    setPos({ x: 24, y: 24 });
  };

  // Native wheel listener so we can preventDefault (React's is passive).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(+(s * (e.deltaY < 0 ? 1.1 : 0.9)).toFixed(2), 0.3, 2.5));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return; // let node clicks through
    drag.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({
      x: drag.current.px + (e.clientX - drag.current.sx),
      y: drag.current.py + (e.clientY - drag.current.sy),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/[0.04] to-transparent">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
        <button onClick={() => zoom(1.2)} className="rounded p-1 hover:bg-muted" aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={() => zoom(0.83)} className="rounded p-1 hover:bg-muted" aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={reset} className="rounded p-1 hover:bg-muted" aria-label="Reset view">
          <Maximize2 className="h-4 w-4" />
        </button>
        <span className="px-1 text-[11px] tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
      </div>
      <div
        ref={wrapRef}
        className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* --------------------- Interactive Concept Graph --------------------- */

interface GraphNode {
  id: string;
  title: string;
  children: GraphNode[];
  expanded: boolean;
  loading: boolean;
  summary?: string;
  explored: boolean; // whether we've fetched AI children for it
}

let nid = 0;
function toGraph(node: MindMapNode): GraphNode {
  return {
    id: `n${nid++}`,
    title: node.title,
    children: (node.children || []).map(toGraph),
    expanded: true,
    loading: false,
    explored: (node.children || []).length > 0,
  };
}

export function MindMapView({
  node,
  context,
}: {
  node: MindMapNode;
  context?: ConceptContext;
}) {
  const [root, setRoot] = useState<GraphNode>(() => toGraph(node));
  const [active, setActive] = useState<string | null>(null);

  const update = (id: string, fn: (n: GraphNode) => GraphNode) => {
    const walk = (n: GraphNode): GraphNode =>
      n.id === id ? fn(n) : { ...n, children: n.children.map(walk) };
    setRoot((r) => walk(r));
  };

  const onNode = async (n: GraphNode) => {
    setActive(n.id);
    // If it already has children, just toggle expand/collapse.
    if (n.children.length > 0) {
      update(n.id, (x) => ({ ...x, expanded: !x.expanded }));
      return;
    }
    // Otherwise explore it with AI (once).
    if (n.explored || !context?.sources) return;
    update(n.id, (x) => ({ ...x, loading: true }));
    const { expandConcept } = await import("@/ai/flows/expand-concept");
    const res = await expandConcept({
      concept: n.title,
      sources: context.sources,
      subjectName: context.subjectName,
      model: context.model,
    });
    update(n.id, (x) => ({
      ...x,
      loading: false,
      explored: true,
      expanded: true,
      summary: res.summary,
      children: (res.children || []).map((title) => ({
        id: `n${nid++}`,
        title,
        children: [],
        expanded: false,
        loading: false,
        explored: false,
      })),
    }));
  };

  return (
    <div className="flex h-full flex-col">
      <p className="shrink-0 px-1 pb-2 text-xs text-muted-foreground">
        Tap a node to reveal branches · scroll to zoom · drag the background to pan
      </p>
      <div className="min-h-0 flex-1">
        <ZoomPan>
          <div className="flex min-w-max items-center p-6">
            <FlowNode
              node={root}
              depth={0}
              active={active}
              onNode={onNode}
              canExplore={!!context?.sources}
            />
          </div>
        </ZoomPan>
      </div>
    </div>
  );
}

/**
 * Horizontal tree flow: root on the left, branches fan out to the right,
 * connected by elbow lines. Each node is a card; clicking reveals its branches.
 */
function FlowNode({
  node,
  depth,
  active,
  onNode,
  canExplore,
}: {
  node: GraphNode;
  depth: number;
  active: string | null;
  onNode: (n: GraphNode) => void;
  canExplore: boolean;
}) {
  const hasKids = node.children.length > 0;
  const isLeaf = !hasKids;
  const showKids = hasKids && node.expanded;

  return (
    <div className="flex items-center">
      {/* the node itself */}
      <div className="flex flex-col items-start">
        <button
          onClick={() => onNode(node)}
          className={cn(
            "relative flex max-w-[220px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-left text-sm shadow-sm transition",
            "hover:-translate-y-0.5 hover:shadow-md",
            depth === 0
              ? "bg-primary font-bold text-primary-foreground"
              : depth === 1
                ? "border border-primary/40 bg-primary/10 font-semibold text-primary"
                : "border border-border bg-card",
            active === node.id && "ring-2 ring-primary/60"
          )}
        >
          {node.loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
          <span className="leading-snug">{node.title}</span>
          {hasKids && (
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform",
                node.expanded && "rotate-180"
              )}
            />
          )}
          {isLeaf && canExplore && !node.explored && !node.loading && (
            <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
              explore
            </span>
          )}
        </button>
        {node.summary && active === node.id && (
          <p className="mt-1 max-w-[220px] text-[11px] italic text-muted-foreground">
            {node.summary}
          </p>
        )}
      </div>

      {showKids && (
        <div className="flex items-center">
          {/* horizontal stub out of the parent */}
          <span className="h-px w-5 bg-primary/30" />
          {/* children column, joined by a vertical spine */}
          <div className="flex flex-col gap-3 border-l border-primary/25">
            {node.children.map((c) => (
              <div key={c.id} className="flex items-center">
                <span className="h-px w-4 bg-primary/25" />
                <FlowNode
                  node={c}
                  depth={depth + 1}
                  active={active}
                  onNode={onNode}
                  canExplore={canExplore}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Quiz -------------------------------- */

export function QuizView({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const complete = answered === questions.length;
  const score = questions.reduce(
    (n, q, i) => (answers[i] === q.answerIndex ? n + 1 : n),
    0
  );

  // Countdown timer: 45s per question, freezes when all answered.
  const total = questions.length * 45;
  const [left, setLeft] = useState(total);
  useEffect(() => {
    if (complete || left <= 0) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [complete, left]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  // Weak topics = topics of the questions answered incorrectly.
  const weakTopics = Array.from(
    new Set(
      questions
        .filter((q, i) => answers[i] !== undefined && answers[i] !== q.answerIndex)
        .map((q) => q.topic)
        .filter(Boolean) as string[]
    )
  );

  return (
    <div className="space-y-5">
      {!complete && (
        <div
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium",
            left <= 30 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          )}
        >
          <Timer className="h-4 w-4" /> {mm}:{ss}
        </div>
      )}
      {complete && (
        <div className="space-y-2">
          <div className="rounded-lg bg-primary/10 px-4 py-2 text-center text-sm font-semibold text-primary">
            Score: {score} / {questions.length}
          </div>
          {weakTopics.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" /> Weak topics to review
              </div>
              <div className="flex flex-wrap gap-1.5">
                {weakTopics.map((t) => (
                  <span key={t} className="rounded-full bg-amber-500/20 px-2 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {questions.map((q, i) => {
        const chosen = answers[i];
        const done = chosen !== undefined;
        return (
          <div key={i}>
            <p className="mb-2 text-sm font-medium">
              {i + 1}. {q.question}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => {
                const isCorrect = oi === q.answerIndex;
                const isChosen = oi === chosen;
                return (
                  <button
                    key={oi}
                    disabled={done}
                    onClick={() => setAnswers((p) => ({ ...p, [i]: oi }))}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                      !done && "border-border hover:border-primary/50 hover:bg-muted/50",
                      done && isCorrect && "border-emerald-500 bg-emerald-500/10",
                      done && isChosen && !isCorrect && "border-destructive bg-destructive/10",
                      done && !isCorrect && !isChosen && "border-border opacity-60"
                    )}
                  >
                    <span className="flex-1">{opt}</span>
                    {done && isCorrect && <Check className="h-4 w-4 text-emerald-600" />}
                    {done && isChosen && !isCorrect && <X className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {done && q.explanation && (
              <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Flashcards ----------------------------- */

export function FlashcardsView({ cards }: { cards: Flashcard[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [marks, setMarks] = useState<Record<number, "known" | "unknown">>({});
  const card = cards[i];

  const known = Object.values(marks).filter((m) => m === "known").length;
  const unknown = Object.values(marks).filter((m) => m === "unknown").length;
  const reviewed = known + unknown;
  const done = reviewed === cards.length;

  const advance = () => {
    setFlipped(false);
    setI((prev) => Math.min(prev + 1, cards.length - 1));
  };

  const mark = (m: "known" | "unknown") => {
    setMarks((prev) => ({ ...prev, [i]: m }));
    if (i < cards.length - 1) advance();
  };

  const restart = () => {
    setI(0);
    setFlipped(false);
    setMarks({});
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="text-2xl font-bold text-primary">
          {known} / {cards.length} known
        </div>
        <p className="text-sm text-muted-foreground">
          {unknown > 0
            ? `${unknown} card${unknown > 1 ? "s" : ""} to revisit. Run it again to lock them in.`
            : "You knew them all. Nice."}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={restart}>
          <RotateCcw className="h-3.5 w-3.5" /> Restart deck
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
        <span>
          Card {i + 1} / {cards.length}
        </span>
        <span className="flex gap-3">
          <span className="text-emerald-600 dark:text-emerald-400">Known {known}</span>
          <span className="text-amber-600 dark:text-amber-400">Review {unknown}</span>
        </span>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center transition hover:border-primary/50"
      >
        <span className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          {flipped ? "Answer" : "Term"} · tap to flip
        </span>
        <span className={cn("text-base", flipped ? "font-normal" : "font-semibold")}>
          {flipped ? card.back : card.front}
        </span>
      </button>

      <div className="flex w-full items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 border-amber-500/50 text-xs text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
          onClick={() => mark("unknown")}
        >
          <X className="h-3.5 w-3.5" /> Don&apos;t know
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 border-emerald-500/50 text-xs text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
          onClick={() => mark("known")}
        >
          <Check className="h-3.5 w-3.5" /> I know this
        </Button>
      </div>

      <div className="flex w-full items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => { setFlipped(false); setI((p) => Math.max(0, p - 1)); }} disabled={i === 0}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={restart}>
          <RotateCcw className="h-3.5 w-3.5" /> Restart
        </Button>
        <Button variant="ghost" size="sm" onClick={advance} disabled={i === cards.length - 1}>
          Skip <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
