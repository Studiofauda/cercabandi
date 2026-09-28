-- ===========================================================================
-- Cerca Bandi — competenze tecniche richieste dai bandi
--
-- Le competenze del profilo stanno nei parametri (params.competenze), come gli altri
-- dati del profilo. Qui si aggiunge al bando l'elenco delle competenze richieste.
-- Valori ammessi: gli stessi di TECHNICAL_SKILLS in src/core/types.ts.
-- ===========================================================================

create function public.valid_skills(s text[]) returns boolean
language sql immutable set search_path = '' as $$
  select s <@ array[
    'progettazione-architettonica', 'progettazione-strutturale', 'progettazione-impiantistica',
    'geologia-geotecnica', 'idraulica', 'energia-certificazione', 'sicurezza-cantiere',
    'direzione-lavori', 'collaudo', 'restauro', 'urbanistica-paesaggio', 'ambiente-valutazioni',
    'antincendio-prevenzione', 'bim', 'agronomia-forestale', 'rendicontazione-fondi'
  ]::text[];
$$;

alter table public.opportunities
  add column competenze_richieste text[] not null default '{}'
  check (public.valid_skills(competenze_richieste));
