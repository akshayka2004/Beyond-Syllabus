"use client";

import { Button } from "@/components/ui/button";
import { Streamdown } from "streamdown";
import { toast } from "react-hot-toast";
import { Copy, Download, BookmarkPlus } from "lucide-react";

export interface Artifact {
  title: string;
  markdown: string;
}

/** Renders a markdown study artifact as scrollable tab content. */
export function ArtifactView({
  artifact,
  onSave,
}: {
  artifact: Artifact;
  onSave: (a: Artifact) => void;
}) {
  const copy = () =>
    navigator.clipboard.writeText(artifact.markdown).then(() => toast.success("Copied"));

  const download = () => {
    const blob = new Blob([`# ${artifact.title}\n\n${artifact.markdown}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border pb-2">
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={copy}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={download}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => {
            onSave(artifact);
            toast.success("Saved to notes");
          }}
        >
          <BookmarkPlus className="h-3.5 w-3.5" /> Save to notes
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <div className="prose prose-sm dark:prose-invert mx-auto max-w-2xl break-words">
          <Streamdown>{artifact.markdown}</Streamdown>
        </div>
      </div>
    </div>
  );
}
