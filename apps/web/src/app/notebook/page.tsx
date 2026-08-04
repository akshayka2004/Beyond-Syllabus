"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, PanelsTopLeft, MessagesSquare, Sparkles } from "lucide-react";
import { cn, titleCase } from "@/lib/utils";
import { useUniversityData } from "@/contexts";
import { ThemeToggle } from "@/components/ThemeToggle";
import ModelSelector from "@/app/chat/_components/Model-Selector";
import { Spinner } from "@/components/ui/spinner";
import {
  NotebookSource,
  NotebookNote,
  notebookIdFromParams,
  getNotes,
  saveNote,
  deleteNote as deleteNoteLs,
  getSavedSources,
  setSavedSources,
  uid,
} from "@/lib/notebook";
import { SourcesPanel } from "./_components/SourcesPanel";
import { ChatPanel } from "./_components/ChatPanel";
import { StudioPanel } from "./_components/StudioPanel";
import { SourceViewer } from "./_components/SourceViewer";
import {
  WorkspaceArea,
  WorkspaceTab,
  WorkspaceTabInput,
} from "./_components/WorkspaceArea";

function findSubject(
  data: any,
  p: {
    university: string;
    program: string;
    scheme: string;
    semester: string;
    subject: string;
  }
): { name: string; modules: { title: string; content: string }[]; fullSyllabus?: string } | null {
  const uni = data?.[p.university];
  const prog = uni?.[p.program];
  const scheme = prog?.[p.scheme];
  const sem = scheme?.[p.semester];
  const subjects = Array.isArray(sem?.subjects) ? sem.subjects : [];
  const subject = subjects.find((s: any) => s.id === p.subject);
  if (!subject) return null;
  return {
    name: subject.name ? titleCase(subject.name) : "Subject",
    modules: (subject.modules || []).map((m: any) => ({
      title: m.title || "Untitled module",
      content: m.content || "",
    })),
    fullSyllabus: subject.fullSyllabus,
  };
}

type Tab = "sources" | "chat" | "studio";

const clampW = (w: number, min: number, max: number) =>
  Math.max(min, Math.min(max, w));

