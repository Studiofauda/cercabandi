-- ===========================================================================
-- Cercabandi — ricerche delle fonti per profilo
--
-- Ogni profilo ha la sua ricerca (es. Studio Fauda: servizi di ingegneria in Piemonte;
-- un'associazione: altri filtri). Il registro dei controlli ricorda profilo e filtri
-- usati: se i filtri cambiano, il controllo successivo ricerca di nuovo nei giorni
-- indietro indicati, invece di riprendere dall'ultimo controllo.
-- ===========================================================================

alter table public.connector_settings
  add column profile_id uuid references public.profiles (id) on delete cascade;

-- La ricerca creata con la migrazione precedente diventa quella di Studio Fauda.
update public.connector_settings cs
set profile_id = p.id
from public.profiles p
where p.workspace_id = cs.workspace_id and p.name = 'Studio Fauda' and cs.profile_id is null;

delete from public.connector_settings where profile_id is null;

alter table public.connector_settings alter column profile_id set not null;
alter table public.connector_settings drop constraint connector_settings_pkey;
alter table public.connector_settings add primary key (workspace_id, connector, profile_id);

alter table public.ingestion_runs
  add column profile_id uuid references public.profiles (id) on delete set null,
  add column filters_hash text;

create index ingestion_runs_profile_idx on public.ingestion_runs (profile_id, connector, started_at desc);
