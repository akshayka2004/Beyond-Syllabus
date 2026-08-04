"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExamPaper } from "@/ai/flows/generate-exam-paper";
import { Eye, EyeOff, Download, Printer } from "lucide-react";

function paperToMarkdown(p: ExamPaper): string {
  const lines: string[] = [
    `# ${p.courseName}`,
    ``,
    `**Duration:** ${p.durationHours} Hours  |  **Max Marks:** ${p.maxMarks}`,
    ``,
  ];
  for (const s of p.sections) {
    lines.push(`## ${s.name}`, `_${s.instructions}_`, ``);
    for (const q of s.questions) {
      lines.push(`**${q.n}.** ${q.question}  _(${q.marks} marks)_`);
      if (q.options?.length)
        q.options.forEach((o, i) =>
          lines.push(`   ${String.fromCharCode(97 + i)}) ${o}`)
        );
      lines.push(`   > **Answer:** ${q.answer}`, ``);
    }
  }
  return lines.join("\n");
}

/** Renders an exam paper as scrollable tab content (no modal). */
export function ExamPaperView({ paper }: { paper: ExamPaper }) {
  const [showAnswers, setShowAnswers] = useState(false);

  const download = () => {
    const blob = new Blob([paperToMarkdown(paper)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paper.courseName.replace(/\s+/g, "-").toLowerCase()}-paper.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const body = paper.sections
      .map(
        (s) =>
          `<h2>${s.name}</h2><p><em>${s.instructions}</em></p>` +
          s.questions
            .map(
              (q) =>
                `<p><b>${q.n}.</b> ${q.question} <span style="float:right">(${q.marks})</span></p>` +
                (q.options?.length
                  ? "<ol type='a'>" + q.options.map((o) => `<li>${o}</li>`).join("") + "</ol>"
                  : "") +
                (showAnswers ? `<p style="color:#6d28d9"><b>Ans:</b> ${q.answer}</p>` : "")
            )
            .join("")
      )
      .join("");
    w.document.write(
      `<html><head><title>${paper.courseName}</title></head><body style="font-family:serif;max-width:720px;margin:auto;padding:24px">` +
        `<h1 style="text-align:center">${paper.courseName}</h1>` +
        `<p style="text-align:center">Duration: ${paper.durationHours} Hours &nbsp; Max Marks: ${paper.maxMarks}</p><hr/>` +
        body +
        `</body></html>`
    );
    w.document.close();
    w.print();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border pb-2 text-center">
        <h2 className="text-base font-bold">{paper.courseName}</h2>
        <p className="text-xs text-muted-foreground">
          Duration: {paper.durationHours} Hours · Max Marks: {paper.maxMarks}
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Button size="sm" variant={showAnswers ? "default" : "outline"} className="h-8 gap-1.5 text-xs" onClick={() => setShowAnswers((v) => !v)}>
            {showAnswers ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showAnswers ? "Hide answers" : "Show model answers"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={download}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={print}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {paper.sections.map((s, si) => (
            <div key={si}>
              <div className="mb-2 border-b border-border pb-1">
                <h3 className="text-sm font-bold uppercase tracking-wide">{s.name}</h3>
                <p className="text-xs italic text-muted-foreground">{s.instructions}</p>
              </div>
              <div className="space-y-3">
                {s.questions.map((q, qi) => (
                  <div key={qi} className="text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold">{q.n}.</span>
                      <span className="flex-1">{q.question}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">({q.marks})</span>
                    </div>
                    {q.options && q.options.length > 0 && (
                      <ol className="ml-6 mt-1 list-[lower-alpha] space-y-0.5 text-sm text-muted-foreground">
                        {q.options.map((o, oi) => (
                          <li key={oi}>{o}</li>
                        ))}
                      </ol>
                    )}
                    {q.module && (
                      <span className="ml-6 mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {q.module}
                      </span>
                    )}
                    {showAnswers && (
                      <div className="ml-6 mt-1.5 rounded-md border-l-2 border-primary bg-primary/5 px-3 py-1.5 text-xs">
                        <span className="font-semibold text-primary">Model answer: </span>
                        <span className="whitespace-pre-wrap">{q.answer}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
