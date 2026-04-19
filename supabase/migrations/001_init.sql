-- =============================================================
-- LOOP Area Tutorial — schema iniziale
-- Supabase (PostgreSQL) — free tier
-- =============================================================
-- Eseguire in Supabase Studio > SQL Editor oppure via CLI:
--   supabase db push
-- =============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- profiles  (1:1 con auth.users)
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  role          text not null default 'client' check (role in ('client','admin')),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz,
  metadata      jsonb not null default '{}'::jsonb
);

comment on table public.profiles is 'Profilo utente esteso - 1:1 con auth.users';
comment on column public.profiles.role is 'client = cliente onboarding, admin = Luca/team LOOP';

-- Auto-create profile quando nasce un nuovo auth.user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- modules  (catalogo statico — 6 video)
-- -------------------------------------------------------------
create table if not exists public.modules (
  id             text primary key,         -- 'm1'..'m6'
  order_index    int  not null unique,
  title          text not null,
  description    text not null,
  duration       text not null,            -- '14:32'
  level          text not null,            -- 'Base','Avanzato'...
  bunny_video_id text,                     -- GUID video Bunny.net
  chapters       jsonb not null default '[]'::jsonb,
  resources      jsonb not null default '[]'::jsonb,
  published      boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on column public.modules.bunny_video_id is 'GUID Bunny Stream - popolato dopo upload video';

-- -------------------------------------------------------------
-- progress  (stato per utente × modulo)
-- -------------------------------------------------------------
create table if not exists public.progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  module_id    text not null references public.modules(id)   on delete cascade,
  watched_pct  int  not null default 0 check (watched_pct between 0 and 100),
  done         boolean not null default false,
  notes        text not null default '',
  updated_at   timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, module_id)
);

create index if not exists idx_progress_user   on public.progress(user_id);
create index if not exists idx_progress_module on public.progress(module_id);

-- -------------------------------------------------------------
-- checklist_items  (catalogo statico — 5 step onboarding)
-- -------------------------------------------------------------
create table if not exists public.checklist_items (
  id          text primary key,   -- 'c1'..'c5'
  order_index int  not null unique,
  title       text not null,
  subtitle    text not null
);

-- -------------------------------------------------------------
-- user_checklist  (stato checklist per utente)
-- -------------------------------------------------------------
create table if not exists public.user_checklist (
  user_id      uuid not null references public.profiles(id)       on delete cascade,
  item_id      text not null references public.checklist_items(id) on delete cascade,
  done         boolean not null default false,
  updated_at   timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, item_id)
);

create index if not exists idx_chk_user on public.user_checklist(user_id);

-- -------------------------------------------------------------
-- video_views  (tracking eventi Bunny.net)
-- -------------------------------------------------------------
create table if not exists public.video_views (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  module_id   text not null references public.modules(id)  on delete cascade,
  event_type  text not null check (event_type in ('play','pause','seek','complete','heartbeat')),
  watched_pct int,
  ts          timestamptz not null default now()
);

create index if not exists idx_views_user_module on public.video_views(user_id, module_id);
create index if not exists idx_views_ts          on public.video_views(ts);

-- -------------------------------------------------------------
-- admin_invites  (token per creazione cliente via email)
-- -------------------------------------------------------------
create table if not exists public.admin_invites (
  id             uuid primary key default uuid_generate_v4(),
  email          text not null,
  full_name      text,
  invited_by     uuid not null references public.profiles(id),
  token          text not null unique default encode(gen_random_bytes(24),'hex'),
  used           boolean not null default false,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '14 days',
  used_at        timestamptz,
  resulting_user uuid references public.profiles(id)
);

create index if not exists idx_invites_token on public.admin_invites(token);
create index if not exists idx_invites_email on public.admin_invites(email);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table public.profiles        enable row level security;
alter table public.modules         enable row level security;
alter table public.progress        enable row level security;
alter table public.checklist_items enable row level security;
alter table public.user_checklist  enable row level security;
alter table public.video_views     enable row level security;
alter table public.admin_invites   enable row level security;

-- Helper function: is current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- profiles --------------------------------------------------------
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- modules ---------------------------------------------------------
drop policy if exists "modules_read_all" on public.modules;
create policy "modules_read_all" on public.modules
  for select using (auth.role() = 'authenticated');

drop policy if exists "modules_admin_write" on public.modules;
create policy "modules_admin_write" on public.modules
  for all using (public.is_admin()) with check (public.is_admin());

-- progress --------------------------------------------------------
drop policy if exists "progress_self_rw" on public.progress;
create policy "progress_self_rw" on public.progress
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- checklist_items -------------------------------------------------
drop policy if exists "chkitems_read_all" on public.checklist_items;
create policy "chkitems_read_all" on public.checklist_items
  for select using (auth.role() = 'authenticated');

drop policy if exists "chkitems_admin_write" on public.checklist_items;
create policy "chkitems_admin_write" on public.checklist_items
  for all using (public.is_admin()) with check (public.is_admin());

-- user_checklist --------------------------------------------------
drop policy if exists "user_chk_self_rw" on public.user_checklist;
create policy "user_chk_self_rw" on public.user_checklist
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- video_views -----------------------------------------------------
drop policy if exists "views_self_insert" on public.video_views;
create policy "views_self_insert" on public.video_views
  for insert with check (user_id = auth.uid());

drop policy if exists "views_self_select" on public.video_views;
create policy "views_self_select" on public.video_views
  for select using (user_id = auth.uid() or public.is_admin());

-- admin_invites (solo admin) --------------------------------------
drop policy if exists "invites_admin_all" on public.admin_invites;
create policy "invites_admin_all" on public.admin_invites
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- VIEWS utili per admin
-- =============================================================

create or replace view public.v_client_progress as
select
  p.id         as user_id,
  p.email,
  p.full_name,
  p.created_at as joined_at,
  p.last_login_at,
  coalesce(
    (select count(*) from public.progress pr
       where pr.user_id = p.id and pr.done = true), 0
  )::int as modules_done,
  (select count(*) from public.modules where published = true)::int as modules_total,
  coalesce(
    (select count(*) from public.user_checklist uc
       where uc.user_id = p.id and uc.done = true), 0
  )::int as checklist_done,
  (select count(*) from public.checklist_items)::int as checklist_total,
  coalesce(
    (select max(ts) from public.video_views v where v.user_id = p.id), p.created_at
  ) as last_activity_at
from public.profiles p
where p.role = 'client';

grant select on public.v_client_progress to authenticated;

-- =============================================================
-- END migration 001_init
-- =============================================================
