"use server";

import { ai } from "@/ai/ai";

/**
 * Interactive Studio artifacts that need structured data rather than markdown:
 * Mind Map (tree), Quiz (MCQ), and Flashcards. All grounded in the sources.
 */

export type InteractiveKind = "mind-map" | "quiz" | "flashcards";

export interface MindMapNode {
  title: string;
  children?: MindMapNode[];
}
export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
  /** Short topic label, used to surface weak areas after the quiz. */
  topic?: string;
}
export interface Flashcard {
  front: string;
  back: string;
}

export interface InteractiveResult {
  mindMap?: MindMapNode;
  quiz?: QuizQuestion[];
  flashcards?: Flashcard[];
  error?: string;
}

const PROMPTS: Record<InteractiveKind, string> = {
  "mind-map":
    'Build a mind map. Return {"mindMap":{"title":"<central topic>","children":[{"title":"<branch>","children":[{"title":"<leaf>"}]}]}}. Use 4-7 top branches, each with 2-4 leaves. Titles are short phrases (2-6 words).',
  quiz:
    'Write a multiple-choice quiz. Return {"quiz":[{"question":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"...","topic":"<2-4 word topic>"}]}. 6-8 questions, exactly 4 options each, answerIndex is the 0-based index of the correct option, explanation is one sentence, topic is a short label for the concept the question tests.',
  flashcards:
    'Create flashcards. Return {"flashcards":[{"front":"<term or question>","back":"<concise answer>"}]}. 8-12 cards covering the key concepts.',
};

export async function generateInteractive(input: {
  kind: InteractiveKind;
  sources: string;
  subjectName?: string;
  model?: string;
}): Promise<InteractiveResult> {
  const sources = (input.sources || "").trim();
  if (sources.length < 20) return { error: "Add a source first." };

  const system = [
    "You generate structured learning artifacts from SOURCE material for university students.",
    "Ground everything strictly in the sources — never invent facts.",
    "Return STRICT, valid JSON only, matching the requested shape. No markdown, no prose outside the JSON.",
    PROMPTS[input.kind],
  ].join("\n");

  try {
    const completion = await ai.chat.completions.create({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            input.subjectName ? `TOPIC: ${input.subjectName}` : "",
            "SOURCES:",
            "-----",
            sources.slice(0, 20000),
            "-----",
          ].join("\n"),
        },
      ],
      model: input.model || "openai/gpt-oss-120b",
      temperature: 0.3,
      max_completion_tokens: 2600,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as InteractiveResult;

    if (input.kind === "quiz") {
      const quiz = (parsed.quiz || []).filter(
        (q) => q.question && Array.isArray(q.options) && q.options.length >= 2
      );
      if (!quiz.length) throw new Error("Empty quiz");
      return { quiz };
    }
    if (input.kind === "flashcards") {
      const flashcards = (parsed.flashcards || []).filter((c) => c.front && c.back);
      if (!flashcards.length) throw new Error("Empty flashcards");
      return { flashcards };
    }
    if (!parsed.mindMap?.title) throw new Error("Empty mind map");
    return { mindMap: parsed.mindMap };
  } catch (e) {
    console.error(`Interactive '${input.kind}' failed:`, e);
    return { error: "Couldn't generate this right now. Try again in a moment." };
  }
}
