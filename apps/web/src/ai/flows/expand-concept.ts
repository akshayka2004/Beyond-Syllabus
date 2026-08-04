"use server";

import { ai } from "@/ai/ai";

/**
 * Click-to-explore: given a concept node the student clicked, return a short
 * explanation plus the sub-concepts it branches into — all grounded in the
 * notebook sources. Powers the interactive concept graph.
 */

export interface ExpandConceptResult {
  summary?: string;
  children?: string[];
  error?: string;
}

export async function expandConcept(input: {
  concept: string;
  sources: string;
  subjectName?: string;
  model?: string;
}): Promise<ExpandConceptResult> {
  const sources = (input.sources || "").trim();
  if (!input.concept.trim()) return { error: "No concept" };

  const system = [
    "You expand a single concept from a study notebook into its sub-topics.",
    "Ground everything strictly in the SOURCES — never invent topics not supported by them.",
    'Return STRICT JSON: {"summary":"<one sentence explaining the concept>","children":["<sub-concept>", ...]}.',
    "3-5 children, each a short phrase (2-6 words). If the sources don't support sub-topics, return an empty children array.",
  ].join("\n");

  try {
    const completion = await ai.chat.completions.create({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            input.subjectName ? `SUBJECT: ${input.subjectName}` : "",
            `CONCEPT TO EXPAND: ${input.concept}`,
            "",
            "SOURCES:",
            "-----",
            sources.slice(0, 14000),
            "-----",
          ].join("\n"),
        },
      ],
      model: input.model || "openai/gpt-oss-20b",
      temperature: 0.3,
      max_completion_tokens: 700,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as ExpandConceptResult;
    return {
      summary: parsed.summary,
      children: (parsed.children || []).filter(Boolean).slice(0, 6),
    };
  } catch (e) {
    console.error("expandConcept failed:", e);
    return { error: "Couldn't expand this concept right now." };
  }
}
