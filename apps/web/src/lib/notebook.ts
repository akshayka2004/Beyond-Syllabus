/**
 * Client-side notebook model for the NotebookLM-style experience.
 *
 * A "notebook" is keyed by its subject path (or "scratch" for an ad-hoc one).
 * Sources and saved notes live in localStorage so the whole thing works with
 * no account and no server — the same "all on your device" promise the rest
 * of the app makes.
 */

export type SourceKind = "module" | "custom" | "file" | "url" | "audio";

export interface NotebookSource {
  id: string;
  title: string;
  content: string;
  /**
   * module = from the syllabus (re-derived live, never persisted)
   * custom = pasted text · file = uploaded doc · url = website · audio = transcribed
   */
  kind: SourceKind;
  /** Whether this source is currently fed to the AI. */
  active: boolean;
}

export interface NotebookNote {
  id: string;
  title: string;
  markdown: string;
  createdAt: number;
  /** Where it came from: a studio artifact, a saved chat reply, or written. */
  origin: "studio" | "chat" | "written";
}

const notesKey = (notebookId: string) => `bsy:notebook:notes:${notebookId}`;
const sourcesKey = (notebookId: string) =>
  `bsy:notebook:sources:${notebookId}`;

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Slugify a subject path into a stable notebook id. */
export function notebookIdFromParams(params: {
  university?: string;
  program?: string;
  scheme?: string;
  semester?: string;
  subject?: string;
}): string {
  const parts = [
    params.university,
    params.program,
    params.scheme,
    params.semester,
    params.subject,
  ].filter(Boolean);
  return parts.length ? parts.join("__") : "scratch";
}

/* ----------------------------- notes ----------------------------- */

export function getNotes(notebookId: string): NotebookNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(notesKey(notebookId));
    return raw ? (JSON.parse(raw) as NotebookNote[]) : [];
  } catch {
    return [];
  }
}

export function saveNote(
  notebookId: string,
  note: Omit<NotebookNote, "id" | "createdAt">
): NotebookNote[] {
  const notes = getNotes(notebookId);
  const full: NotebookNote = { ...note, id: uid("note"), createdAt: Date.now() };
  const next = [full, ...notes];
  localStorage.setItem(notesKey(notebookId), JSON.stringify(next));
  return next;
}

export function deleteNote(notebookId: string, id: string): NotebookNote[] {
  const next = getNotes(notebookId).filter((n) => n.id !== id);
  localStorage.setItem(notesKey(notebookId), JSON.stringify(next));
  return next;
}

/* --------------------------- saved sources --------------------------- */
/**
 * Everything the user added (pasted text, uploaded files, URLs, audio) is
 * persisted. Only `module` sources are excluded — those are re-derived from
 * the live syllabus so they never go stale.
 */

export function getSavedSources(notebookId: string): NotebookSource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(sourcesKey(notebookId));
    return raw ? (JSON.parse(raw) as NotebookSource[]) : [];
  } catch {
    return [];
  }
}

export function setSavedSources(
  notebookId: string,
  sources: NotebookSource[]
): void {
  const saved = sources.filter((s) => s.kind !== "module");
  try {
    localStorage.setItem(sourcesKey(notebookId), JSON.stringify(saved));
  } catch (e) {
    // localStorage quota — large PDFs/audio transcripts can overflow it
    console.warn("Could not persist sources (storage full?)", e);
  }
}

/** Build the single context string handed to the AI from active sources. */
export function buildSourceContext(sources: NotebookSource[]): string {
  return sources
    .filter((s) => s.active && s.content.trim())
    .map((s, i) => `[Source ${i + 1}: ${s.title}]\n${s.content.trim()}`)
    .join("\n\n");
}

export interface Passage {
  n: number;
  sourceId: string;
  sourceTitle: string;
  text: string;
}

/**
 * Split active sources into numbered passages for passage-level citations.
 * Splits on blank lines, then packs into ~90-word chunks so each citation
 * points at a genuinely specific span rather than a whole document.
 */
export function buildPassages(sources: NotebookSource[]): Passage[] {
  const passages: Passage[] = [];
  let n = 0;
  for (const s of sources) {
    if (!s.active || !s.content.trim()) continue;
    const paras = s.content
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const para of paras) {
      const words = para.split(" ");
      for (let i = 0; i < words.length; i += 90) {
        const text = words.slice(i, i + 90).join(" ");
        if (text.length < 15) continue;
        n += 1;
        passages.push({ n, sourceId: s.id, sourceTitle: s.title, text });
        if (n >= 60) return passages; // cap context size
      }
    }
  }
  return passages;
}
