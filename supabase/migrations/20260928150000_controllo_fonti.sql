-- ===========================================================================
-- Cercabandi — controllo delle fonti (Fase 2, tappa 1)
--
-- - origin: da dove viene un bando (inserito a mano, prototipo, lettori automatici)
-- - connector_settings: i filtri di ogni lettore, modificabili dall'app
-- - ingestion_runs: registro dei controlli eseguiti, con i conteggi
-- ===========================================================================

alter table public.opportunities
  add column origin text not null default 'manuale'
  check (origin in ('manuale', 'prototipo', 'anac', 'ted', 'sedia'));

update public.opportunities set origin = 'prototipo' where review_notes like 'Importato dal prototipo%';

create index opportunities_origin_idx on public.opportunities (workspace_id, origin, created_at desc);

-- Filtri dei lettori: una riga per lettore e spazio di lavoro.
create table public.connector_settings (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  connector text not null check (connector in ('anac', 'ted', 'sedia')),
  enabled boolean not null default true,
  filters jsonb not null default '{}',
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, connector)
);

-- Registro dei controlli.
create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  connector text not null,
  status text not null default 'in-corso' check (status in ('in-corso', 'completato', 'errore')),
  window_from date,
  window_to date,
  found integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  message text,
  triggered_by uuid default auth.uid() references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index ingestion_runs_idx on public.ingestion_runs (workspace_id, connector, started_at desc);

create trigger connector_settings_updated_at before update on public.connector_settings
  for each row execute function public.set_updated_at();

alter table public.connector_settings enable row level security;
alter table public.ingestion_runs enable row level security;

create policy "membri leggono" on public.connector_settings
  for select to authenticated using (public.is_member(workspace_id));
create policy "editor inseriscono" on public.connector_settings
  for insert to authenticated with check (public.can_edit(workspace_id));
create policy "editor modificano" on public.connector_settings
  for update to authenticated using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));

create policy "membri leggono" on public.ingestion_runs
  for select to authenticated using (public.is_member(workspace_id));
create policy "editor avviano" on public.ingestion_runs
  for insert to authenticated with check (public.can_edit(workspace_id));
create policy "editor aggiornano" on public.ingestion_runs
  for update to authenticated using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));

revoke all on public.connector_settings, public.ingestion_runs from anon;
grant select, insert, update on public.connector_settings, public.ingestion_runs to authenticated;

-- Filtri iniziali di ANAC: servizi di architettura, ingegneria e urbanistica in
-- Piemonte e Puglia, solo bandi e indagini di mercato ancora aperti.
insert into public.connector_settings (workspace_id, connector, filters)
select id, 'anac', '{
  "cpv": ["712", "713", "714"],
  "regioni": ["Piemonte", "Puglia"],
  "tipologie": ["BANDI", "INDAGINI_DI_MERCATO_SOTTO_SOGLIA"],
  "importoMin": null,
  "importoMax": null,
  "escludi": [],
  "soloAperti": true,
  "giorniIndietro": 7
}'::jsonb
from public.workspaces where name = 'Studio Fauda';
