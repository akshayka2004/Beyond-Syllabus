import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--paper)/0.92)] backdrop-blur-md">
      <div className="bs-wrap flex h-[60px] items-center justify-between">
        <Link
          href="/"
          className="font-display text-sm font-bold uppercase tracking-[0.06em]"
        >
          Beyond Syllabus
        </Link>
        <div className="flex items-center gap-3.5">
          <Link
            href="/select"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-primary sm:inline"
          >
            Syllabus
          </Link>
          <Link
            href="/dashboard"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-primary sm:inline"
          >
            Dashboard
          </Link>
          <ThemeToggle />
          <Link href="/select" className="btn-pledge btn-pledge-sm">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
