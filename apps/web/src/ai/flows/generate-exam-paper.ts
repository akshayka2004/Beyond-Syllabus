"use server";

import { ai } from "@/ai/ai";

/**
 * Exam Paper Generator — real exam prep, modelled on how Indian university
 * exams (KTU / MG / Kerala-style) are actually set:
 *   Part A  — many short-answer questions (2-3 marks), answer all, module-wise
 *   Part B  — long-answer questions (10-14 marks), either/or choice per module
 *   plus an MCQ warm-up section.
 * Every question carries its marks, the module it comes from, and a MODEL
 * ANSWER, so a student can self-check. Everything grounded in the sources.
 */

export type PaperType = "full" | "mcq-only" | "short-only" | "long-only";

export interface ExamQuestion {
  n: string; // display number e.g. "1", "8 (a)"
  question: string;
  marks: number;
  module?: string;
  type: "mcq" | "short" | "long";
  options?: string[]; // for mcq
  answer: string; // model answer / answer key
}

export interface ExamSection {
  name: string; // "Part A"
  instructions: string; // "Answer all questions"
  questions: ExamQuestion[];
}

export interface ExamPaper {
  courseName: string;
  durationHours: number;
  maxMarks: number;
  sections: ExamSection[];
  error?: string;
}

export interface ExamSectionSpec {
  name: string;
  type: "mcq" | "short" | "long";
  marksEach: number;
  count: number;
  /** answer all, or answer any `chooseCount`. */
  answerAll: boolean;
  chooseCount?: number;
}

export interface ExamSpec {
  durationHours: number;
  sections: ExamSectionSpec[];
}

export interface GenerateExamPaperInput {
  sources: string;
  subjectName?: string;
  type?: PaperType;
  /** When present, the paper follows this exact user-defined pattern. */
  spec?: ExamSpec;
  model?: string;
}

function specToInstruction(spec: ExamSpec): string {
  const lines = [
    `Build a paper with EXACTLY these sections, in order. durationHours ${spec.durationHours}.`,
  ];
  let total = 0;
  spec.sections.forEach((s, i) => {
    total += s.marksEach * (s.answerAll ? s.count : s.chooseCount ?? s.count);
    const choice = s.answerAll
      ? "answer all"
      : `answer any ${s.chooseCount ?? s.count} of ${s.count}`;
    const typeWord =
      s.type === "mcq"
        ? 'multiple-choice (include an "options" array of 4; type:"mcq")'
        : s.type === "short"
          ? 'short-answer (type:"short")'
          : 'long/essay (type:"long")';
    lines.push(
      `- Section ${i + 1} "${s.name}": ${s.count} ${typeWord} questions, ${s.marksEach} marks each, ${choice}. Spread across modules. instructions should state "${choice}".`
    );
  });
  lines.push(`Set maxMarks to ${total}.`);
  return lines.join("\n");
}

const TYPE_SPEC: Record<PaperType, string> = {
  full: [
    "Build a FULL end-semester paper (100 marks, 3 hours) with three sections:",
    '- "Part A" — 8 short-answer questions worth 3 marks each (answer all). Spread across all modules. type:"short".',
    '- "Part B" — 6 long-answer questions worth 10-14 marks each, presented as either/or pairs by module (e.g. "8 (a)" OR "8 (b)"); instructions say answer one from each module. type:"long".',
    '- "Quick MCQs" — 6 warm-up multiple-choice questions worth 1 mark each, each with an "options" array of 4; the answer field names the correct option. type:"mcq".',
    "maxMarks 100, durationHours 3.",
  ].join("\n"),
  "mcq-only": [
    'One section "Multiple Choice" — 15 MCQs, 1 mark each, each with 4 options; answer field states the correct option and a one-line why. type:"mcq". maxMarks 15, durationHours 1.',
  ].join("\n"),
  "short-only": [
    'One section "Short Answers" — 12 short-answer questions, 3 marks each, module-wise. type:"short". Model answer 2-4 sentences each. maxMarks 36, durationHours 1.5.',
  ].join("\n"),
  "long-only": [
    'One section "Long Answers" — 6 long/essay questions, 14 marks each, module-wise. type:"long". Model answer is a structured outline a student could expand. maxMarks 84, durationHours 3.',
  ].join("\n"),
};

export async function generateExamPaper(
  input: GenerateExamPaperInput
): Promise<ExamPaper> {
  const sources = (input.sources || "").trim();
  if (sources.length < 20) {
    return {
      courseName: input.subjectName || "Untitled",
      durationHours: 3,
      maxMarks: 100,
      sections: [],
      error: "Add a source with some content first.",
    };
  }

  const system = [
    "You are an experienced university examiner who sets end-semester question papers.",
    "You mirror how real Indian technological universities (KTU / MG / Kerala style) build papers:",
    "module-wise coverage, a mix of recall and application, clear marks, and either/or choice in long-answer sections.",
    "Rules:",
    "- Ground EVERY question and answer strictly in the SOURCES. Never test material that isn't there.",
    "- Vary cognitive level: definitions, explanations, comparisons, derivations, application/scenario questions.",
    "- Each question includes a genuinely useful MODEL ANSWER (an answer key), sized to the marks.",
    "- Label the module each question draws from when modules are discernible.",
    input.subjectName ? `Course: ${input.subjectName}.` : "",
    "Return STRICT JSON only:",
    '{"courseName":"...","durationHours":3,"maxMarks":100,"sections":[{"name":"Part A","instructions":"Answer all questions","questions":[{"n":"1","question":"...","marks":3,"module":"Module 1","type":"short","answer":"..."}]}]}',
    "For mcq questions include an \"options\" array of 4 strings.",
    input.spec ? specToInstruction(input.spec) : TYPE_SPEC[input.type || "full"],
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await ai.chat.completions.create({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: ["SOURCES:", "-----", sources.slice(0, 22000), "-----"].join("\n"),
        },
      ],
      model: input.model || "openai/gpt-oss-120b",
      temperature: 0.4,
      max_completion_tokens: 6000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as ExamPaper;

    const sections = (parsed.sections || [])
      .map((s) => ({
        name: s.name || "Section",
        instructions: s.instructions || "",
        questions: (s.questions || []).filter((q) => q.question && q.answer),
      }))
      .filter((s) => s.questions.length > 0);

    if (!sections.length) throw new Error("No questions produced");

    return {
      courseName: parsed.courseName || input.subjectName || "Question Paper",
      durationHours: parsed.durationHours || 3,
      maxMarks: parsed.maxMarks || 100,
      sections,
    };
  } catch (e) {
    console.error("Exam paper generation failed:", e);
    return {
      courseName: input.subjectName || "Question Paper",
      durationHours: 3,
      maxMarks: 100,
      sections: [],
      error: "Couldn't generate the paper right now. Try again in a moment.",
    };
  }
}
