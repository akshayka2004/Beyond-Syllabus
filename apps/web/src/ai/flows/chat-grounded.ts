"use server";

import { ai } from "@/ai/ai";
import { Message } from "@/lib/types";

/**
 * Passage-grounded chat: the model answers only from numbered CONTEXT passages
 * and cites the ones it uses inline, like [3]. The UI turns those numbers into
 * clickable chips that open the exact passage — real passage-level citations.
 */

export interface GroundedPassage {
  n: number;
  sourceTitle: string;
  text: string;
}

export interface ChatGroundedInput {
  history: Message[];
  message: string;
  subjectName?: string;
  passages: GroundedPassage[];
  model?: string;
}

export interface ChatGroundedOutput {
  response: string;
  /** Passage numbers the answer actually cited, in order of first appearance. */
  citations: number[];
}

export async function chatGrounded(
  input: ChatGroundedInput
): Promise<ChatGroundedOutput> {
  const context = input.passages
    .map((p) => `[${p.n}] (${p.sourceTitle}) ${p.text}`)
    .join("\n\n");

  const system = [
    input.subjectName
      ? `You are a focused study tutor for "${input.subjectName}".`
      : "You are a focused study tutor.",
    "Answer the student's question USING ONLY the numbered CONTEXT passages below.",
    "Rules:",
    "- After each claim, cite the passage it comes from inline using square brackets, e.g. [3] or [3][7].",
    "- Only cite passage numbers that actually appear in the CONTEXT.",
    "- If the context does not cover the question, say so briefly and do not invent an answer.",
    "- Be clear and conversational; end with one short follow-up question.",
    "",
    "CONTEXT:",
    context,
  ].join("\n");

  const history = input.history
    .filter((m) => m.role !== "system")
    .slice(-8)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  try {
    const completion = await ai.chat.completions.create({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `${history ? `Earlier:\n${history}\n\n` : ""}Student question: ${input.message}`,
        },
      ],
      model: input.model || "openai/gpt-oss-120b",
      temperature: 0.3,
      max_completion_tokens: 1200,
      top_p: 0.8,
    });

    const response = completion.choices?.[0]?.message?.content?.trim() || "";
    const valid = new Set(input.passages.map((p) => p.n));
    const citations: number[] = [];
    for (const m of response.matchAll(/\[(\d+)\]/g)) {
      const num = Number(m[1]);
      if (valid.has(num) && !citations.includes(num)) citations.push(num);
    }
    return { response, citations };
  } catch (e) {
    console.error("Grounded chat failed:", e);
    return {
      response: "Sorry, something went wrong. Please try again.",
      citations: [],
    };
  }
}
