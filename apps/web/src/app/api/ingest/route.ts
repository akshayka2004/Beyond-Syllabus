import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/ai/ai";

/**
 * Source ingestion — the NotebookLM "add a source" backend.
 *
 * Accepts multipart form-data with either:
 *   - file: <uploaded file>   (PDF, DOCX, TXT/MD/CSV/code, or audio)
 *   - url:  <website URL>      (fetched and stripped to text)
 *
 * Returns { title, content, kind } where kind is file | url | audio.
 * Everything is reduced to plain text so the rest of the notebook (chat,
 * studio, audio overview) can treat every source identically.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 200000; // keep a single source from blowing up the notebook

const AUDIO_EXT = ["mp3", "wav", "m4a", "mp4", "mpeg", "mpga", "webm", "ogg", "flac"];
const TEXT_EXT = [
  "txt", "md", "markdown", "csv", "tsv", "json", "log", "rtf",
  "js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "cs", "go",
  "rb", "php", "html", "css", "yaml", "yml", "xml",
];

function clip(text: string): string {
  const t = text.replace(/\r\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  return t.length > MAX_CHARS ? t.slice(0, MAX_CHARS) + "\n\n…[truncated]" : t;
}

function extOf(name: string): string {
  return (name.split(".").pop() || "").toLowerCase();
}

async function extractPdf(buf: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extractDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value;
}

async function transcribeAudio(file: File): Promise<string> {
  // Groq Whisper — OpenAI-compatible transcription endpoint.
  const res = await ai.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    response_format: "text",
  });
  return typeof res === "string" ? res : (res as { text?: string }).text || "";
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

function youTubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;#39;|&#39;/g, "'")
    .replace(/&amp;quot;|&quot;/g, '"')
    .replace(/&amp;amp;|&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

async function ingestYouTube(id: string) {
  const watch = await fetch(`https://www.youtube.com/watch?v=${id}`, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" },
  });
  const html = await watch.text();

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = (titleMatch?.[1] || `YouTube ${id}`).replace(" - YouTube", "").trim();

  // Pull the caption track list out of ytInitialPlayerResponse.
  const tracksMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!tracksMatch) {
    throw new Error("This video has no captions/transcript available");
  }
  let tracks: { baseUrl: string; languageCode?: string }[];
  try {
    tracks = JSON.parse(tracksMatch[1].replace(/\\u0026/g, "&"));
  } catch {
    throw new Error("Couldn't read the caption track");
  }
  const track = tracks.find((t) => t.languageCode === "en") || tracks[0];
  if (!track?.baseUrl) throw new Error("No transcript track found");
  const baseUrl = track.baseUrl.replace(/\\u0026/g, "&");

  let text = "";
  // Preferred: json3 (structured events); fall back to raw XML/srv formats.
  try {
    const j = await (
      await fetch(`${baseUrl}&fmt=json3`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      })
    ).json();
    text = (j.events || [])
      .flatMap((e: { segs?: { utf8?: string }[] }) => e.segs || [])
      .map((s: { utf8?: string }) => s.utf8 || "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    /* fall through to XML */
  }

  if (text.length < 40) {
    const xml = await (await fetch(baseUrl, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
    const segs = xml.match(/<(?:text|p)[^>]*>([\s\S]*?)<\/(?:text|p)>/g) || [];
    text = segs
      .map((seg) => decodeEntities(seg.replace(/<[^>]+>/g, "")))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (text.length < 40)
    throw new Error(
      "YouTube blocked the transcript here. Open the video's transcript (⋯ → Show transcript), copy it, and paste it as a source."
    );
  return { title: `${title} (YouTube)`, content: clip(text), kind: "url" as const };
}

async function ingestUrl(rawUrl: string) {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const ytId = youTubeId(url);
  if (ytId) return ingestYouTube(ytId);

  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (BeyondSyllabus NotebookBot)" },
    redirect: "follow",
  });
  if (!resp.ok) throw new Error(`Fetch failed (${resp.status})`);
  const html = await resp.text();

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || new URL(url).hostname;
  const text = htmlToText(html);
  if (text.length < 40) throw new Error("No readable text found on that page");

  return { title, content: clip(text), kind: "url" as const };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const url = form.get("url");

    if (typeof url === "string" && url.trim()) {
      const out = await ingestUrl(url);
      return NextResponse.json(out);
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Provide a file or a url." },
        { status: 400 }
      );
    }

    const name = file.name || "source";
    const ext = extOf(name);
    const title = name.replace(/\.[^.]+$/, "");

    // Audio -> Whisper transcription
    if (AUDIO_EXT.includes(ext) || file.type.startsWith("audio/")) {
      const text = await transcribeAudio(file);
      if (!text.trim()) throw new Error("Transcription returned nothing");
      return NextResponse.json({
        title,
        content: clip(text),
        kind: "audio" as const,
      });
    }

    const buf = Buffer.from(await file.arrayBuffer());

    if (ext === "pdf" || file.type === "application/pdf") {
      const text = await extractPdf(buf);
      if (!text.trim())
        throw new Error("No selectable text in this PDF (it may be a scan)");
      return NextResponse.json({ title, content: clip(text), kind: "file" as const });
    }

    if (ext === "docx" || file.type.includes("wordprocessingml")) {
      const text = await extractDocx(buf);
      return NextResponse.json({ title, content: clip(text), kind: "file" as const });
    }

    if (TEXT_EXT.includes(ext) || file.type.startsWith("text/")) {
      return NextResponse.json({
        title,
        content: clip(buf.toString("utf8")),
        kind: "file" as const,
      });
    }

    // Last resort: try to read as UTF-8 text; reject binary
    const asText = buf.toString("utf8");
    if (/[\x00-\x08\x0e-\x1f]/.test(asText.slice(0, 1000))) {
      return NextResponse.json(
        {
          error: `Unsupported file type: .${ext}. Try PDF, DOCX, TXT/MD, audio, or a website URL.`,
        },
        { status: 415 }
      );
    }
    return NextResponse.json({ title, content: clip(asText), kind: "file" as const });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ingestion failed";
    console.error("Ingest error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
