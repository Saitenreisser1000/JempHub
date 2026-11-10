-- JempHub: Rollen, Vernetzung und Admin-Funktionen (baut auf 001_guitarjemp.sql auf)
-- Wiederholbar: erneutes Ausführen ändert vorhandene Daten nicht.
--
-- Rollen
--   admin    darf alles (Benutzer, Rollen, Sperren, Löschen, Freigaben, Einstellungen)
--   teacher  eigene Übungen ohne Grenze, teilen, vernetzen
--   student  vernetzen; eigene Übungen nur bis zur Grenze in gj_settings, teilen nur wenn erlaubt
-- Neue Konten sind student. Wer unterrichtet, stellt einen Antrag; ein Admin bestätigt.
-- Den ersten Admin legt man einmalig per SQL fest (siehe EINRICHTUNG.md).

begin;

-- ---------------------------------------------------------------- Rollen und Einstellungen

alter table public.gj_profiles drop constraint if exists gj_profiles_role_check;
alter table public.gj_profiles add constraint gj_profiles_role_check check (role in ('student', 'teacher', 'admin'));
alter table public.gj_profiles add column if not exists teacher_requested boolean not null default false;

-- Die eigene Rolle darf niemand selbst ändern: Profile nur noch beim Namen bearbeitbar.
revoke insert, update on public.gj_profiles from authenticated;
grant update (display_name) on public.gj_profiles to authenticated;

create table if not exists public.gj_settings (
  id int primary key default 1 check (id = 1),
  student_max_exercises int not null default 10 check (student_max_exercises between 0 and 10000),
  student_can_share boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.gj_settings (id) values (1) on conflict (id) do nothing;
alter table public.gj_settings enable row level security;
revoke all on public.gj_settings from anon, authenticated;

create or replace function public.gj_role(p_user uuid default auth.uid())
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.gj_profiles where id = p_user), 'student');
$$;

create or replace function public.gj_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.gj_role(auth.uid()) = 'admin';
$$;

