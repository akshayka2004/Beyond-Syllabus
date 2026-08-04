"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Streamdown } from "streamdown";
import { toast } from "react-hot-toast";
import {
  BookText,
  HelpCircle,
  ListOrdered,
  FileText,
  Loader2,
  Trash2,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
  StickyNote,
  Plus,
  Network,
  ListChecks,
  Layers,
  Lightbulb,
  Globe2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotebookSource, NotebookNote, buildSourceContext } from "@/lib/notebook";
import {
  generateStudioArtifact,
  StudioArtifactKind,
} from "@/ai/flows/generate-studio";
import {
  generateInteractive,
  InteractiveKind,
} from "@/ai/flows/generate-interactive";
import {
  generateExamPaper,
  PaperType,
  ExamSpec,
} from "@/ai/flows/generate-exam-paper";
import { AudioOverview } from "./AudioOverview";
import { ExamSetupDialog } from "./ExamSetupDialog";
import type { WorkspaceTabInput } from "./WorkspaceArea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GraduationCap } from "lucide-react";

interface Props {
  sources: NotebookSource[];
  subjectName: string;
  model: string;
  notes: NotebookNote[];
  onOpenTab: (tab: WorkspaceTabInput) => void;
  onAddNote: (note: {
    title: string;
    markdown: string;
    origin: NotebookNote["origin"];
  }) => void;
  onDeleteNote: (id: string) => void;
}

type MdTool = { kind: StudioArtifactKind; label: string; icon: React.ReactNode };
type IxTool = { kind: InteractiveKind; label: string; icon: React.ReactNode };

const MD_TOOLS: MdTool[] = [
  { kind: "study-guide", label: "Study Guide", icon: <BookText className="h-4 w-4" /> },
  { kind: "briefing", label: "Briefing Doc", icon: <FileText className="h-4 w-4" /> },
  { kind: "faq", label: "FAQ", icon: <HelpCircle className="h-4 w-4" /> },
  { kind: "timeline", label: "Timeline", icon: <ListOrdered className="h-4 w-4" /> },
  { kind: "project-ideas", label: "Project Ideas", icon: <Lightbulb className="h-4 w-4" /> },
  { kind: "real-world", label: "Real-World Uses", icon: <Globe2 className="h-4 w-4" /> },
];

const IX_TOOLS: IxTool[] = [
  { kind: "mind-map", label: "Concept Map", icon: <Network className="h-4 w-4" /> },
  { kind: "quiz", label: "Practice Quiz", icon: <ListChecks className="h-4 w-4" /> },
  { kind: "flashcards", label: "Flashcards", icon: <Layers className="h-4 w-4" /> },
];

const MD_LABEL: Record<StudioArtifactKind, string> = {
  "study-guide": "Study Guide",
  faq: "FAQ",
  timeline: "Timeline",
  briefing: "Briefing Doc",
  "project-ideas": "Project Ideas",
  "real-world": "Real-World Applications",
};

const IX_LABEL: Record<InteractiveKind, string> = {
  "mind-map": "Concept Map",
  quiz: "Practice Quiz",
  flashcards: "Flashcards",
};

