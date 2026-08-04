"use server";

import { ai } from "@/ai/ai";

/**
 * The NotebookLM "Studio" engine: turn the notebook's active sources
 * (syllabus modules and/or pasted text) into a single, self-contained
 * study artifact rendered as markdown.
 *
 * Everything is grounded strictly in the provided source text — the same
 * anti-hallucination stance the chat flow takes — because a study guide
 * that invents topics the exam won't cover is worse than useless.
 */

export type StudioArtifactKind =
  | "study-guide"
  | "faq"
  | "timeline"
  | "briefing"
  | "project-ideas"
  | "real-world";

export interface GenerateStudioArtifactInput {
  kind: StudioArtifactKind;
  /** Concatenated source text (the active notebook sources). */
  sources: string;
  /** Human subject/notebook name, used only for framing. */
  subjectName?: string;
  model?: string;
}

export interface GenerateStudioArtifactOutput {
  markdown: string;
}

const SYSTEM_BASE = [
  "You are the Studio engine of a NotebookLM-style study companion for university students.",
  "You transform a set of SOURCE documents (syllabus modules and notes) into a polished study artifact.",
  "Absolute rules:",
  "- Ground every statement in the SOURCES. Never introduce facts, dates, names or numbers that are not present in or directly implied by the sources.",
  "- If the sources are thin on a point, say so briefly rather than inventing detail.",
  "- Output GitHub-flavoured markdown only. No preamble, no 'Here is', no closing sign-off.",
  "- Do not wrap the whole answer in a code fence.",
].join("\n");

const KIND_INSTRUCTIONS: Record<StudioArtifactKind, string> = {
  "study-guide": [
    "Produce a **Study Guide**. Structure:",
    "1. A one-line '## Study Guide' heading.",
    "2. '### Key concepts' — a bulleted list, each bullet a term in **bold** followed by a one-sentence plain-language explanation.",
    "3. '### Short-answer questions' — 5-8 questions a student should be able to answer, as a numbered list (questions only, no answers).",
    "4. '### Essay / discussion prompts' — 2-3 broader prompts as bullets.",
    "5. '### Glossary' — a short markdown table of the most important terms and a terse definition.",
    "Keep it tight and revision-focused.",
  ].join("\n"),
  faq: [
    "Produce a **FAQ**. Anticipate the questions a student would actually ask about this material.",
    "Start with a '## Frequently Asked Questions' heading.",
    "Then 6-10 entries, each formatted as:",
    "**Q: <question>**",
    "",
    "<a 1-3 sentence answer grounded in the sources>",
    "",
    "Order from most fundamental to most advanced.",
  ].join("\n"),
  timeline: [
    "Produce a **Timeline / Learning Sequence**. Since syllabus modules are ordered, lay out the logical progression a learner moves through.",
    "Start with a '## Timeline' heading.",
    "Use a numbered list of stages. For each stage: a **bold stage title**, then a sub-bullet or two describing what is covered and what it builds toward.",
    "If the sources contain any real chronological events, dates or historical developments, present those in order instead.",
    "End with a one-line note on how the pieces connect.",
  ].join("\n"),
  briefing: [
    "Produce a **Briefing Document** — a concise executive overview of the material.",
    "Start with a '## Briefing Document' heading, then:",
    "'### Overview' — 2-3 sentences on what this material covers and why it matters.",
    "'### Main themes' — 3-5 bullets, each a theme in **bold** with a one-line summary.",
    "'### Key takeaways' — 4-6 crisp bullets a student should walk away with.",
    "'### Where this applies' — 2-3 bullets on real-world / downstream relevance, only if supportable from the sources.",
  ].join("\n"),
  "project-ideas": [
    "Produce **Project Ideas** — buildable mini-projects that apply this material.",
    "Start with a '## Project Ideas' heading, then 4-6 projects. For EACH project use this exact structure:",
    "### <Project title>",
    "- **What you build:** <1-2 sentences>",
    "- **Difficulty:** Beginner | Intermediate | Advanced",
    "- **Skills used:** <comma-separated skills/concepts from the sources>",
    "- **Portfolio value:** <one line on why it's worth showing>",
    "Ground every project in concepts actually present in the sources; scale scope from quick to ambitious.",
  ].join("\n"),
  "real-world": [
    "Produce **Real-World Applications** of this material.",
    "Start with a '## Real-World Applications' heading, then:",
    "'### Where it's used' — 4-6 bullets, each a concrete real-life use case tied to a concept from the sources.",
    "'### Worked examples' — 2-3 short concrete examples showing the concept in action.",
    "'### Industry relevance' — 2-4 bullets on industries, roles, or products where this matters.",
    "Only claim applications you can justify from the source concepts; keep it concrete, not generic.",
  ].join("\n"),
};

export async function generateStudioArtifact(
  input: GenerateStudioArtifactInput
): Promise<GenerateStudioArtifactOutput> {
  const sources = (input.sources || "").trim();
  if (sources.length < 20) {
    return {
      markdown:
        "> Add at least one source with some content on the left, then generate this again.",
    };
  }

  try {
    const chatCompletion = await ai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_BASE },
        {
          role: "user",
          content: [
            input.subjectName
              ? `NOTEBOOK: ${input.subjectName}`
              : "NOTEBOOK: Untitled",
            "",
            "TASK:",
            KIND_INSTRUCTIONS[input.kind],
            "",
            "SOURCES:",
            "-----",
            sources.slice(0, 24000),
            "-----",
          ].join("\n"),
        },
      ],
      model: input.model || "openai/gpt-oss-120b",
      temperature: 0.3,
      max_completion_tokens: 2600,
      top_p: 0.9,
    });

    let markdown = chatCompletion.choices?.[0]?.message?.content?.trim() || "";
    markdown = markdown
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    if (markdown.length < 20) {
      throw new Error("Empty studio output");
    }
    return { markdown };
  } catch (e) {
    console.error(`Error generating studio artifact "${input.kind}":`, e);
    return {
      markdown:
        "> The Studio couldn't generate this right now (the AI service may be busy). Try again in a moment, or switch the model.",
    };
  }
}