-- Verbindungen zwischen Mitgliedern (Anfrage → bestätigt); Änderungen nur über Funktionen
create table if not exists public.gj_connections (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  requested_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists gj_connections_b_idx on public.gj_connections (user_b);
alter table public.gj_connections enable row level security;
drop policy if exists gj_connections_select on public.gj_connections;
create policy gj_connections_select on public.gj_connections for select to authenticated
  using (auth.uid() in (user_a, user_b));
revoke all on public.gj_connections from anon, authenticated;
grant select on public.gj_connections to authenticated;

-- Grenze für Schüler beim Anlegen von Übungen (gilt auch für Kopien)
create or replace function public.gj_check_exercise_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max int;
begin
  -- Upsert einer vorhandenen Übung (insert … on conflict do update) ist keine neue Übung
  if public.gj_role(new.owner) <> 'student' or exists (select 1 from public.gj_exercises where id = new.id) then
    return new;
  end if;
  select student_max_exercises into v_max from public.gj_settings where id = 1;
  if (select count(*) from public.gj_exercises where owner = new.owner) >= v_max then
    raise exception 'gj_limit:%', v_max using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists gj_exercises_limit on public.gj_exercises;
create trigger gj_exercises_limit before insert on public.gj_exercises
  for each row execute function public.gj_check_exercise_limit();

-- Eigene Kontodaten für die App: Rolle, Antrag, Grenzen
create or replace function public.gj_my_account()
returns table (role text, teacher_requested boolean, max_exercises int, can_share boolean, exercise_count int, pending_requests int)
language sql stable security definer set search_path = public as $$
  select p.role,
         p.teacher_requested,
         case when p.role = 'student' then s.student_max_exercises end,
         p.role <> 'student' or s.student_can_share,
         (select count(*)::int from public.gj_exercises e where e.owner = auth.uid()),
         (select count(*)::int from public.gj_connections c
            where c.status = 'pending' and c.requested_by <> auth.uid() and auth.uid() in (c.user_a, c.user_b))
  from public.gj_profiles p, public.gj_settings s
  where p.id = auth.uid() and s.id = 1;
$$;

create or replace function public.gj_request_teacher(p_on boolean)
returns void language sql security definer set search_path = public as $$
  update public.gj_profiles set teacher_requested = p_on and role = 'student' where id = auth.uid();
$$;

-- ---------------------------------------------------------------- Vernetzung

create or replace function public.gj_connection_status(p_other uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((
    select case when c.status = 'accepted' then 'connected'
                when c.requested_by = auth.uid() then 'pending_out'
                else 'pending_in' end
    from public.gj_connections c
    where c.user_a = least(auth.uid(), p_other) and c.user_b = greatest(auth.uid(), p_other)
  ), 'none');
$$;

-- Mitglieder suchen: Teil des Namens (ab 2 Zeichen) oder genaue E-Mail-Adresse.
-- Gibt keine E-Mail-Adressen fremder Konten preis.
create or replace function public.gj_search_members(p_q text)
returns table (id uuid, display_name text, role text, status text)
language sql stable security definer set search_path = public, auth as $$
  select p.id, p.display_name, p.role, public.gj_connection_status(p.id)
  from public.gj_profiles p join auth.users u on u.id = p.id
  where char_length(trim(p_q)) >= 2
    and p.id <> auth.uid()
    and (u.banned_until is null or u.banned_until < now())
    and (p.display_name ilike '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%' or lower(u.email) = lower(trim(p_q)))
  order by p.display_name
  limit 20;
$$;

-- Anfrage senden; liegt schon eine Anfrage der anderen Person vor, wird sie angenommen.
-- Ergebnis: pending_out | connected | self | no_account
create or replace function public.gj_connect(p_other uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  if p_other = auth.uid() then return 'self'; end if;
  if not exists (select 1 from public.gj_profiles where id = p_other) then return 'no_account'; end if;
  v_status := public.gj_connection_status(p_other);
  if v_status = 'pending_in' then
    update public.gj_connections set status = 'accepted'
      where user_a = least(auth.uid(), p_other) and user_b = greatest(auth.uid(), p_other);
    return 'connected';
  end if;
  if v_status = 'none' then
    insert into public.gj_connections (user_a, user_b, requested_by)
      values (least(auth.uid(), p_other), greatest(auth.uid(), p_other), auth.uid());
    return 'pending_out';
  end if;
  return v_status;
end;
$$;

-- Verbindung, Anfrage oder eigene Anfrage entfernen bzw. ablehnen
create or replace function public.gj_disconnect(p_other uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.gj_connections
  where user_a = least(auth.uid(), p_other) and user_b = greatest(auth.uid(), p_other);
$$;

-- Eigenes Netzwerk: Kontakte und offene Anfragen; E-Mail nur bei bestätigten Kontakten
create or replace function public.gj_my_network()
returns table (id uuid, display_name text, role text, email text, status text)
language sql stable security definer set search_path = public, auth as $$
  select o.id, p.display_name, p.role,
         case when c.status = 'accepted' then u.email::text end,
         case when c.status = 'accepted' then 'connected'
              when c.requested_by = auth.uid() then 'pending_out' else 'pending_in' end
  from public.gj_connections c
  cross join lateral (select case when c.user_a = auth.uid() then c.user_b else c.user_a end as id) o
  join public.gj_profiles p on p.id = o.id
  join auth.users u on u.id = o.id
  where auth.uid() in (c.user_a, c.user_b)
  order by c.status desc, p.display_name;
$$;

-- Kontakte sehen gegenseitig ihre Namen
create or replace function public.gj_is_contact(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gj_connections c
    where c.user_a = least(auth.uid(), p_other) and c.user_b = greatest(auth.uid(), p_other));
$$;
drop policy if exists gj_profiles_select on public.gj_profiles;
create policy gj_profiles_select on public.gj_profiles for select to authenticated
  using (id = auth.uid() or public.gj_shares_something_with_me(id) or public.gj_is_contact(id) or public.gj_is_admin());

-- ---------------------------------------------------------------- Teilen mit Rollen

create or replace function public.gj_may_share()
returns boolean language sql stable security definer set search_path = public as $$
  select public.gj_role(auth.uid()) <> 'student' or (select student_can_share from public.gj_settings where id = 1);
$$;

-- Ergebnis: ok | not_owner | no_account | self | not_allowed
create or replace function public.gj_share_exercise(p_exercise uuid, p_email text)
returns text language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid;
begin
  if not public.gj_is_owner(p_exercise) then return 'not_owner'; end if;
  if not public.gj_may_share() then return 'not_allowed'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then return 'no_account'; end if;
  if v_user = auth.uid() then return 'self'; end if;
  insert into public.gj_shares (exercise_id, shared_with) values (p_exercise, v_user) on conflict do nothing;
  return 'ok';
end;
$$;

-- Teilen mit einem Kontakt (ohne E-Mail-Adresse)
create or replace function public.gj_share_with_user(p_exercise uuid, p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.gj_is_owner(p_exercise) then return 'not_owner'; end if;
  if not public.gj_may_share() then return 'not_allowed'; end if;
  if p_user = auth.uid() then return 'self'; end if;
  if public.gj_connection_status(p_user) <> 'connected' then return 'not_contact'; end if;
  insert into public.gj_shares (exercise_id, shared_with) values (p_exercise, p_user) on conflict do nothing;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------- Admin

create or replace function public.gj_admin_guard()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.gj_is_admin() then raise exception 'gj_not_admin' using errcode = '42501'; end if;
end;
$$;

create or replace function public.gj_admin_users()
returns table (id uuid, email text, display_name text, role text, teacher_requested boolean,
               created_at timestamptz, last_sign_in_at timestamptz, banned boolean,
               exercises int, shared_out int, contacts int)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.gj_admin_guard();
  return query
  select u.id, u.email::text, p.display_name, coalesce(p.role, 'student'), coalesce(p.teacher_requested, false),
         u.created_at, u.last_sign_in_at, coalesce(u.banned_until > now(), false),
         (select count(*)::int from public.gj_exercises e where e.owner = u.id),
         (select count(*)::int from public.gj_shares s join public.gj_exercises e on e.id = s.exercise_id where e.owner = u.id),
         (select count(*)::int from public.gj_connections c where c.status = 'accepted' and u.id in (c.user_a, c.user_b))
  from auth.users u left join public.gj_profiles p on p.id = u.id
  order by u.created_at;
end;
$$;

create or replace function public.gj_admin_set_role(p_user uuid, p_role text)
returns text language plpgsql security definer set search_path = public as $$
begin
  perform public.gj_admin_guard();
  if p_role not in ('student', 'teacher', 'admin') then return 'bad_role'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then return 'self'; end if;
  insert into public.gj_profiles (id, role, teacher_requested) values (p_user, p_role, false)
    on conflict (id) do update set role = excluded.role, teacher_requested = false;
  return 'ok';
end;
$$;

-- Sperren: Anmeldung unmöglich, bestehende Sitzungen werden beendet
create or replace function public.gj_admin_set_banned(p_user uuid, p_banned boolean)
returns text language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.gj_admin_guard();
  if p_user = auth.uid() then return 'self'; end if;
  update auth.users set banned_until = case when p_banned then now() + interval '100 years' end where id = p_user;
  if p_banned then
    delete from auth.refresh_tokens where user_id = p_user::text;
    delete from auth.sessions where user_id = p_user;
  end if;
  return 'ok';
end;
$$;

-- Endgültig löschen, samt Übungen, Freigaben und Verbindungen
create or replace function public.gj_admin_delete_user(p_user uuid)
returns text language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.gj_admin_guard();
  if p_user = auth.uid() then return 'self'; end if;
  delete from auth.users where id = p_user;
  return 'ok';
end;
$$;

-- Zwei Konten direkt verbinden (z. B. Schüler einem Lehrer zuordnen) oder trennen
create or replace function public.gj_admin_link(p_a uuid, p_b uuid, p_on boolean)
returns text language plpgsql security definer set search_path = public as $$
begin
  perform public.gj_admin_guard();
  if p_a = p_b then return 'self'; end if;
  if p_on then
    insert into public.gj_connections (user_a, user_b, status, requested_by)
      values (least(p_a, p_b), greatest(p_a, p_b), 'accepted', auth.uid())
      on conflict (user_a, user_b) do update set status = 'accepted';
  else
    delete from public.gj_connections where user_a = least(p_a, p_b) and user_b = greatest(p_a, p_b);
  end if;
  return 'ok';
end;
$$;

create or replace function public.gj_admin_connections()
returns table (a uuid, a_name text, a_role text, b uuid, b_name text, b_role text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.gj_admin_guard();
  return query
  select c.user_a, pa.display_name, pa.role, c.user_b, pb.display_name, pb.role, c.status, c.created_at
  from public.gj_connections c
  left join public.gj_profiles pa on pa.id = c.user_a
  left join public.gj_profiles pb on pb.id = c.user_b
  order by c.created_at desc;
end;
$$;

create or replace function public.gj_admin_shares()
returns table (exercise_id uuid, title text, owner uuid, owner_name text, shared_with uuid, recipient_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.gj_admin_guard();
  return query
  select e.id, e.title, e.owner, po.display_name, s.shared_with, pr.display_name, s.created_at
  from public.gj_shares s
  join public.gj_exercises e on e.id = s.exercise_id
  left join public.gj_profiles po on po.id = e.owner
  left join public.gj_profiles pr on pr.id = s.shared_with
  order by s.created_at desc;
end;
$$;

create or replace function public.gj_admin_unshare(p_exercise uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.gj_admin_guard();
  delete from public.gj_shares where exercise_id = p_exercise and shared_with = p_user;
end;
$$;

create or replace function public.gj_admin_settings()
returns table (student_max_exercises int, student_can_share boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.gj_admin_guard();
  return query select s.student_max_exercises, s.student_can_share from public.gj_settings s where s.id = 1;
end;
$$;

create or replace function public.gj_admin_save_settings(p_max int, p_can_share boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.gj_admin_guard();
  update public.gj_settings set student_max_exercises = greatest(0, least(10000, p_max)),
    student_can_share = p_can_share, updated_at = now() where id = 1;
end;
$$;

-- ---------------------------------------------------------------- Rechte auf Funktionen

do $$
declare
  f text;
begin
  foreach f in array array[
    'gj_role(uuid)', 'gj_is_admin()', 'gj_my_account()', 'gj_request_teacher(boolean)',
    'gj_connection_status(uuid)', 'gj_search_members(text)', 'gj_connect(uuid)', 'gj_disconnect(uuid)',
    'gj_my_network()', 'gj_is_contact(uuid)', 'gj_may_share()', 'gj_share_exercise(uuid, text)',
    'gj_share_with_user(uuid, uuid)', 'gj_admin_guard()', 'gj_admin_users()', 'gj_admin_set_role(uuid, text)',
    'gj_admin_set_banned(uuid, boolean)', 'gj_admin_delete_user(uuid)', 'gj_admin_link(uuid, uuid, boolean)',
    'gj_admin_connections()', 'gj_admin_shares()', 'gj_admin_unshare(uuid, uuid)', 'gj_admin_settings()',
    'gj_admin_save_settings(int, boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
revoke all on function public.gj_check_exercise_limit() from public, anon, authenticated;

commit;