export function StudioPanel({
  sources,
  subjectName,
  model,
  notes,
  onOpenTab,
  onAddNote,
  onDeleteNote,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [examBusy, setExamBusy] = useState(false);
  const [examSetupOpen, setExamSetupOpen] = useState(false);

  const activeCount = sources.filter((s) => s.active && s.content.trim()).length;
  const hasSources = activeCount > 0;

  const generatePaper = async (opts: { type?: PaperType; spec?: ExamSpec }) => {
    if (!hasSources || examBusy) return;
    setExamBusy(true);
    try {
      const paper = await generateExamPaper({
        sources: buildSourceContext(sources),
        subjectName,
        model,
        ...opts,
      });
      if (paper.error) {
        toast.error(paper.error);
        return;
      }
      onOpenTab({ kind: "exam-paper", title: paper.courseName || "Exam Paper", paper });
    } catch {
      toast.error("Couldn't generate the paper");
    } finally {
      setExamBusy(false);
    }
  };

  const runExam = (type: PaperType) => generatePaper({ type });

  const runMd = async (kind: StudioArtifactKind) => {
    if (!hasSources || busy) return;
    setBusy(kind);
    try {
      const { markdown } = await generateStudioArtifact({
        kind,
        sources: buildSourceContext(sources),
        subjectName,
        model,
      });
      onOpenTab({ kind: "artifact", title: MD_LABEL[kind], markdown });
    } catch {
      toast.error("Generation failed");
    } finally {
      setBusy(null);
    }
  };

  const runIx = async (kind: InteractiveKind) => {
    if (!hasSources || busy) return;
    setBusy(kind);
    try {
      const res = await generateInteractive({
        kind,
        sources: buildSourceContext(sources),
        subjectName,
        model,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (kind === "mind-map" && res.mindMap)
        onOpenTab({
          kind: "concept-map",
          title: IX_LABEL[kind],
          mindMap: res.mindMap,
          context: { sources: buildSourceContext(sources), subjectName, model },
        });
      else if (kind === "quiz" && res.quiz)
        onOpenTab({ kind: "quiz", title: IX_LABEL[kind], quiz: res.quiz });
      else if (kind === "flashcards" && res.flashcards)
        onOpenTab({ kind: "flashcards", title: IX_LABEL[kind], flashcards: res.flashcards });
    } catch {
      toast.error("Generation failed");
    } finally {
      setBusy(null);
    }
  };

  const addBlankNote = () => {
    const markdown = window.prompt("Write a quick note (markdown ok):");
    if (markdown && markdown.trim())
      onAddNote({ title: "Note", markdown: markdown.trim(), origin: "written" });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <StickyNote className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Studio</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 p-3">
          {/* Exam prep — the star of the show for students */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Exam Paper</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                real paper pattern · model answers
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 flex-1 text-xs"
                disabled={!hasSources || examBusy}
                onClick={() => runExam("full")}
              >
                {examBusy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <GraduationCap className="mr-1.5 h-4 w-4" />
                )}
                Generate paper
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={!hasSources || examBusy}>
                    Type <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setExamSetupOpen(true)} className="flex-col items-start">
                    <span className="text-sm font-medium text-primary">Custom pattern…</span>
                    <span className="text-xs text-muted-foreground">Set your own marks &amp; sections</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runExam("full")} className="flex-col items-start">
                    <span className="text-sm font-medium">Full paper</span>
                    <span className="text-xs text-muted-foreground">MCQ + short + long, 100 marks</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runExam("short-only")} className="flex-col items-start">
                    <span className="text-sm font-medium">Short answers</span>
                    <span className="text-xs text-muted-foreground">2-3 mark questions</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runExam("long-only")} className="flex-col items-start">
                    <span className="text-sm font-medium">Long answers</span>
                    <span className="text-xs text-muted-foreground">10-14 mark questions</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runExam("mcq-only")} className="flex-col items-start">
                    <span className="text-sm font-medium">MCQ set</span>
                    <span className="text-xs text-muted-foreground">Quick multiple choice</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {!hasSources && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Activate a source to generate a paper.
              </p>
            )}
          </div>

          <AudioOverview sources={sources} subjectName={subjectName} model={model} />

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Generate from your sources</p>
            <div className="grid grid-cols-2 gap-2">
              {MD_TOOLS.map((t) => (
                <ToolButton
                  key={t.kind}
                  label={t.label}
                  icon={t.icon}
                  busy={busy === t.kind}
                  disabled={!hasSources || !!busy}
                  onClick={() => runMd(t.kind)}
                />
              ))}
              {IX_TOOLS.map((t) => (
                <ToolButton
                  key={t.kind}
                  label={t.label}
                  icon={t.icon}
                  busy={busy === t.kind}
                  disabled={!hasSources || !!busy}
                  onClick={() => runIx(t.kind)}
                />
              ))}
            </div>
            {!hasSources && (
              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                Activate a source to enable Studio.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <div className="flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Notes</span>
            <span className="text-xs text-muted-foreground">({notes.length})</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={addBlankNote}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-2 p-2">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-muted-foreground">
              <StickyNote className="mb-2 h-7 w-7 opacity-50" />
              <p className="text-xs">
                Generated guides and saved answers land here. Everything stays on
                your device.
              </p>
            </div>
          ) : (
            notes.map((n) => (
              <NoteCard key={n.id} note={n} onDelete={() => onDeleteNote(n.id)} />
            ))
          )}
        </div>
      </div>

      <ExamSetupDialog
        open={examSetupOpen}
        onOpenChange={setExamSetupOpen}
        onGenerate={(spec) => generatePaper({ spec })}
      />
    </div>
  );
}

function ToolButton({
  label,
  icon,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-medium transition",
        "hover:border-primary/50 hover:bg-primary/5",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <span className="text-primary">{icon}</span>
      )}
      {label}
    </button>
  );
}

function NoteCard({
  note,
  onDelete,
}: {
  note: NotebookNote;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(note.origin === "studio");

  const copy = () =>
    navigator.clipboard.writeText(note.markdown).then(() => toast.success("Copied"));

  const download = () => {
    const blob = new Blob([`# ${note.title}\n\n${note.markdown}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-xs font-medium">{note.title}</span>
          {note.origin === "studio" && (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
              AI
            </span>
          )}
        </button>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground" aria-label="Copy note">
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button onClick={download} className="text-muted-foreground hover:text-foreground" aria-label="Download note">
          <Download className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label="Delete note">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="border-t border-border px-3 py-2">
          <div className="prose prose-sm dark:prose-invert max-w-none break-words text-xs">
            <Streamdown>{note.markdown}</Streamdown>
          </div>
        </div>
      )}
    </div>
  );
}
