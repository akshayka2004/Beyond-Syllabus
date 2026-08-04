"use server";

import { ai } from "@/ai/ai";

/**
 * Audio Overview — NotebookLM's flagship feature. Generates a two-host
 * conversation ("Deep Dive" and friends) grounded in the notebook sources.
 * The browser then synthesises each turn with Groq TTS and plays them back to
 * back, so we get a two-voice podcast without any server-side audio stitching.
 */

export type AudioFormat = "deep-dive" | "brief" | "critique" | "debate";

export interface AudioTurn {
  speaker: "A" | "B";
  text: string;
}

export interface GenerateAudioOverviewInput {
  sources: string;
  subjectName?: string;
  format?: AudioFormat;
  model?: string;
}

export interface GenerateAudioOverviewOutput {
  title: string;
  turns: AudioTurn[];
}

const FORMATS: Record<AudioFormat, { title: string; brief: string; turns: string }> = {
  "deep-dive": {
    title: "Deep Dive",
    brief:
      "A warm, curious two-host deep dive that makes the material click. Explain the big ideas, connect them, and surface the 'wait, that's interesting' moments.",
    turns: "10 to 14",
  },
  brief: {
    title: "The Brief",
    brief:
      "A tight, fast briefing. Hit only the essentials a busy student needs before class. No filler.",
    turns: "6 to 8",
  },
  critique: {
    title: "The Critique",
    brief:
      "A constructive critique: the hosts weigh what the material covers well and where it is thin or could go further.",
    turns: "8 to 12",
  },
  debate: {
    title: "The Debate",
    brief:
      "A friendly debate: the two hosts take opposing angles on the ideas in the sources and argue them out, staying grounded in the material.",
    turns: "10 to 14",
  },
};

export async function generateAudioOverview(
  input: GenerateAudioOverviewInput
): Promise<GenerateAudioOverviewOutput> {
  const sources = (input.sources || "").trim();
  const fmt = FORMATS[input.format || "deep-dive"];
  if (sources.length < 20) {
    return {
      title: fmt.title,
      turns: [
        { speaker: "A", text: "Add a source with some content first, then generate the audio overview." },
      ],
    };
  }

  const system = [
    "You are the script writer for an educational podcast with two hosts:",
    "- Host A is Maya: warm, drives the conversation, asks the questions a smart student would ask.",
    "- Host B is Leo: the explainer, gives clear grounded answers and vivid analogies.",
    `Style: ${fmt.brief}`,
    "Hard rules:",
    "- Ground everything strictly in the SOURCES. Never invent facts, names, dates or numbers.",
    "- Natural spoken language: contractions, short sentences, the odd 'right', 'exactly', 'so here's the thing'.",
    "- No stage directions, no sound effects, no markdown. Plain spoken lines only.",
    "- Do not read out URLs or citation numbers.",
    `Return STRICT JSON: {"turns":[{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}]} with ${fmt.turns} turns, alternating, starting with A welcoming the listener and ending with a short takeaway.`,
  ].join("\n");

  try {
    const completion = await ai.chat.completions.create({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            input.subjectName ? `TOPIC: ${input.subjectName}` : "TOPIC: these sources",
            "",
            "SOURCES:",
            "-----",
            sources.slice(0, 20000),
            "-----",
          ].join("\n"),
        },
      ],
      model: input.model || "openai/gpt-oss-120b",
      temperature: 0.6,
      max_completion_tokens: 2600,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { turns?: AudioTurn[] };
    const turns = (parsed.turns || [])
      .filter((t) => t && t.text && (t.speaker === "A" || t.speaker === "B"))
      .map((t) => ({ speaker: t.speaker, text: String(t.text).trim() }));

    if (turns.length === 0) throw new Error("No turns produced");
    return { title: fmt.title, turns };
  } catch (e) {
    console.error("Audio overview generation failed:", e);
    return {
      title: fmt.title,
      turns: [
        { speaker: "A", text: "Sorry, the audio overview couldn't be generated right now." },
        { speaker: "B", text: "The AI service may be busy. Give it another try in a moment." },
      ],
    };
  }
}
