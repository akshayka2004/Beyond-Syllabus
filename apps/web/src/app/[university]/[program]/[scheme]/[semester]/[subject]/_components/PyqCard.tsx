"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileQuestion, MessageSquareText } from "lucide-react";

export interface Pyq {
  examYear: string;
  session: string | null;
  content: string;
}

function label(p: Pyq): string {
  const session = p.session
    ? ` (${p.session[0].toUpperCase()}${p.session.slice(1)})`
    : "";
  return `${p.examYear}${session}`;
}

export function PyqCard({
  subjectName,
  pyqs,
}: {
  subjectName: string;
  pyqs: Pyq[];
}) {
  const router = useRouter();

  const discuss = (p: Pyq) => {
    router.push(
      `/chat?title=${encodeURIComponent(
        `${subjectName} — PYQ ${label(p)}`
      )}&content=${encodeURIComponent(
        `Previous year question paper (${label(p)}) for ${subjectName}:\n\n${p.content}`
      )}`
    );
  };

  return (
    <div className="flex w-full flex-col gap-3 bg-card border border-border rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2">
        <FileQuestion className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Previous Year Questions</h3>
      </div>

      {pyqs.length ? (
        <ul className="space-y-2">
          {pyqs.map((p) => (
            <li key={label(p)}>
              <details className="rounded-lg border border-border/50 px-3 py-2">
                <summary className="text-sm font-medium cursor-pointer flex items-center justify-between gap-2">
                  <span>{label(p)}</span>
                </summary>
                <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground font-sans">
                  {p.content}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => discuss(p)}
                >
                  <MessageSquareText className="h-3.5 w-3.5 mr-1" />
                  Work through it with AI
                </Button>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          No past papers for this subject yet.
        </p>
      )}
    </div>
  );
}
