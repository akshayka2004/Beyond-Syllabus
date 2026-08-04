# Beyond Syllabus

Turn any syllabus into an AI-powered study workspace. Pick a subject, and its
modules become sources you can chat with, generate exam papers and study guides
from, build concept maps, make flashcards, and keep notes — all in one place.

Free, open source (MIT), and local-first: no account, your data stays on your
device.

## Features

- **Notebook workspace** — sources, grounded chat with passage-level citations,
  and a tabbed studio.
- **Add any source** — PDF, DOCX, TXT/Markdown, audio (transcribed), website or
  YouTube URLs, or pasted text.
- **Exam prep** — generate real question papers (short + long answers, MCQs) with
  a custom mark scheme and model answers.
- **Study tools** — study guide, briefing, FAQ, timeline, project ideas,
  real-world applications, interactive concept map, quiz, and flashcards.
- **Audio Overview** — a two-host spoken summary of your sources.
- **Journey** — track module mastery, streaks, and an exam revision plan.

## Tech stack

- **Web:** Next.js 16 (`apps/web`)
- **Server:** Elysia + oRPC (`apps/server`)
- **AI:** Groq (chat, transcription)
- Monorepo managed with Bun + Turborepo.

## Run locally

Requires [Bun](https://bun.sh).

```bash
bun install
```

Create `apps/web/.env`:

```
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
GROQ_API_KEY=your_groq_api_key
```

Create `apps/server/.env`:

```
CORS_ORIGIN=http://localhost:3001
NODE_ENV=development
PORT=3000
```

Start the dev servers:

```bash
bun run dev:server   # http://localhost:3000
bun run dev:web      # http://localhost:3001
```

Open http://localhost:3001.

## License

MIT.
