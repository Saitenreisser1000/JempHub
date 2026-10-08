-- Supabase Schema für GuitarJemp (Accounts + Library + Sharing + Rollen)
-- Ausführen im Supabase SQL Editor (oder via Migration, falls du supabase-cli nutzt).

-- Benötigt für gen_random_uuid()
create extension if not exists pgcrypto;

-- 1) Profile / Rollen
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now()
);

-- Öffentliches Directory (minimal), damit User andere finden/adden können.
-- Wichtig: Rollen sollen nicht öffentlich auslesbar sein -> daher separate Tabelle.
create table if not exists public.profile_directory (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- Legacy-Daten vorbereiten: fehlende Nicknames aus Metadata übernehmen, sonst neutraler Fallback.
update public.profiles p
set display_name = coalesce(
  nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
  'Player-' || substr(p.id::text, 1, 8)
)
from auth.users u
where u.id = p.id
  and (p.display_name is null or length(trim(p.display_name)) = 0);

update public.profile_directory d
set display_name = coalesce(
  nullif(trim(p.display_name), ''),
  nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
  'Player-' || substr(d.id::text, 1, 8)
)
from auth.users u
left join public.profiles p on p.id = u.id
where u.id = d.id
  and (d.display_name is null or length(trim(d.display_name)) = 0);

-- Nickname serverseitig erzwingen (nicht leer, begrenzte Länge).
alter table public.profiles
  alter column display_name set not null;

alter table public.profile_directory
  alter column display_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_display_name_length_chk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length_chk
      check (length(trim(display_name)) between 2 and 40);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_directory_display_name_length_chk'
      and conrelid = 'public.profile_directory'::regclass
  ) then
    alter table public.profile_directory
      add constraint profile_directory_display_name_length_chk
      check (length(trim(display_name)) between 2 and 40);
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.profile_directory enable row level security;
alter table public.profiles force row level security;
alter table public.profile_directory force row level security;

-- Profile automatisch bei Signup anlegen.
-- Das ist wichtig, wenn Email-Confirmation aktiv ist (dann gibt es beim Signup evtl. noch keine Session).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    'Player-' || substr(new.id::text, 1, 8)
  );

  insert into public.profiles (id, display_name, role)
  values (new.id, v_display_name, 'student')
  on conflict (id) do nothing;

  insert into public.profile_directory (id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- display_name aus profiles in profile_directory spiegeln
create or replace function public.sync_profile_directory()
returns trigger as $$
begin
  insert into public.profile_directory (id, display_name)
  values (new.id, new.display_name)
  on conflict (id) do update set display_name = excluded.display_name;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profiles_upsert_sync_directory on public.profiles;
create trigger on_profiles_upsert_sync_directory
after insert or update of display_name on public.profiles
for each row execute procedure public.sync_profile_directory();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Re-run safety: Policies vor erneutem Erstellen entfernen (löscht keine Tabellen-Daten).
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "profile_directory_select_authenticated" on public.profile_directory;
drop policy if exists "profile_directory_upsert_own" on public.profile_directory;
drop policy if exists "profile_directory_update_own" on public.profile_directory;

-- Nutzer darf eigenes Profil lesen/updaten
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Directory: jeder authentifizierte User darf suchen/lesen
create policy "profile_directory_select_authenticated"
  on public.profile_directory for select
  using (auth.role() = 'authenticated');

-- Directory: User darf eigenen Eintrag setzen/ändern (optional, trigger macht's ohnehin)
create policy "profile_directory_upsert_own"
  on public.profile_directory for insert
  with check (auth.uid() = id);

create policy "profile_directory_update_own"
  on public.profile_directory for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Optional: andere Profile lesen, aber nur minimale Daten (für Suche/Connections)
-- (wenn du das willst, kannst du ein View statt policy verwenden).

-- 2) Verbindungen (Connections) zwischen Accounts
create table if not exists public.connections (
  id bigint generated by default as identity primary key,
  requester_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Falls die Tabelle schon existiert: Default nachziehen.
alter table public.connections alter column requester_id set default auth.uid();

create index if not exists connections_requester_idx on public.connections(requester_id);
create index if not exists connections_addressee_idx on public.connections(addressee_id);

alter table public.connections enable row level security;
alter table public.connections force row level security;

-- Re-run safety: nur droppen, nachdem die Tabelle sicher existiert.
drop policy if exists "connections_select_participants" on public.connections;
drop policy if exists "connections_insert_requester" on public.connections;
drop policy if exists "connections_update_participants" on public.connections;
drop policy if exists "connections_delete_participants" on public.connections;

create policy "connections_select_participants"
  on public.connections for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "connections_insert_requester"
  on public.connections for insert
  with check (auth.uid() = requester_id);

create policy "connections_update_participants"
  on public.connections for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "connections_delete_participants"
  on public.connections for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Helper View: akzeptierte Connections (symmetrisch verwendbar)
create or replace view public.accepted_connections as
select
  case when requester_id < addressee_id then requester_id else addressee_id end as user_a,
  case when requester_id < addressee_id then addressee_id else requester_id end as user_b
from public.connections
where status = 'accepted';

-- 3) Library Items: Songs/Übungen als JSON (skalierbar, schema-evolvable)
create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('song', 'exercise')),
  title text not null,
  category text,
  visibility text not null default 'private' check (visibility in ('private', 'connections', 'public')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Falls die Tabelle schon existiert: Default nachziehen.
alter table public.library_items alter column owner_id set default auth.uid();

create index if not exists library_items_owner_idx on public.library_items(owner_id);
create index if not exists library_items_visibility_idx on public.library_items(visibility);

alter table public.library_items enable row level security;
alter table public.library_items force row level security;

-- Re-run safety: nur droppen, nachdem die Tabelle sicher existiert.
drop policy if exists "library_items_owner_select" on public.library_items;
drop policy if exists "library_items_owner_insert" on public.library_items;
drop policy if exists "library_items_owner_update" on public.library_items;
drop policy if exists "library_items_owner_delete" on public.library_items;
drop policy if exists "library_items_public_select" on public.library_items;
drop policy if exists "library_items_connections_select" on public.library_items;
drop policy if exists "library_items_shared_select" on public.library_items;

-- updated_at automatisch
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_library_items_updated_at on public.library_items;
create trigger set_library_items_updated_at
before update on public.library_items
for each row execute function public.set_updated_at();

-- Owner darf alles
create policy "library_items_owner_select"
  on public.library_items for select
  using (auth.uid() = owner_id);

create policy "library_items_owner_insert"
  on public.library_items for insert
  with check (auth.uid() = owner_id);

create policy "library_items_owner_update"
  on public.library_items for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "library_items_owner_delete"
  on public.library_items for delete
  using (auth.uid() = owner_id);

-- Public: jeder authentifizierte User darf public sehen
create policy "library_items_public_select"
  on public.library_items for select
  using (visibility = 'public' and auth.role() = 'authenticated');

-- Connections: sichtbar, wenn accepted connection zwischen viewer und owner existiert
create policy "library_items_connections_select"
  on public.library_items for select
  using (
    visibility = 'connections'
    and exists (
      select 1
      from public.accepted_connections ac
      where (ac.user_a = auth.uid() and ac.user_b = owner_id)
         or (ac.user_b = auth.uid() and ac.user_a = owner_id)
    )
  );

-- 4) Optional: explizites Teilen (z.B. Lehrer -> Schüler), granularer als visibility
create table if not exists public.library_item_shares (
  id bigint generated by default as identity primary key,
  library_item_id uuid not null references public.library_items(id) on delete cascade,
  shared_with_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (library_item_id, shared_with_id)
);

