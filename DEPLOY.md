# Deploy LOOP Area Tutorial — guida passo-passo

Stack: **Next.js 15 (Vercel) + Supabase (PostgreSQL + Auth) + Bunny.net Stream**.
Obiettivo: costo mensile **≈ 0 €** sfruttando i free tier, con possibilità di
scalare a pochi € al mese quando crescono i clienti.

> Tempo stimato totale: ~60 minuti alla prima volta.

---

## 0. Prerequisiti

- Node.js 20+ installato localmente
- Account GitHub (gratis)
- Carta di credito pronta per verifica account Vercel/Supabase (nessun addebito sul free tier)

---

## 1. Supabase — database + autenticazione

### 1.1 Crea il progetto

1. Vai su <https://supabase.com> → **New project**
2. Organization: personale
3. Nome progetto: `loop-area-tutorial`
4. Database password: genera e salva in 1Password (servirà solo per psql)
5. Region: **Frankfurt (eu-central-1)** per GDPR
6. Plan: **Free** (500 MB DB + 50.000 MAU sono più che sufficienti)

Attendi ~2 min che il progetto sia pronto.

### 1.2 Applica le migrazioni

In Supabase Studio → **SQL Editor** → **New query** → incolla in ordine:

1. `supabase/migrations/001_init.sql` → **Run**
2. `supabase/migrations/002_harden_rls_and_indexes.sql` → **Run** (hardening RLS + indici FK)
3. `supabase/migrations/003_split_admin_write_policies.sql` → **Run** (split policy admin)
4. `supabase/seed.sql` → **Run** (6 moduli + 5 checklist)

> Dopo ogni migrazione, esegui un `get_advisors` dalla dashboard Supabase
> (Settings → Advisors) e verifica che non ci siano ERROR/WARN residui.

Verifica: **Table Editor** ora mostra 7 tabelle
(`profiles`, `modules`, `progress`, `checklist_items`, `user_checklist`,
`video_views`, `admin_invites`) e `modules` contiene 6 righe.

### 1.3 Recupera le chiavi

**Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠ SEGRETA, mai nel frontend)

### 1.4 Crea il primo admin (te stesso)

**Authentication → Users → Add user → Create new user**:
- Email: `luca@lucadigioia.ch`
- Password: scegline una forte
- Email confirm: **ON**

Poi vai in **SQL Editor** e lancia:

```sql
update public.profiles
set role = 'admin', full_name = 'Luca Di Gioia'
where email = 'luca@lucadigioia.ch';
```

---

## 2. Bunny.net Stream — video hosting

> Alternativa a Vimeo/Mux: €0,01/GB di banda, 5 €/mese minimo fatturato.
> Con 50 clienti e video totali ~600 MB visti 2 volte = ~60 GB/mese → **~0,60 €/mese**.
> Il minimo mensile è **5 €** (primo addebito dopo 30 gg).

### 2.1 Crea la Stream Library

1. <https://bunny.net> → registrati → attiva **Stream** dal pannello
2. **+ Add Video Library**
   - Name: `loop-area-tutorial`
   - Replication: **Europe only** (GDPR)
   - Encoding: `original` + `360p/540p/720p/1080p`
   - Player: abilita **Controls**, **Keyboard Shortcuts**
   - ⚠ disabilita *Enable Token Authentication* per ora (semplifica embed)
3. Copia dalla sidebar:
   - `Library ID` → `NEXT_PUBLIC_BUNNY_LIBRARY_ID`
   - `CDN Hostname` (`vz-xxxxx.b-cdn.net`) → `NEXT_PUBLIC_BUNNY_CDN_HOSTNAME`
   - `API Key` (in Stream > API) → `BUNNY_STREAM_API_KEY`

### 2.2 Carica i video

Per ogni modulo:

1. Apri la library → **Upload new video**
2. Drag & drop il file video
3. Attendi encoding (5-10 min per video di 15 min)
4. Clicca il video → copia il **GUID** (colonna "Video ID")
5. In Supabase SQL Editor:

   ```sql
   update public.modules set bunny_video_id = 'GUID-QUI' where id = 'm1';
   -- ripeti per m2..m6
   ```

