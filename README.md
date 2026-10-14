# Waymaker

A quiet, personal tracker for the things you are walking toward.

Set a **purchase**, a **habit**, or a **project**. Log progress, break work into steps, pin reminders, and think on a drawing board. Powered by a live Supabase database with offline support and PWA installability.

## Features

- Three mark types: save toward a thing, show up for a habit, or walk a project in steps
- Home “today” list for habits, reminders, and next project steps
- Live Supabase cloud synchronization with offline-first local storage
- Drawing board with pen, arrows, highlighter, eraser, and sticky notes
- Pulse view for streaks, check-ins, and progress by kind
- Mobile reminders & system push notifications via Service Worker
- Installable as a standalone app (PWA)

## Run locally

```bash
npm install
npm run dev
```

Then open the URL printed in the terminal (port 8080).

```bash
npm run build      # production build
npm run typecheck  # TypeScript
```

## Stack

React 19, TanStack Start / Router, Tailwind v4, Supabase, Zustand, Recharts, Vaul drawers.

