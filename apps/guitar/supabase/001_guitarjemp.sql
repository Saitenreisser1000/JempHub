-- GuitarJemp v2 – Datenbank-Schema
-- Einmal im Supabase Studio unter "SQL Editor" ausführen. Das Skript ist
-- wiederholbar: erneutes Ausführen ändert vorhandene Daten nicht.
-- Alle Objekte tragen das Präfix gj_, damit nichts anderes berührt wird.

begin;

-- ---------------------------------------------------------------- Tabellen

create table if not exists public.gj_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);

create table if not exists public.gj_exercises (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Untitled exercise' check (char_length(title) <= 200),
  data jsonb not null check (octet_length(data::text) <= 500000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gj_exercises_owner_idx on public.gj_exercises (owner);

create table if not exists public.gj_shares (
  exercise_id uuid not null references public.gj_exercises (id) on delete cascade,
  shared_with uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exercise_id, shared_with)
);
create index if not exists gj_shares_with_idx on public.gj_shares (shared_with);

-- ---------------------------------------------------------------- Hilfsfunktionen
-- security definer, damit sich die Zugriffsregeln nicht gegenseitig rekursiv aufrufen.

create or replace function public.gj_is_owner(p_exercise uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gj_exercises where id = p_exercise and owner = auth.uid());
$$;

create or replace function public.gj_is_shared_with_me(p_exercise uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gj_shares where exercise_id = p_exercise and shared_with = auth.uid());
$$;

create or replace function public.gj_shares_something_with_me(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.gj_exercises e join public.gj_shares s on s.exercise_id = e.id
    where e.owner = p_owner and s.shared_with = auth.uid()
  );
$$;

-- ---------------------------------------------------------------- Zugriffsregeln

alter table public.gj_profiles enable row level security;
alter table public.gj_exercises enable row level security;
alter table public.gj_shares enable row level security;

drop policy if exists gj_profiles_select on public.gj_profiles;
create policy gj_profiles_select on public.gj_profiles for select to authenticated
  using (id = auth.uid() or public.gj_shares_something_with_me(id));
drop policy if exists gj_profiles_insert on public.gj_profiles;
create policy gj_profiles_insert on public.gj_profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists gj_profiles_update on public.gj_profiles;
create policy gj_profiles_update on public.gj_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists gj_exercises_select on public.gj_exercises;
create policy gj_exercises_select on public.gj_exercises for select to authenticated
  using (owner = auth.uid() or public.gj_is_shared_with_me(id));
drop policy if exists gj_exercises_insert on public.gj_exercises;
create policy gj_exercises_insert on public.gj_exercises for insert to authenticated
  with check (owner = auth.uid());
drop policy if exists gj_exercises_update on public.gj_exercises;
create policy gj_exercises_update on public.gj_exercises for update to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists gj_exercises_delete on public.gj_exercises;
create policy gj_exercises_delete on public.gj_exercises for delete to authenticated
  using (owner = auth.uid());

-- Freigaben werden nur über gj_share_exercise angelegt; Besitzer und Empfänger dürfen sie lesen und entfernen.
drop policy if exists gj_shares_select on public.gj_shares;
create policy gj_shares_select on public.gj_shares for select to authenticated
  using (shared_with = auth.uid() or public.gj_is_owner(exercise_id));
drop policy if exists gj_shares_delete on public.gj_shares;
create policy gj_shares_delete on public.gj_shares for delete to authenticated
  using (shared_with = auth.uid() or public.gj_is_owner(exercise_id));

revoke all on public.gj_profiles, public.gj_exercises, public.gj_shares from anon;
grant select, insert, update on public.gj_profiles to authenticated;
grant select, insert, update, delete on public.gj_exercises to authenticated;
grant select, delete on public.gj_shares to authenticated;

-- ---------------------------------------------------------------- Teilen

-- Teilt eine eigene Übung mit dem Konto zu einer E-Mail-Adresse.
-- Ergebnis: ok | not_owner | no_account | self
create or replace function public.gj_share_exercise(p_exercise uuid, p_email text)
returns text language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid;
begin
  if not public.gj_is_owner(p_exercise) then
    return 'not_owner';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then
    return 'no_account';
  end if;
  if v_user = auth.uid() then
    return 'self';
  end if;
  insert into public.gj_shares (exercise_id, shared_with) values (p_exercise, v_user)
    on conflict do nothing;
  return 'ok';
end;
$$;

-- Liste der Empfänger einer eigenen Übung, mit E-Mail-Adresse.
create or replace function public.gj_exercise_shares(p_exercise uuid)
returns table (user_id uuid, email text, display_name text)
language sql stable security definer set search_path = public, auth as $$
  select s.shared_with, u.email::text, p.display_name
  from public.gj_shares s
  join auth.users u on u.id = s.shared_with
  left join public.gj_profiles p on p.id = s.shared_with
  where s.exercise_id = p_exercise and public.gj_is_owner(p_exercise)
  order by s.created_at;
$$;

revoke all on function public.gj_share_exercise(uuid, text) from public, anon;
revoke all on function public.gj_exercise_shares(uuid) from public, anon;
grant execute on function public.gj_share_exercise(uuid, text) to authenticated;
grant execute on function public.gj_exercise_shares(uuid) to authenticated;

-- ---------------------------------------------------------------- Automatik

create or replace function public.gj_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists gj_exercises_touch on public.gj_exercises;
create trigger gj_exercises_touch before update on public.gj_exercises
  for each row execute function public.gj_touch_updated_at();

-- Legt beim Registrieren automatisch ein Profil an.
create or replace function public.gj_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.gj_profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists gj_on_auth_user_created on auth.users;
create trigger gj_on_auth_user_created after insert on auth.users
  for each row execute function public.gj_handle_new_user();

-- Profile für bereits vorhandene Konten nachtragen.
insert into public.gj_profiles (id, display_name)
select id, left(split_part(email, '@', 1), 80) from auth.users
on conflict (id) do nothing;

commit;