Finché un modulo non ha `bunny_video_id`, la pagina player mostra un placeholder
"Video in arrivo" (così puoi pubblicare l'app prima di avere tutti i video).

---

## 3. Vercel — deploy dell'app

### 3.1 Push su GitHub

```bash
cd 02-production-app
git init
git add .
git commit -m "init: LOOP Area Tutorial"
# crea repo su GitHub (privato!), poi:
git remote add origin git@github.com:<tuo-user>/loop-area-tutorial.git
git branch -M main
git push -u origin main
```

### 3.2 Importa su Vercel

1. <https://vercel.com> → **Add New → Project**
2. Import `loop-area-tutorial`
3. Framework preset: **Next.js** (auto-rilevato)
4. **Environment Variables** — aggiungi tutte quelle di `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_BUNNY_LIBRARY_ID`
   - `NEXT_PUBLIC_BUNNY_CDN_HOSTNAME`
   - `BUNNY_STREAM_API_KEY`
   - `NEXT_PUBLIC_SITE_URL` (lo aggiornerai dopo il primo deploy)
5. **Deploy**

Dopo 1-2 min avrai l'URL `https://loop-area-tutorial-<hash>.vercel.app`.
Aggiornalo in `NEXT_PUBLIC_SITE_URL` e in Supabase → **Authentication → URL Configuration**:
- `Site URL`: `https://loop-area-tutorial-<hash>.vercel.app`
- `Redirect URLs`: stesso valore + `/login`

### 3.3 Custom domain (opzionale)

Se hai `area.lucadigioia.ch`:

1. Vercel → Project → **Settings → Domains → Add**
2. Inserisci `area.lucadigioia.ch`
3. Aggiungi il CNAME `cname.vercel-dns.com` nel tuo DNS
4. Aggiorna `Site URL` su Supabase con il nuovo dominio

---

## 4. Verifica end-to-end

1. Apri l'URL → dovresti vedere la pagina login
2. Entra con `luca@lucadigioia.ch` + password admin → redirect a `/admin`
3. Crea un cliente di test (`+ Nuovo cliente`)
4. Copia le credenziali, apri **finestra incognito**, loggati con le creds cliente
5. Verifica: vedi l'area corso, i 6 moduli, la checklist
6. Clicca modulo 1 → se hai caricato il video Bunny, viene riprodotto;
   altrimenti vedi il placeholder "Video in arrivo"
7. Torna admin → `/admin/clients/<id>` → verifica che le attività siano tracciate

---

## 5. Manutenzione

### Backup database
Supabase fa backup giornalieri automatici (7 giorni di retention sul free tier).
Per un backup manuale:

```bash
npx supabase db dump --db-url "$DB_URL" > backup-$(date +%F).sql
```

### Aggiornare contenuti moduli
Modifica `supabase/seed.sql` e ri-lancia: usa `on conflict do update` per
aggiornare titoli, capitoli, risorse senza perdere i progressi utente.

### Rotazione password admin
Authentication → Users → click su di te → Send password reset email.

---

## 6. Costi reali attesi (50 clienti attivi/mese)

| Servizio       | Free tier              | Costo oltre  |
|----------------|------------------------|--------------|
| Vercel Hobby   | 100 GB bandwidth       | 0 €          |
| Supabase Free  | 500 MB DB + 50k MAU    | 0 €          |
| Bunny.net      | € 5/mese minimo        | ~5-6 €/mese  |
| Dominio .ch    | —                      | ~15 €/anno   |
| **Totale**     |                        | **~7 €/mese**|

---

## 7. Troubleshooting rapido

**Login non funziona in produzione ma funziona in locale**
→ Supabase Site URL non aggiornato. Controlla `Authentication → URL Configuration`.

**Video non parte**
→ Verifica `NEXT_PUBLIC_BUNNY_LIBRARY_ID` e che il GUID in `modules.bunny_video_id`
sia quello del video (non del playlist).

**"row-level security policy violation"**
→ Il trigger `handle_new_user` non ha creato la riga `profiles`. Controlla in SQL Editor:
```sql
select count(*) from public.profiles;
```

**Reset completo database**
Supabase Studio → Database → Backups → Restore, oppure:
```sql
truncate table profiles, modules, progress, checklist_items,
  user_checklist, video_views, admin_invites restart identity cascade;
```
e ri-lancia le migrazioni.

---
Per dubbi: rileggere `README.md` del bundle oppure scrivere a `luca@lucadigioia.ch`.
