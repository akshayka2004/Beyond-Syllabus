"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { titleCase } from "@/lib/utils";
import {
  getLastSelection,
  LastSelection,
  loadJourney,
  getStreak,
} from "@/lib/journey";
import {
  BookOpen,
  Search,
  Sparkles,
  Flame,
  Layers,
  ListChecks,
  Map,
  ArrowRight,
  GraduationCap,
  NotebookPen,
} from "lucide-react";

interface RecentNotebook {
  id: string;
  label: string;
  href: string;
  sources: number;
  notes: number;
}

/** Reconstruct recent notebooks from the notebook localStorage keys. */
function listNotebooks(): RecentNotebook[] {
  if (typeof window === "undefined") return [];
  const ids = new Set<string>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || "";
    const m = key.match(/^bsy:notebook:(?:notes|sources):(.+)$/);
    if (m) ids.add(m[1]);
  }
  const count = (id: string, kind: "notes" | "sources") => {
    try {
      const raw = localStorage.getItem(`bsy:notebook:${kind}:${id}`);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  };
  return Array.from(ids).map((id) => {
    let label = "Untitled notebook";
    let href = "/notebook";
    if (id !== "scratch") {
      const [university, program, scheme, semester, subject] = id.split("__");
      if (subject) {
        label = titleCase(subject);
        href = `/notebook?university=${university}&program=${program}&scheme=${scheme}&semester=${semester}&subject=${subject}`;
      } else {
        label = titleCase(id.replace(/__/g, " "));
      }
    }
    return {
      id,
      label,
      href,
      sources: count(id, "sources"),
      notes: count(id, "notes"),
    };
  });
}

export default function DashboardPage() {
  const [lastSel, setLastSel] = useState<LastSelection | null>(null);
  const [streak, setStreak] = useState(0);
  const [modules, setModules] = useState(0);
  const [questions, setQuestions] = useState(0);
  const [notebooks, setNotebooks] = useState<RecentNotebook[]>([]);

  useEffect(() => {
    setLastSel(getLastSelection());
    setStreak(getStreak());
    const j = loadJourney();
    setModules(Object.keys(j.modules).length);
    let q = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("question-sheet:")) {
        try {
          const a = JSON.parse(localStorage.getItem(k) || "[]");
          if (Array.isArray(a)) q += a.length;
        } catch {
          /* ignore */
        }
      }
    }
    setQuestions(q);
    setNotebooks(listNotebooks());
    document.title = "Dashboard | Beyond Syllabus";
  }, []);

  const semesterPath = lastSel
    ? `/${lastSel.university}/${lastSel.program}/${lastSel.scheme}/${lastSel.semester}`
    : null;

  return (
    <div className="paper-texture flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 pb-16 pt-24">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Your study space
          </h1>
          <p className="mt-1 text-muted-foreground">
            No account, all on your device. Pick up where you left off, or start
            something new.
          </p>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat icon={<Flame className="h-5 w-5" />} value={streak} label="day streak" hot={streak > 0} />
            <Stat icon={<Layers className="h-5 w-5" />} value={modules} label="modules touched" />
            <Stat icon={<ListChecks className="h-5 w-5" />} value={questions} label="questions collected" />
          </div>

          {/* Primary actions */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {semesterPath && (
              <ActionCard
                href={semesterPath}
                icon={<GraduationCap className="h-5 w-5" />}
                title="Continue"
                sub={`${titleCase(lastSel!.program)} · Sem ${lastSel!.semester.replace(/\D/g, "")}`}
                primary
              />
            )}
            <ActionCard href="/select" icon={<Search className="h-5 w-5" />} title="Find a syllabus" sub="Browse universities & subjects" />
            <ActionCard href="/notebook" icon={<NotebookPen className="h-5 w-5" />} title="Blank notebook" sub="Add your own sources" />
            <ActionCard href="/journey" icon={<Map className="h-5 w-5" />} title="My Journey" sub="Progress, revision & exams" />
          </div>

          {/* Recent notebooks */}
          <div className="mt-10">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-bold">Jump back in</h2>
            </div>
            {notebooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-60" />
                <p className="text-sm text-muted-foreground">
                  No notebooks yet. Open a subject and hit{" "}
                  <span className="font-medium text-primary">Open in Notebook</span>, or
                  start a blank one.
                </p>
                <Link href="/notebook" className="pill-btn pill-btn-solid mt-4 text-sm">
                  New notebook
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {notebooks.map((nb) => (
                  <Link
                    key={nb.id}
                    href={nb.href}
                    className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <p className="truncate font-semibold">{nb.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {nb.sources} source{nb.sources === 1 ? "" : "s"} · {nb.notes} note
                      {nb.notes === 1 ? "" : "s"}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  hot,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  hot?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <div className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center ${hot ? "text-orange-500" : "text-primary"}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  sub,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl border p-4 transition hover:shadow-md ${
        primary
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
    </Link>
  );
}