/** A thin draggable divider (desktop only). onResize gets the mouse delta-x. */
function Resizer({ onResize }: { onResize: (dx: number) => void }) {
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    let lastX = e.clientX;
    const move = (ev: PointerEvent) => {
      onResize(ev.clientX - lastX);
      lastX = ev.clientX;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  return (
    <div
      onPointerDown={start}
      className="group hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-border/40 hover:bg-primary/30 lg:flex"
      role="separator"
      aria-orientation="vertical"
    >
      <div className="h-8 w-0.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary" />
    </div>
  );
}

function NotebookInner() {
  const sp = useSearchParams();
  const params = {
    university: sp.get("university") || "",
    program: sp.get("program") || "",
    scheme: sp.get("scheme") || "",
    semester: sp.get("semester") || "",
    subject: sp.get("subject") || "",
  };
  const hasSubject = Boolean(params.university && params.subject);

  // A single module can seed a scratch notebook via ?title=&content=
  // (used by "Ask the AI to explain" on the subject page).
  const seedTitle = sp.get("title") || "";
  const seedContent = sp.get("content") || "";
  const seeded = !hasSubject && !!seedTitle && !!seedContent;

  const notebookId = hasSubject
    ? notebookIdFromParams(params)
    : seeded
      ? `seed__${seedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`
      : "scratch";

  const { data, isFetching, isError } = useUniversityData(
    hasSubject ? params.university : undefined
  );

  const subject = useMemo(
    () => (hasSubject ? findSubject(data, params) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, hasSubject, params.subject, params.university]
  );

  const subjectName =
    subject?.name || (seeded ? seedTitle : hasSubject ? "" : "Untitled notebook");

  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [model, setModel] = useState("openai/gpt-oss-120b");
  const [tab, setTab] = useState<Tab>("chat");
  const [hydrated, setHydrated] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [sourcesW, setSourcesW] = useState(300);
  const [studioW, setStudioW] = useState(360);
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState("chat");

  const openTab = (input: WorkspaceTabInput) => {
    const t = { ...input, id: uid("tab") } as WorkspaceTab;
    setWorkspaceTabs((prev) => [...prev, t]);
    setActiveWorkspace(t.id);
    setTab("chat"); // make sure the center panel is showing on mobile
  };

  const closeTab = (id: string) => {
    setWorkspaceTabs((prev) => prev.filter((t) => t.id !== id));
    setActiveWorkspace((cur) => (cur === id ? "chat" : cur));
  };

  // Load notes + custom sources once we know the notebook id.
  useEffect(() => {
    setNotes(getNotes(notebookId));
    setHydrated(true);
  }, [notebookId]);

  // Build the source list: syllabus modules (live) + persisted saved sources.
  useEffect(() => {
    if (!hydrated) return;
    const saved = getSavedSources(notebookId);
    const moduleSources: NotebookSource[] = seeded
      ? [
          {
            id: "seed_0",
            title: seedTitle,
            content: seedContent,
            kind: "module" as const,
            active: true,
          },
        ]
      : (subject?.modules || []).map((m, i) => ({
          id: `mod_${i}`,
          title: m.title,
          content: m.content,
          kind: "module" as const,
          active: true,
        }));
    setSources([...moduleSources, ...saved]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, notebookId, subject?.modules?.length, seeded]);

  const updateSources = (next: NotebookSource[]) => {
    setSources(next);
    setSavedSources(notebookId, next);
  };

  const viewingSource = sources.find((s) => s.id === viewingId) || null;

  const addNote = (note: {
    title: string;
    markdown: string;
    origin: NotebookNote["origin"];
  }) => setNotes(saveNote(notebookId, note));

  const removeNote = (id: string) => setNotes(deleteNoteLs(notebookId, id));

  if (hasSubject && isFetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-4 h-8 w-8" />
          <p className="text-muted-foreground">Loading your notebook…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
        <Link
          href={hasSubject ? "/select" : "/"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {subjectName || "Notebook"}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              Beyond Syllabus · Notebook
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <ModelSelector value={model} onChange={setModel} />
          </div>
          <ThemeToggle />
        </div>
      </header>

      {hasSubject && isError && (
        <div className="bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          Couldn’t load the syllabus for this subject. You can still add your own
          sources.
        </div>
      )}

      {/* Mobile tab switch */}
      <div className="flex border-b border-border lg:hidden">
        {(
          [
            ["sources", "Sources", <PanelsTopLeft key="s" className="h-4 w-4" />],
            ["chat", "Chat", <MessagesSquare key="c" className="h-4 w-4" />],
            ["studio", "Studio", <Sparkles key="t" className="h-4 w-4" />],
          ] as [Tab, string, React.ReactNode][]
        ).map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium",
              tab === id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Panels — resizable columns on desktop, tabbed on mobile */}
      <div
        className="flex flex-1 overflow-hidden"
        style={
          {
            "--sw": `${sourcesW}px`,
            "--tw": `${studioW}px`,
          } as React.CSSProperties
        }
      >
        <aside
          className={cn(
            "min-h-0 w-full border-r border-border bg-card/40 lg:w-[var(--sw)] lg:shrink-0",
            tab === "sources" ? "block" : "hidden lg:block"
          )}
        >
          <SourcesPanel
            sources={sources}
            onChange={updateSources}
            onViewSource={setViewingId}
          />
        </aside>

        <Resizer
          onResize={(dx) => setSourcesW((w) => clampW(w + dx, 220, 460))}
        />

        <main
          className={cn(
            "min-h-0 flex-1",
            tab === "chat" ? "block" : "hidden lg:block"
          )}
        >
          <WorkspaceArea
            tabs={workspaceTabs}
            activeId={activeWorkspace}
            onSelect={setActiveWorkspace}
            onClose={closeTab}
            onSaveArtifact={(a) =>
              addNote({ title: a.title, markdown: a.markdown, origin: "studio" })
            }
            chat={
              <ChatPanel
                sources={sources}
                subjectName={subjectName}
                model={model}
                onSaveNote={(title, markdown) =>
                  addNote({ title, markdown, origin: "chat" })
                }
                onViewSource={setViewingId}
              />
            }
          />
        </main>

        <Resizer
          onResize={(dx) => setStudioW((w) => clampW(w - dx, 280, 560))}
        />

        <aside
          className={cn(
            "min-h-0 w-full border-l border-border bg-card/40 lg:w-[var(--tw)] lg:shrink-0",
            tab === "studio" ? "block" : "hidden lg:block"
          )}
        >
          <StudioPanel
            sources={sources}
            subjectName={subjectName}
            model={model}
            notes={notes}
            onOpenTab={openTab}
            onAddNote={addNote}
            onDeleteNote={removeNote}
          />
        </aside>
      </div>

      <SourceViewer source={viewingSource} onClose={() => setViewingId(null)} />
    </div>
  );
}

export default function NotebookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <NotebookInner />
    </Suspense>
  );
}
