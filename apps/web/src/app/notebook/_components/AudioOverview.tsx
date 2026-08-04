"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotebookSource, buildSourceContext } from "@/lib/notebook";
import {
  generateAudioOverview,
  AudioFormat,
  AudioTurn,
} from "@/ai/flows/generate-audio-overview";
import {
  Headphones,
  Loader2,
  Play,
  Pause,
  ChevronDown,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";

const FORMATS: { id: AudioFormat; label: string; desc: string }[] = [
  { id: "deep-dive", label: "Deep Dive", desc: "Two hosts unpack it all" },
  { id: "brief", label: "The Brief", desc: "Just the essentials, fast" },
  { id: "critique", label: "The Critique", desc: "What's strong, what's thin" },
  { id: "debate", label: "The Debate", desc: "Two sides argue it out" },
];

interface Props {
  sources: NotebookSource[];
  subjectName: string;
  model: string;
}

export function AudioOverview({ sources, subjectName, model }: Props) {
  const [status, setStatus] = useState<"idle" | "scripting" | "ready">("idle");
  const [title, setTitle] = useState("");
  const [turns, setTurns] = useState<AudioTurn[]>([]);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(-1);

  const voicesRef = useRef<{ a?: SpeechSynthesisVoice; b?: SpeechSynthesisVoice }>({});
  const stopRef = useRef(false);
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const activeCount = sources.filter((s) => s.active && s.content.trim()).length;
  const hasSources = activeCount > 0;

  // Pick two distinct voices for the two hosts.
  useEffect(() => {
    if (!supported) return;
    const pick = () => {
      const all = window.speechSynthesis.getVoices();
      if (!all.length) return;
      const en = all.filter((v) => /^en/i.test(v.lang));
      const pool = en.length ? en : all;
      const female = pool.find((v) => /female|zira|samantha|aria|jenny|eva|susan/i.test(v.name));
      const male = pool.find((v) => /male|david|daniel|george|mark|guy|alex/i.test(v.name));
      const a = female || pool[0];
      const b = male || pool.find((v) => v.name !== a?.name) || pool[1] || a;
      voicesRef.current = { a, b };
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const generate = async (format: AudioFormat) => {
    if (!hasSources) return;
    stop();
    setStatus("scripting");
    setTurns([]);
    setCurrent(-1);
    try {
      const res = await generateAudioOverview({
        sources: buildSourceContext(sources),
        subjectName,
        format,
        model,
      });
      setTitle(res.title);
      setTurns(res.turns);
      setStatus("ready");
    } catch {
      toast.error("Couldn't generate the overview");
      setStatus("idle");
    }
  };

  const speakTurn = (turn: AudioTurn) =>
    new Promise<void>((resolve) => {
      if (!supported) return resolve();
      const u = new SpeechSynthesisUtterance(turn.text);
      const v = turn.speaker === "A" ? voicesRef.current.a : voicesRef.current.b;
      if (v) u.voice = v;
      // Distinguish the hosts even if the platform only has one voice.
      u.pitch = turn.speaker === "A" ? 1.1 : 0.9;
      u.rate = 1.02;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

  const playFrom = async (startIndex: number) => {
    if (!supported) return;
    stopRef.current = false;
    window.speechSynthesis.cancel();
    setPlaying(true);
    for (let i = startIndex; i < turns.length; i++) {
      if (stopRef.current) break;
      setCurrent(i);
      await speakTurn(turns[i]);
    }
    setPlaying(false);
    if (!stopRef.current) setCurrent(-1);
  };

  const stop = () => {
    stopRef.current = true;
    if (supported) window.speechSynthesis.cancel();
    setPlaying(false);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Headphones className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Audio Overview</span>
      </div>

      {status === "idle" && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 flex-1 text-xs"
            disabled={!hasSources}
            onClick={() => generate("deep-dive")}
          >
            <Headphones className="mr-1.5 h-4 w-4" /> Generate
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={!hasSources}>
                Format <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {FORMATS.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => generate(f.id)} className="flex-col items-start">
                  <span className="text-sm font-medium">{f.label}</span>
                  <span className="text-xs text-muted-foreground">{f.desc}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {status === "scripting" && (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Writing the script…
        </div>
      )}

      {status === "ready" && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!supported}
              onClick={() => (playing ? stop() : playFrom(current < 0 ? 0 : current))}
            >
              {playing ? (
                <>
                  <Pause className="mr-1.5 h-4 w-4" /> Stop
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-4 w-4" /> Play
                </>
              )}
            </Button>
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
            <button
              className="ml-auto text-xs text-primary underline"
              onClick={() => {
                stop();
                setStatus("idle");
              }}
            >
              New
            </button>
          </div>

          {!supported && (
            <div className="mb-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This browser can&apos;t play speech. The transcript is below.
            </div>
          )}

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {turns.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs transition",
                  current === i ? "bg-primary/15 ring-1 ring-primary/40" : "bg-card"
                )}
              >
                <span
                  className={cn(
                    "mr-1.5 font-semibold",
                    t.speaker === "A" ? "text-primary" : "text-accent-foreground"
                  )}
                >
                  {t.speaker === "A" ? "Maya" : "Leo"}
                  {current === i && playing && (
                    <Volume2 className="ml-1 inline h-3 w-3 animate-pulse" />
                  )}
                  :
                </span>
                <span className="text-foreground/90">{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasSources && status === "idle" && (
        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
          Activate a source to generate audio.
        </p>
      )}
    </div>
  );
}
