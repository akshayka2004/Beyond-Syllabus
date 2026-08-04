"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotebookSource } from "@/lib/notebook";
import { FileText, Globe, Music, BookOpen, StickyNote } from "lucide-react";

const KIND_META: Record<
  NotebookSource["kind"],
  { label: string; Icon: typeof FileText }
> = {
  module: { label: "Syllabus module", Icon: BookOpen },
  custom: { label: "Pasted text", Icon: StickyNote },
  file: { label: "Uploaded file", Icon: FileText },
  url: { label: "Website", Icon: Globe },
  audio: { label: "Audio transcript", Icon: Music },
};

export function SourceViewer({
  source,
  onClose,
}: {
  source: NotebookSource | null;
  onClose: () => void;
}) {
  const meta = source ? KIND_META[source.kind] : null;
  return (
    <Dialog open={!!source} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            {meta && <meta.Icon className="h-4 w-4 shrink-0 text-primary" />}
            <span className="truncate">{source?.title}</span>
          </DialogTitle>
          {meta && (
            <span className="text-xs text-muted-foreground">{meta.label}</span>
          )}
        </DialogHeader>
        <div className="overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
          {source?.content || "This source is empty."}
        </div>
      </DialogContent>
    </Dialog>
  );
}
