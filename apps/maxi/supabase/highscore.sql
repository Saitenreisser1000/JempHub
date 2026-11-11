-- Maxis Bierkiste: Bestenliste
-- Einmal im Supabase-Studio unter "SQL Editor" ausführen. Das Skript kann gefahrlos
-- erneut ausgeführt werden; vorhandene Einträge bleiben erhalten.

begin;

create table if not exists public.maxi_scores (
  id         bigint generated always as identity primary key,
  name       text        not null check (char_length(name) between 3 and 12 and name ~ '^[A-Za-z0-9ÄÖÜäöüß _.-]+$'),
  score      integer     not null check (score between 1 and 100000000),
  crates     integer     not null check (crates between 0 and 100000),
  created_at timestamptz not null default now()
);
create index if not exists maxi_scores_rank_idx on public.maxi_scores (score desc, created_at asc);

-- Level, in dem die Runde endete, und Maxis Stufe (ab Level 2/3 und Beförderungen)
alter table public.maxi_scores add column if not exists level smallint not null default 1 check (level between 1 and 3);
alter table public.maxi_scores add column if not exists rank  smallint not null default 0 check (rank between 0 and 3);

-- Lesen darf jeder, direkt schreiben niemand: Einträge kommen nur über maxi_submit_score.
alter table public.maxi_scores enable row level security;
drop policy if exists "Bestenliste lesen" on public.maxi_scores;
create policy "Bestenliste lesen" on public.maxi_scores for select to anon, authenticated using (true);
revoke all on public.maxi_scores from anon, authenticated;
grant select (name, score, crates, level, rank, created_at) on public.maxi_scores to anon, authenticated;

-- Eintragen mit Plausibilitätsprüfung. Gibt den Platz in der Gesamtliste zurück.
-- Die frühere Fassung ohne Level/Stufe wird ersetzt (sonst wäre der Aufruf mehrdeutig).
drop function if exists public.maxi_submit_score(text, integer, integer);
create or replace function public.maxi_submit_score(p_name text, p_score integer, p_crates integer, p_level integer default 1, p_rank integer default 0)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_rank integer;
  v_carry integer := case when p_level > 1 then 60000 else 0 end;
begin
  if char_length(v_name) not between 3 and 12 or v_name !~ '^[A-Za-z0-9ÄÖÜäöüß _.-]+$' then
    raise exception 'Ungültiger Name' using errcode = '22023';
  end if;
  if p_level is null or p_level not between 1 and 3 or p_rank is null or p_rank not between 0 and 3 then
    raise exception 'Ungültiges Level oder ungültige Stufe' using errcode = '22023';
  end if;
  if p_crates is null or p_crates not between 0 and 100000 then
    raise exception 'Ungültige Kistenzahl' using errcode = '22023';
  end if;
  -- großzügige Obergrenze: Punkte wachsen mit Kisten/Flaschen/Suden; in Level 2/3 können
  -- zusätzlich Punkte aus den vorigen Levels mitgenommen worden sein
  if p_score is null or p_score < 1
     or p_score > 600 * (p_crates + 2) * (p_crates + 2) + 20000 + v_carry then
    raise exception 'Ungültige Punktzahl' using errcode = '22023';
  end if;
  if (select count(*) from maxi_scores where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Zu viele Einträge, bitte kurz warten' using errcode = '54000';
  end if;
  insert into maxi_scores (name, score, crates, level, rank) values (v_name, p_score, p_crates, p_level, p_rank);
  select count(*) + 1 into v_rank from maxi_scores where score > p_score;
  return v_rank;
end;
$$;
revoke all on function public.maxi_submit_score(text, integer, integer, integer, integer) from public;
grant execute on function public.maxi_submit_score(text, integer, integer, integer, integer) to anon, authenticated;

commit;

-- PostgREST die Änderungen sofort bekannt machen
notify pgrst, 'reload schema';
