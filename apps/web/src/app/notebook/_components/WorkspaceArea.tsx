"use client";

import { cn } from "@/lib/utils";
import {
  MessagesSquare,
  Network,
  GraduationCap,
  FileText,
  ListChecks,
  Layers,
  X,
} from "lucide-react";
import { MindMapNode, QuizQuestion, Flashcard } from "@/ai/flows/generate-interactive";
import { ExamPaper } from "@/ai/flows/generate-exam-paper";
import {
  MindMapView,
  QuizView,
  FlashcardsView,
  ConceptContext,
} from "./InteractiveViewers";
import { ExamPaperView } from "./ExamPaperViewer";
import { ArtifactView, Artifact } from "./ArtifactDialog";

export type WorkspaceTab =
  | { id: string; kind: "concept-map"; title: string; mindMap: MindMapNode; context: ConceptContext }
  | { id: string; kind: "exam-paper"; title: string; paper: ExamPaper }
  | { id: string; kind: "artifact"; title: string; markdown: string }
  | { id: string; kind: "quiz"; title: string; quiz: QuizQuestion[] }
  | { id: string; kind: "flashcards"; title: string; flashcards: Flashcard[] };

// Distributive Omit so each union member keeps its own fields.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type WorkspaceTabInput = DistributiveOmit<WorkspaceTab, "id">;

const ICON = {
  "concept-map": Network,
  "exam-paper": GraduationCap,
  artifact: FileText,
  quiz: ListChecks,
  flashcards: Layers,
} as const;

export function WorkspaceArea({
  tabs,
  activeId,
  onSelect,
  onClose,
  onSaveArtifact,
  chat,
}: {
  tabs: WorkspaceTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onSaveArtifact: (a: Artifact) => void;
  chat: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Tab strip — only shown once something is open beside chat */}
      {tabs.length > 0 && (
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-card/40 px-2 py-1.5">
          <TabChip
            active={activeId === "chat"}
            label="Chat"
            icon={<MessagesSquare className="h-3.5 w-3.5" />}
            onClick={() => onSelect("chat")}
          />
          {tabs.map((t) => {
            const Icon = ICON[t.kind];
            return (
              <TabChip
                key={t.id}
                active={activeId === t.id}
                label={t.title}
                icon={<Icon className="h-3.5 w-3.5" />}
                onClick={() => onSelect(t.id)}
                onClose={() => onClose(t.id)}
              />
            );
          })}
        </div>
      )}

      <div className="min-h-0 flex-1">
        <div className={activeId === "chat" ? "h-full" : "hidden"}>{chat}</div>
        {tabs.map((t) => (
          <div key={t.id} className={activeId === t.id ? "h-full p-3 sm:p-4" : "hidden"}>
            <TabContent tab={t} onSaveArtifact={onSaveArtifact} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TabChip({
  active,
  label,
  icon,
  onClick,
  onClose,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-transparent text-muted-foreground hover:bg-muted"
      )}
    >
      <button onClick={onClick} className="flex items-center gap-1.5">
        {icon}
        <span className="max-w-[130px] truncate font-medium">{label}</span>
      </button>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded p-0.5 opacity-60 hover:bg-background hover:opacity-100"
          aria-label={`Close ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function TabContent({
  tab,
  onSaveArtifact,
}: {
  tab: WorkspaceTab;
  onSaveArtifact: (a: Artifact) => void;
}) {
  switch (tab.kind) {
    case "concept-map":
      return <MindMapView node={tab.mindMap} context={tab.context} />;
    case "exam-paper":
      return <ExamPaperView paper={tab.paper} />;
    case "artifact":
      return (
        <ArtifactView
          artifact={{ title: tab.title, markdown: tab.markdown }}
          onSave={onSaveArtifact}
        />
      );
    case "quiz":
      return (
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-2xl">
            <QuizView questions={tab.quiz} />
          </div>
        </div>
      );
    case "flashcards":
      return (
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-lg">
            <FlashcardsView cards={tab.flashcards} />
          </div>
        </div>
      );
  }
}
