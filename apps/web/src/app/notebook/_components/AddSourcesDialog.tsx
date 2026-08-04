"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotebookSource, uid } from "@/lib/notebook";
import {
  UploadCloud,
  Link2,
  ClipboardType,
  FileText,
  Music,
  Globe,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (source: NotebookSource) => void;
}

interface Job {
  id: string;
  name: string;
  status: "loading" | "done" | "error";
  message?: string;
}

const ACCEPT =
  ".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.rtf,.mp3,.wav,.m4a,.mp4,.ogg,.webm,.flac,audio/*,text/*,application/pdf";

export function AddSourcesDialog({ open, onOpenChange, onAdd }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteBody, setPasteBody] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const setJob = (id: string, patch: Partial<Job>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const ingestFile = async (file: File) => {
    const jobId = uid("job");
    setJobs((prev) => [
      ...prev,
      { id: jobId, name: file.name, status: "loading" },
    ]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onAdd({
        id: uid("src"),
        title: data.title || file.name,
        content: data.content,
        kind: data.kind || "file",
        active: true,
      });
      setJob(jobId, { status: "done" });
    } catch (e) {
      setJob(jobId, {
        status: "error",
        message: e instanceof Error ? e.message : "Failed",
      });
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(ingestFile);
  };

  const addUrl = async () => {
    if (!url.trim() || urlBusy) return;
    setUrlBusy(true);
    const jobId = uid("job");
    setJobs((prev) => [...prev, { id: jobId, name: url, status: "loading" }]);
    try {
      const fd = new FormData();
      fd.append("url", url.trim());
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onAdd({
        id: uid("src"),
        title: data.title || url,
        content: data.content,
        kind: "url",
        active: true,
      });
      setJob(jobId, { status: "done" });
      setUrl("");
    } catch (e) {
      setJob(jobId, {
        status: "error",
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setUrlBusy(false);
    }
  };

  const addPaste = () => {
    if (!pasteBody.trim()) return;
    onAdd({
      id: uid("src"),
      title: pasteTitle.trim() || "Pasted text",
      content: pasteBody.trim(),
      kind: "custom",
      active: true,
    });
    setPasteTitle("");
    setPasteBody("");
    setJobs((prev) => [
      ...prev,
      { id: uid("job"), name: pasteTitle.trim() || "Pasted text", status: "done" },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add sources</DialogTitle>
          <DialogDescription>
            Sources let the notebook ground its answers on what matters most to
            you. Add PDFs, documents, audio, websites, or pasted text.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInput.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <UploadCloud className="mb-2 h-8 w-8 text-primary" />
          <p className="text-sm font-medium">
            Drag &amp; drop files, or <span className="text-primary">browse</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF · DOCX · TXT · Markdown · CSV · audio (mp3, wav, m4a…)
          </p>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>

        {/* URL + Paste */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4 text-primary" /> Website or YouTube URL
            </div>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUrl()}
                placeholder="Website or youtube.com/watch?v=…"
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <Button size="sm" className="h-8 text-xs" onClick={addUrl} disabled={urlBusy}>
                {urlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ClipboardType className="h-4 w-4 text-primary" /> Paste text
            </div>
            <input
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Title (optional)"
              className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
              value={pasteBody}
              onChange={(e) => setPasteBody(e.target.value)}
              placeholder="Paste notes or text…"
              rows={2}
              className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" className="mt-2 h-8 w-full text-xs" onClick={addPaste}>
              Add text
            </Button>
          </div>
        </div>

        {/* Job list */}
        {jobs.length > 0 && (
          <div className="space-y-1.5">
            {jobs.map((j) => (
              <div
                key={j.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
              >
                <JobIcon name={j.name} status={j.status} />
                <span className="min-w-0 flex-1 truncate">{j.name}</span>
                {j.status === "loading" && (
                  <span className="text-muted-foreground">Processing…</span>
                )}
                {j.status === "done" && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Added
                  </span>
                )}
                {j.status === "error" && (
                  <span className="flex items-center gap-1 text-destructive" title={j.message}>
                    <AlertCircle className="h-3.5 w-3.5" /> {j.message || "Failed"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JobIcon({ name, status }: { name: string; status: Job["status"] }) {
  if (status === "loading")
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
  const lower = name.toLowerCase();
  if (/^https?:|\.com|\.org|www\./.test(lower))
    return <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (/\.(mp3|wav|m4a|mp4|ogg|webm|flac)$/.test(lower))
    return <Music className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
}
