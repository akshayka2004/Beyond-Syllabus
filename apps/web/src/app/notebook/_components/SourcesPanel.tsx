"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotebookSource } from "@/lib/notebook";
import { AddSourcesDialog } from "./AddSourcesDialog";
import {
  FileText,
  Plus,
  Trash2,
  BookOpen,
  CheckSquare,
  Square,
  Globe,
  Music,
  StickyNote,
} from "lucide-react";

interface Props {
  sources: NotebookSource[];
  onChange: (next: NotebookSource[]) => void;
  onViewSource: (id: string) => void;
}

const KIND_ICON: Record<NotebookSource["kind"], typeof FileText> = {
  module: BookOpen,
  custom: StickyNote,
  file: FileText,
  url: Globe,
  audio: Music,
};

const KIND_LABEL: Record<NotebookSource["kind"], string> = {
  module: "Module",
  custom: "Note",
  file: "File",
  url: "Web",
  audio: "Audio",
};

export function SourcesPanel({ sources, onChange, onViewSource }: Props) {
  const [adding, setAdding] = useState(false);

  const activeCount = sources.filter((s) => s.active).length;
  const allActive = sources.length > 0 && activeCount === sources.length;

  const toggle = (id: string) =>
    onChange(sources.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));

  const toggleAll = () =>
    onChange(sources.map((s) => ({ ...s, active: !allActive })));

  const remove = (id: string) => onChange(sources.filter((s) => s.id !== id));

  const addSource = (src: NotebookSource) => onChange([...sources, src]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Sources</h2>
          <span className="text-xs text-muted-foreground">
            {activeCount}/{sources.length}
          </span>
        </div>
        <Button
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {sources.length > 0 && (
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {allActive ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          Select all sources
        </button>
      )}

      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {sources.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center text-muted-foreground">
            <FileText className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-xs">No sources yet.</p>
            <Button size="sm" className="mt-3 text-xs" onClick={() => setAdding(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add a source
            </Button>
          </div>
        )}

        {sources.map((s) => {
          const Icon = KIND_ICON[s.kind];
          return (
            <div
              key={s.id}
              className={cn(
                "group rounded-lg border p-2.5 transition-colors",
                s.active
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => toggle(s.id)}
                  className="mt-0.5 shrink-0"
                  aria-label={s.active ? "Deactivate source" : "Activate source"}
                >
                  {s.active ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => onViewSource(s.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <p className="truncate text-xs font-medium">{s.title}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {s.content.slice(0, 140) || "Empty"}
                  </p>
                  <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {KIND_LABEL[s.kind]}
                  </span>
                </button>
                {s.kind !== "module" && (
                  <button
                    onClick={() => remove(s.id)}
                    className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                    aria-label="Remove source"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddSourcesDialog open={adding} onOpenChange={setAdding} onAdd={addSource} />
    </div>
  );
}
