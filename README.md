# LOOP Area Tutorial — app Next.js 15

Area riservata per l'onboarding clienti al sistema LOOP di arbitraggio
matematico su XAUUSD.

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Video**: Bunny.net Stream con iframe embed + postMessage tracking
- **Hosting**: Vercel free tier

## Sviluppo locale

```bash
cp .env.example .env.local
# compila le chiavi Supabase + Bunny
npm install
npm run dev
# → http://localhost:3000
```

## Struttura

```
src/
├─ app/
│  ├─ layout.tsx        # layout root + font Plus Jakarta Sans
│  ├─ globals.css       # brand LOOP (navy/blue) + utility Tailwind
│  ├─ page.tsx          # redirect → /login o /area (in base al ruolo)
│  ├─ login/            # pagina pubblica di login
│  ├─ area/             # area cliente — moduli + checklist
│  ├─ player/[mid]/     # player video + note + capitoli
│  ├─ admin/            # console admin
│  │  ├─ page.tsx             # lista clienti + KPI
│  │  ├─ clients/[id]/        # dettaglio cliente
│  │  └─ new-client/          # crea cliente
│  └─ api/
│     ├─ auth/logout/         # POST → signOut + redirect
│     ├─ progress/save/       # POST → upsert progress
│     └─ admin/clients/       # POST → admin.createUser
├─ components/
│  ├─ LoopLogo.tsx
│  ├─ Sidebar.tsx
│  ├─ ModuleCard.tsx
│  ├─ Checklist.tsx
│  ├─ BunnyPlayer.tsx         # iframe Bunny + tracking postMessage
│  └─ PlayerTabs.tsx          # capitoli / note / risorse
├─ lib/
│  ├─ types.ts
│  ├─ modules-state.ts        # logica locked/in_progress/completed
│  └─ supabase/{client,server,middleware}.ts
└─ middleware.ts              # auth + redirect in base al ruolo
supabase/
├─ migrations/001_init.sql    # 7 tabelle + RLS + trigger + view
└─ seed.sql                   # 6 moduli + 5 step checklist
```

## Deploy

Vedi **DEPLOY.md**.

## Sicurezza

- Tutte le tabelle hanno **RLS enabled** (policy definite in `001_init.sql`)
- `SUPABASE_SERVICE_ROLE_KEY` usata SOLO nelle API route admin (server-side)
- Middleware blocca `/area` e `/admin` per utenti non autenticati
- `/admin/*` accessibile solo a `profiles.role = 'admin'`
- Tracking video (`video_views`) include user_id: rispetta RLS "own rows only"

## Roadmap (nice-to-have)

- [ ] Email transazionale all'invito cliente (Resend free tier 100 mail/giorno)
- [ ] Download PDF certificato di completamento
- [ ] Analytics aggregato per admin (Chart.js su video_views)
- [ ] i18n EN oltre a IT
