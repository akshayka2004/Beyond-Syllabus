"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExamSpec, ExamSectionSpec } from "@/ai/flows/generate-exam-paper";
import { Plus, Trash2, GraduationCap } from "lucide-react";

const PRESET: ExamSectionSpec[] = [
  { name: "Part A", type: "short", marksEach: 3, count: 8, answerAll: true },
  { name: "Part B", type: "long", marksEach: 14, count: 6, answerAll: false, chooseCount: 5 },
];

function computeTotal(sections: ExamSectionSpec[]): number {
  return sections.reduce(
    (t, s) => t + s.marksEach * (s.answerAll ? s.count : s.chooseCount ?? s.count),
    0
  );
}

export function ExamSetupDialog({
  open,
  onOpenChange,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGenerate: (spec: ExamSpec) => void;
}) {
  const [duration, setDuration] = useState(3);
  const [sections, setSections] = useState<ExamSectionSpec[]>(PRESET);

  const update = (i: number, patch: Partial<ExamSectionSpec>) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const total = computeTotal(sections);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Set your paper pattern
          </DialogTitle>
          <DialogDescription>
            Define the sections, marks, and choice rules. The paper follows exactly
            this scheme — set it up like your real exam.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Duration (hours)</span>
          <input
            type="number"
            min={1}
            max={6}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 1)}
            className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
          <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {total} marks
          </span>
        </div>

        <div className="space-y-3">
          {sections.map((s, i) => (
            <div key={i} className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={s.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm font-medium"
                />
                <button
                  onClick={() => setSections((p) => p.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove section"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Type</span>
                  <select
                    value={s.type}
                    onChange={(e) => update(i, { type: e.target.value as ExamSectionSpec["type"] })}
                    className="rounded-md border border-border bg-background px-2 py-1"
                  >
                    <option value="mcq">MCQ</option>
                    <option value="short">Short</option>
                    <option value="long">Long</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Marks each</span>
                  <input
                    type="number"
                    min={1}
                    value={s.marksEach}
                    onChange={(e) => update(i, { marksEach: Number(e.target.value) || 1 })}
                    className="rounded-md border border-border bg-background px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground"># Questions</span>
                  <input
                    type="number"
                    min={1}
                    value={s.count}
                    onChange={(e) => update(i, { count: Number(e.target.value) || 1 })}
                    className="rounded-md border border-border bg-background px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Answer</span>
                  <select
                    value={s.answerAll ? "all" : "choose"}
                    onChange={(e) =>
                      update(i, {
                        answerAll: e.target.value === "all",
                        chooseCount: e.target.value === "all" ? undefined : Math.max(1, s.count - 1),
                      })
                    }
                    className="rounded-md border border-border bg-background px-2 py-1"
                  >
                    <option value="all">All</option>
                    <option value="choose">Choose…</option>
                  </select>
                </label>
              </div>
              {!s.answerAll && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Answer any</span>
                  <input
                    type="number"
                    min={1}
                    max={s.count}
                    value={s.chooseCount ?? s.count}
                    onChange={(e) => update(i, { chooseCount: Number(e.target.value) || 1 })}
                    className="w-16 rounded-md border border-border bg-background px-2 py-1"
                  />
                  <span className="text-muted-foreground">of {s.count}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() =>
            setSections((p) => [
              ...p,
              { name: `Part ${String.fromCharCode(65 + p.length)}`, type: "short", marksEach: 2, count: 5, answerAll: true },
            ])
          }
        >
          <Plus className="h-4 w-4" /> Add section
        </Button>

        <Button
          className="w-full"
          disabled={sections.length === 0}
          onClick={() => {
            onGenerate({ durationHours: duration, sections });
            onOpenChange(false);
          }}
        >
          Generate paper ({total} marks)
        </Button>
      </DialogContent>
    </Dialog>
  );
}
