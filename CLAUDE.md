# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this repo is

DuHoc24 — a sample "study-abroad application portal" built as the **Week 1 deliverable of a 6-week course**. Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui. All UI copy is Vietnamese.

It is **UI only, and deliberately so**. There is no API route, no database, no auth, no `/login`. Every list, table, and chat reply is hardcoded. Before "fixing" a stub, read the week-by-week roadmap in [README.md](README.md) — Gemini chat (Wk 2), Supabase + working forms (Wk 3), document extraction (Wk 4), Make.com automation (Wk 5), auth + RLS (Wk 6). Missing wiring is usually the assignment, not a bug.

## Commands

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint    # eslint flat config; takes no path arg as written
```

No test framework is configured — there is nothing to run, and no place to add a test without introducing one.

`node_modules/` is not checked in and may be absent. AGENTS.md requires reading `node_modules/next/dist/docs/` before writing App Router code, so run `npm install` first or that directory won't exist.

## Architecture

### One data module feeds everything

[lib/mock-data.ts](lib/mock-data.ts) is the single source for all page data — schools, service packages, admission requests, student profiles, conversations, and `currentStudent` (the pretend logged-in user for `/portal`). Nine files import from it. It also owns the domain types and their **Vietnamese snake_case status enums**:

- `DocStatus` — `chua_nop | dang_xu_ly | hop_le | can_nop_lai`
- `RequestStatus` — `cho_duyet | da_duyet | tu_choi`
- `ServicePackage` — `co_ban | toan_dien`

Keep those keys as-is; they are meant to become database column values in Week 3. The inline chat replies are the one exception — they live in `cannedAnswers` inside [components/landing/chat-widget.tsx](components/landing/chat-widget.tsx), not in `mock-data.ts`.

### Status enum → UI is centralized in one file

[components/status-badge.tsx](components/status-badge.tsx) maps every status value to a label, a tone (`gray | yellow | green | red`), and an icon via the `docStatusMeta` / `requestStatusMeta` records, then exposes `DocStatusBadge` / `RequestStatusBadge`. Adding a status value means adding it to the enum in `mock-data.ts` **and** to the matching meta record — TypeScript's `Record<Enum, …>` will flag the second half if you forget.

### Three surfaces, two shells

- **Public** (`/`, `/portal`) — `SiteHeader` + `SiteFooter` composed per page; there is no shared layout beyond the root. Landing page assembles `Hero`, `QuoteForm`, `Highlights`, plus a fixed-position `ChatWidget`.
- **Admin** (`/admin/*`) — real nested layout at [app/admin/layout.tsx](app/admin/layout.tsx) wrapping every page with `AdminSidebar` (desktop) and `AdminMobileNav` (mobile), both driven by the exported `adminNavItems` array in [components/admin/sidebar.tsx](components/admin/sidebar.tsx). Add a route there, not in each page. `/admin` itself just `redirect()`s to `/admin/requests`. All four admin pages follow the same shape: `AdminPageHeader` + a `Card`-wrapped `Table`.

The header's "Điểm chuẩn trường" link points at `#` — the public schools page is Week 3 work and does not exist yet.

### Server-by-default

Only six app files opt into `"use client"`: the two nav components, `ChatWidget`, `QuoteForm`, and the interactive shadcn primitives (`label`, `radio-group`, `select`, `table`). Everything else, including all admin pages, is a server component. Keep it that way — push interactivity down into a leaf component rather than marking a page client.

Route props use Next 16's generated types (`LayoutProps<"/">` in [app/layout.tsx](app/layout.tsx)), which come from `.next/types` — they resolve only after a dev/build run.

### Styling

Tailwind v4 with zero config file; the whole theme lives in [app/globals.css](app/globals.css) as oklch custom properties bridged into Tailwind via `@theme inline`. Use semantic tokens (`bg-card`, `text-muted-foreground`, `border-input`, `bg-sidebar-accent`) rather than raw palette colors — the status badge tones are the deliberate exception. `.dark` values are defined but nothing ever sets the class, so the site renders light-only.

## Git rules

These are hard rules, not preferences:

- **Always ask for confirmation before pushing to GitHub.** Committing locally on request is fine; `git push` needs an explicit yes each time. (*Luôn hỏi xác nhận trước khi push lên GitHub.*)
- **Never commit `.env` or any file containing an API key or secret** — no exceptions, no "just this once" for a test value. (*Không bao giờ commit file `.env` hoặc bất kỳ file chứa API key.*)

[.env.example](.env.example) is the one tracked env file. It is a template and must stay value-free: variable names and comments only, never a real key. `.gitignore` uses `.env*` with a single `!.env.example` exception, so any new env file — `.env.local`, `.env.production`, `.env.staging` — is ignored by default. Don't narrow that pattern.

## Conventions

- Path alias `@/*` maps to the repo root; imports are `@/components/…`, `@/lib/…`.
- Add UI primitives with the shadcn CLI, not by hand — [components.json](components.json) pins style `base-nova` on Base UI, with an extra `@tailark-oss` registry for the landing blocks.
- Currency is formatted inline as `value.toLocaleString("vi-VN") + "₫"`; the helper is duplicated in `quote-form.tsx` and `admin/requests/page.tsx`.
- Remote images are Unsplash URLs; [next.config.ts](next.config.ts) allowlists only `images.unsplash.com`, so a new remote host needs a `remotePatterns` entry.
- User-facing strings are Vietnamese, including `aria-label`s. Comments in `lib/mock-data.ts` and `.env.example` are Vietnamese too — match the surrounding language when editing those files.
- [.env.example](.env.example) lists Supabase and site-URL vars that **nothing reads yet**; `npm run dev` needs no environment at all.
