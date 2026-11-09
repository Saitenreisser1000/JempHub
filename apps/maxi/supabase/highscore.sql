-- Maxis Bierkiste: Bestenliste
-- Einmal im Supabase-Studio unter "SQL Editor" ausführen. Das Skript kann gefahrlos
-- erneut ausgeführt werden; vorhandene Einträge bleiben erhalten.

create table if not exists public.maxi_scores (
  id         bigint generated always as identity primary key,
  name       text        not null check (char_length(name) between 3 and 12 and name ~ '^[A-Za-z0-9ÄÖÜäöüß _.-]+$'),
  score      integer     not null check (score between 1 and 100000000),
  crates     integer     not null check (crates between 0 and 100000),
  created_at timestamptz not null default now()
);
create index if not exists maxi_scores_rank_idx on public.maxi_scores (score desc, created_at asc);

-- Lesen darf jeder, direkt schreiben niemand: Einträge kommen nur über maxi_submit_score.
alter table public.maxi_scores enable row level security;
drop policy if exists "Bestenliste lesen" on public.maxi_scores;
create policy "Bestenliste lesen" on public.maxi_scores for select to anon, authenticated using (true);
revoke all on public.maxi_scores from anon, authenticated;
grant select (name, score, crates, created_at) on public.maxi_scores to anon, authenticated;

-- Eintragen mit Plausibilitätsprüfung. Gibt den Platz in der Gesamtliste zurück.
create or replace function public.maxi_submit_score(p_name text, p_score integer, p_crates integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_rank integer;
begin
  if char_length(v_name) not between 3 and 12 or v_name !~ '^[A-Za-z0-9ÄÖÜäöüß _.-]+$' then
    raise exception 'Ungültiger Name' using errcode = '22023';
  end if;
  if p_crates is null or p_crates not between 0 and 100000 then
    raise exception 'Ungültige Kistenzahl' using errcode = '22023';
  end if;
  -- großzügige Obergrenze: Kistenpunkte wachsen mit der Stufe, dazu Bonuspunkte fürs Wegschnippen
  if p_score is null or p_score < 1 or p_score > 600 * (p_crates + 2) * (p_crates + 2) + 20000 then
    raise exception 'Ungültige Punktzahl' using errcode = '22023';
  end if;
  if (select count(*) from maxi_scores where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Zu viele Einträge, bitte kurz warten' using errcode = '54000';
  end if;
  insert into maxi_scores (name, score, crates) values (v_name, p_score, p_crates);
  select count(*) + 1 into v_rank from maxi_scores where score > p_score;
  return v_rank;
end;
$$;
revoke all on function public.maxi_submit_score(text, integer, integer) from public;
grant execute on function public.maxi_submit_score(text, integer, integer) to anon, authenticated;

-- PostgREST die Änderungen sofort bekannt machen
notify pgrst, 'reload schema';