create index if not exists library_item_shares_item_idx on public.library_item_shares(library_item_id);
create index if not exists library_item_shares_user_idx on public.library_item_shares(shared_with_id);

alter table public.library_item_shares enable row level security;
alter table public.library_item_shares force row level security;

-- Re-run safety: nur droppen, nachdem die Tabelle sicher existiert.
drop policy if exists "library_item_shares_owner_insert" on public.library_item_shares;
drop policy if exists "library_item_shares_owner_delete" on public.library_item_shares;
drop policy if exists "library_item_shares_participants_select" on public.library_item_shares;
drop policy if exists "library_item_shares_select_recipient" on public.library_item_shares;
drop policy if exists "library_item_shares_select_owner" on public.library_item_shares;

-- Helper: Ownership-Check ohne RLS-Rekursion.
-- (Verhindert "infinite recursion detected in policy" durch gegenseitige Policy-Queries)
create or replace function public.is_library_item_owner(p_library_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.library_items li
    where li.id = p_library_item_id
      and li.owner_id = auth.uid()
  );
$$;

create policy "library_item_shares_owner_insert"
  on public.library_item_shares for insert
  with check (
    public.is_library_item_owner(library_item_id)
  );

create policy "library_item_shares_owner_delete"
  on public.library_item_shares for delete
  using (
    public.is_library_item_owner(library_item_id)
  );

create policy "library_item_shares_select_recipient"
  on public.library_item_shares for select
  using (auth.uid() = shared_with_id);

create policy "library_item_shares_select_owner"
  on public.library_item_shares for select
  using (public.is_library_item_owner(library_item_id));

-- Items via share sichtbar
create policy "library_items_shared_select"
  on public.library_items for select
  using (
    exists (
      select 1 from public.library_item_shares s
      where s.library_item_id = public.library_items.id and s.shared_with_id = auth.uid()
    )
  );

-- 5) One-time helper: einzigen bestehenden User auf festen Nickname setzen.
-- Nur verwenden, wenn in der Instanz wirklich genau ein User existiert.
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise notice 'No user found in auth.users.';
    return;
  end if;

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', 'saitenreisser')
  where id = v_user_id;

  update public.profiles
  set display_name = 'saitenreisser'
  where id = v_user_id;

  update public.profile_directory
  set display_name = 'saitenreisser'
  where id = v_user_id;
end $$;
