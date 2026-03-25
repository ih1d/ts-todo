# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Anrim is a full-stack Todo app. The backend is built with Express 5, Prisma ORM (PostgreSQL via `@prisma/adapter-pg`), and TypeScript. The frontend is a React SPA using Vite, Tailwind CSS v4, and React Router.

## Commands

- **Run the frontend dev server:** `npx vite`
- **Build the frontend:** `npx vite build` (outputs to `dist/client/`)
- **Run the backend server:** `npx tsx src/index.ts`
- **Generate Prisma client:** `npx prisma generate`
- **Run migrations:** `npx prisma migrate dev`
- **Create a migration:** `npx prisma migrate dev --name <migration_name>`
- **Type check:** `npx tsc --noEmit`
- **No test runner configured yet** (`npm test` is a placeholder)

## Architecture

### Backend
- **`src/index.ts`** — Express app entry point. Defines REST endpoints for `/todos` (CRUD).
- **`src/db.ts`** — Prisma client singleton using `@prisma/adapter-pg` driver adapter. Reads `DATABASE_URL` from environment.
- **`prisma/schema.prisma`** — Single `Todo` model with PostgreSQL datasource.
- **`prisma.config.ts`** — Prisma config pointing to schema and migrations directory; loads env via `dotenv/config`.

### Frontend
- **`src/client/main.tsx`** — React app entry point; mounts the app with BrowserRouter.
- **`src/client/App.tsx`** — Top-level routes (`/login`, `/signup`).
- **`src/client/pages/`** — Page components (Login, SignUp).
- **`src/client/index.css`** — Tailwind CSS v4 import.
- **`vite.config.ts`** — Vite config with React plugin, Tailwind plugin, and API proxy to backend.
- **`index.html`** — HTML entry point for Vite.

## Key Details

- ESM project (`"type": "module"` in package.json) — imports must use `.js` extensions for local files.
- TypeScript strict mode enabled with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Module resolution is `bundler` (compatible with both Vite and Node via tsx).
- Database connection string comes from `DATABASE_URL` env var (use a `.env` file).
- Uses Prisma's PostgreSQL driver adapter (`@prisma/adapter-pg`), not the default Prisma engine.
- Vite dev server proxies `/todos` requests to the backend at `http://localhost:3000`.
