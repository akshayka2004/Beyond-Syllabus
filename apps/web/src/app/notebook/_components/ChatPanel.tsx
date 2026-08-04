"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, Copy, Check, BookmarkPlus, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { Streamdown } from "streamdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Message } from "@/lib/types";
import { NotebookSource, buildPassages, Passage } from "@/lib/notebook";
import { chatGrounded } from "@/ai/flows/chat-grounded";

interface Props {
  sources: NotebookSource[];
  subjectName: string;
  model: string;
  onSaveNote: (title: string, markdown: string) => void;
  onViewSource: (id: string) => void;
}

interface UiMessage extends Message {
  /** The exact passages this reply cited (passage-level citations). */
  citedPassages?: Passage[];
}

const STARTERS = [
  "Give me an overview of these sources",
  "What are the key concepts I must understand?",
  "Quiz me on this material",
  "Explain the hardest part in simple terms",
];

export function ChatPanel({
  sources,
  subjectName,
  model,
  onSaveNote,
  onViewSource,
}: Props) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [passageView, setPassageView] = useState<Passage | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const activeSources = sources.filter((s) => s.active && s.content.trim());
  const hasSources = activeSources.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;

    const userMsg: UiMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const passages = buildPassages(sources);
      const history: Message[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const result = await chatGrounded({
        history,
        message,
        model,
        subjectName: subjectName || undefined,
        passages: passages.map((p) => ({
          n: p.n,
          sourceTitle: p.sourceTitle,
          text: p.text,
        })),
      });
      const cited = result.citations
        .map((n) => passages.find((p) => p.n === n))
        .filter(Boolean) as Passage[];
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.response,
          citedPassages: cited,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Chat</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {hasSources
            ? `Grounded in ${activeSources.length} source${
                activeSources.length > 1 ? "s" : ""
              }`
            : "No active sources"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
            <div className="mb-3 rounded-2xl bg-primary/10 p-3">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">
              {subjectName || "Your notebook"}
            </h3>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              Ask anything about your sources. Answers stay grounded in the
              material you selected on the left.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  disabled={!hasSources || loading}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
            {!hasSources && (
              <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
                Activate at least one source to start chatting.
              </p>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                onSaveNote={onSaveNote}
                onViewPassage={setPassageView}
              />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bot className="h-5 w-5 text-primary" />
                <span className="inline-flex gap-1">
                  <Dot /> <Dot delay={150} /> <Dot delay={300} />
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 sm:p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={
              hasSources ? "Ask about your sources…" : "Activate a source first…"
            }
            disabled={loading}
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            disabled={loading || !input.trim()}
            onClick={() => send(input)}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={!!passageView} onOpenChange={(o) => !o && setPassageView(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {passageView?.n}
              </span>
              <span className="truncate">{passageView?.sourceTitle}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
            {passageView?.text}
          </div>
          {passageView && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                onViewSource(passageView.sourceId);
                setPassageView(null);
              }}
            >
              Open full source
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageBubble({
  message,
  onSaveNote,
  onViewPassage,
}: {
  message: UiMessage;
  onSaveNote: (title: string, markdown: string) => void;
  onViewPassage: (p: Passage) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  const copy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex gap-3">
      <div className="mt-1 h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="prose prose-sm dark:prose-invert max-w-none break-words text-sm">
          <Streamdown>{message.content}</Streamdown>
        </div>

        {message.citedPassages && message.citedPassages.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Citations
            </p>
            <div className="flex flex-wrap gap-1.5">
              {message.citedPassages.map((p) => (
                <button
                  key={p.n}
                  onClick={() => onViewPassage(p)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                  title={`Passage ${p.n} · ${p.sourceTitle}`}
                >
                  <span className="font-semibold text-primary">{p.n}</span>
                  <span className="max-w-[140px] truncate">{p.sourceTitle}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-1.5 flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => {
              onSaveNote("Saved from chat", message.content);
              toast.success("Saved to notes");
            }}
          >
            <BookmarkPlus className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
