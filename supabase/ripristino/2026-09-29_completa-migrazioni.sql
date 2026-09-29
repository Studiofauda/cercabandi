-- ===========================================================================
-- Cercabandi — completamento delle migrazioni del 28/09/2026
--
-- Completa, solo dove serve, le migrazioni:
--   20260928120000_competenze_tecniche.sql
--   20260928180000_ricerche_per_profilo.sql
--   20260928200000_tipo_di_bando.sql
-- Ogni istruzione salta ciò che esiste già: si può eseguire anche più volte.
-- Presuppone che 20260928150000_controllo_fonti.sql sia stata eseguita (colonna origin).
-- ===========================================================================

-- 1. Competenze tecniche richieste dai bandi -------------------------------

create or replace function public.valid_skills(s text[]) returns boolean
language sql immutable set search_path = '' as $$
  select s <@ array[
    'progettazione-architettonica', 'progettazione-strutturale', 'progettazione-impiantistica',
    'geologia-geotecnica', 'idraulica', 'energia-certificazione', 'sicurezza-cantiere',
    'direzione-lavori', 'collaudo', 'restauro', 'urbanistica-paesaggio', 'ambiente-valutazioni',
    'antincendio-prevenzione', 'bim', 'agronomia-forestale', 'rendicontazione-fondi'
  ]::text[];
$$;

alter table public.opportunities
  add column if not exists competenze_richieste text[] not null default '{}'
  check (public.valid_skills(competenze_richieste));

-- 2. Ricerche per profilo ----------------------------------------------------

alter table public.connector_settings
  add column if not exists profile_id uuid references public.profiles (id) on delete cascade;

-- Le ricerche esistenti senza profilo diventano quelle di Studio Fauda.
update public.connector_settings cs
set profile_id = p.id
from public.profiles p
where p.workspace_id = cs.workspace_id and p.name = 'Studio Fauda' and cs.profile_id is null;

delete from public.connector_settings where profile_id is null;

alter table public.connector_settings alter column profile_id set not null;

-- Chiave primaria su (spazio di lavoro, fonte, profilo), se non lo è già.
do $$
begin
  if (
    select array_length(conkey, 1) from pg_constraint
    where conrelid = 'public.connector_settings'::regclass and contype = 'p'
  ) = 2 then
    alter table public.connector_settings drop constraint connector_settings_pkey;
    alter table public.connector_settings add primary key (workspace_id, connector, profile_id);
  end if;
end;
$$;

alter table public.ingestion_runs
  add column if not exists profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists filters_hash text;

create index if not exists ingestion_runs_profile_idx on public.ingestion_runs (profile_id, connector, started_at desc);

-- 3. Tipo di bando ------------------------------------------------------------

alter table public.opportunities
  add column if not exists kind text not null default 'contributo'
  check (kind in ('contributo', 'gara', 'qualificazione'));

update public.opportunities set kind = 'gara' where origin in ('anac', 'ted') and kind <> 'gara';
update public.opportunities set kind = 'gara' where origin = 'prototipo' and review_notes like '%Tipo: Gara.%' and kind <> 'gara';
update public.opportunities set kind = 'qualificazione' where origin = 'prototipo' and review_notes like '%Tipo: Qualificazione.%' and kind <> 'qualificazione';

-- Verifica finale: devono comparire 5 righe.
select table_name, column_name
from information_schema.columns
where table_schema = 'public' and (
  (table_name = 'connector_settings' and column_name = 'profile_id') or
  (table_name = 'ingestion_runs'     and column_name = 'filters_hash') or
  (table_name = 'opportunities'      and column_name in ('origin', 'kind', 'competenze_richieste'))
);
