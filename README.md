# note

A personal online notes app that accessible on any device. Your notes live in your own Supabase database, the site is hosted for free on GitHub Pages. no VPS and no paid plans!

## Features

- Create, edit, search and delete notes
- Rich text editor (Tiptap) with autosave
- Responsive, mobile-first layout (phone, tablet, desktop)
- Light and dark theme with a System / Light / Dark switch
- Email + password login, optional two-factor authentication (TOTP)
- Optional: installable as an app (PWA), JSON export, client-side encryption

## Tech stack

| Part | Technology |
|---|---|
| Frontend | Vue 3, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| State and routing | Pinia, Vue Router (hash mode) |
| Editor | Tiptap |
| Backend | Supabase (Postgres + Auth), no custom server |
| Hosting | GitHub Pages, deployed by GitHub Actions |

## How security works

This repo is public, so the Supabase project URL and `anon` key are public too. That is normal for Supabase. Your data is protected by:

- **Row Level Security (RLS):** the database only returns or changes notes that belong to the logged-in user.
- **Signups disabled:** only the account you created can log in.
- **Strict Content Security Policy** and no `v-html`, so note content cannot run scripts.
- **No secrets in the repo.** Never commit the `service_role` key or any password.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run:

```sql
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  content text not null default '' check (char_length(content) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;
alter table public.notes force row level security;

create policy "owner select" on public.notes for select to authenticated using (auth.uid() = user_id);
create policy "owner insert" on public.notes for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update" on public.notes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.notes for delete to authenticated using (auth.uid() = user_id);

create index notes_user_updated_idx on public.notes (user_id, updated_at desc);

create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger notes_set_updated_at before update on public.notes
for each row execute function public.set_updated_at();
```

3. Authentication, Users: add your user (email + long unique password, email confirmed).
4. Authentication settings: turn **off** "Allow new users to sign up".
5. Authentication, URL Configuration: set the Site URL and a Redirect URL to `https://<github-user>.github.io/anynote/`.
6. Project Settings, API: copy the Project URL and the `anon` public key.

### 2. Run locally

```bash
git clone https://github.com/<github-user>/anynote.git
cd anynote
npm ci
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Start the dev server:

```bash
npm run dev
```

### 3. Deploy to GitHub Pages

1. In `vite.config.ts`, make sure `base` is `'/anynote/'` (it must match the repo name).
2. Repo Settings, Secrets and variables, Actions, **Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Repo Settings, Pages: set Source to **GitHub Actions**.
4. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the app and publishes it.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm audit` | Check dependencies for known vulnerabilities |

## Project structure

```
src/
  main.ts, App.vue, style.css
  lib/supabase.ts
  stores/          auth, notes, theme
  router/          hash-mode routes
  views/           LoginView, NotesView
  components/      NoteList, NoteEditor, ThemeToggle
public/            theme-init.js, icons
.github/workflows/ deploy.yml
```
