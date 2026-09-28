-- ===========================================================================
-- Cerca Bandi — tipo di bando (contributo, gara, qualificazione)
--
-- Nelle gare d'appalto il territorio orienta ma non esclude: un operatore di qualsiasi
-- regione può partecipare. Nei contributi resta un requisito.
-- ===========================================================================

alter table public.opportunities
  add column kind text not null default 'contributo'
  check (kind in ('contributo', 'gara', 'qualificazione'));

-- Bandi letti da ANAC e TED: sono gare d'appalto.
update public.opportunities set kind = 'gara' where origin in ('anac', 'ted');

-- Bandi del prototipo: il tipo è scritto nelle note di importazione («Tipo: Gara.»).
update public.opportunities set kind = 'gara' where origin = 'prototipo' and review_notes like '%Tipo: Gara.%';
update public.opportunities set kind = 'qualificazione' where origin = 'prototipo' and review_notes like '%Tipo: Qualificazione.%';
