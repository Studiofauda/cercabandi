-- ===========================================================================
-- Cerca Bandi — nuova fonte automatica «feed» (Regione Piemonte, fondazioni, GSE)
--
-- Aggiunge «feed» ai valori ammessi per le ricerche salvate e per l'origine dei bandi.
-- Si può eseguire più volte.
-- ===========================================================================

alter table public.connector_settings drop constraint if exists connector_settings_connector_check;
alter table public.connector_settings
  add constraint connector_settings_connector_check check (connector in ('anac', 'ted', 'sedia', 'feed'));

alter table public.opportunities drop constraint if exists opportunities_origin_check;
alter table public.opportunities
  add constraint opportunities_origin_check check (origin in ('manuale', 'prototipo', 'anac', 'ted', 'sedia', 'feed'));

-- La fonte GSE non era tra quelle del prototipo: la si aggiunge all'elenco.
insert into public.sources (workspace_id, name, url, covers, level, scope, packs, reliability, method, has_api)
select w.id, 'GSE', 'https://www.gse.it/', 'Incentivi per energia rinnovabile, efficienza e comunità energetiche', 'Italia',
       'Specialistica', array['energy']::text[], 'Istituzionale', 'Feed delle notizie filtrato su bandi e incentivi', false
from public.workspaces w
where w.name = 'Studio Fauda'
  and not exists (select 1 from public.sources s where s.workspace_id = w.id and s.name = 'GSE');
