-- ===========================================================================
-- Cerca Bandi — schema iniziale del database
--
-- Rispecchia il modello dati di src/core/types.ts. Principi:
-- - ogni tabella appartiene a uno spazio di lavoro (workspace_id): oggi ce n'è uno solo,
--   ma la separazione è pronta se in futuro servisse;
-- - le regole di accesso (RLS) stanno nel database: solo i membri dello spazio di lavoro
--   vedono i dati, e solo amministratori ed editor li modificano;
-- - i parametri del profilo sono in JSON, perché il modello è parametrico e ampliabile;
-- - lo storico dei bandi si aggiunge e non si sovrascrive mai.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Spazi di lavoro e membri
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- Funzioni di controllo usate dalle regole di accesso. `security definer` evita che la
-- regola sulla tabella dei membri richiami sé stessa all'infinito.
create function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create function public.can_edit(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role in ('admin', 'editor')
  );
$$;

create function public.is_admin(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role = 'admin'
  );
$$;

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Valori ammessi (gli stessi dei tipi in src/core/types.ts)
-- ---------------------------------------------------------------------------

-- Ambiti tematici (PackId)
create function public.valid_packs(p text[]) returns boolean
language sql immutable set search_path = '' as $$
  select p <@ array[
    'engineering-procurement', 'public-territorial', 'agri-rural', 'culture-digital',
    'civic-nonprofit', 'private-philanthropy', 'health', 'tourism', 'energy'
  ]::text[];
$$;

-- Tipi di soggetto (SubjectType)
create function public.valid_subject_types(s text[]) returns boolean
language sql immutable set search_path = '' as $$
  select s <@ array['ente-pubblico', 'impresa', 'associazione', 'persona-fisica']::text[];
$$;

-- Voci di spesa (ExpenseCategory)
create function public.valid_expense_categories(c text[]) returns boolean
language sql immutable set search_path = '' as $$
  select c <@ array[
    'progettazione', 'direzione-lavori', 'opere-strutturali', 'efficientamento-energetico',
    'impianti', 'restauro', 'arredi-attrezzature', 'digitalizzazione', 'formazione',
    'personale', 'comunicazione', 'studi-indagini'
  ]::text[];
$$;

-- ---------------------------------------------------------------------------
-- Fonti
-- ---------------------------------------------------------------------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  url text not null,
  covers text not null default '',
  level text not null default '',
  scope text not null check (scope in ('Base comune', 'Specialistica')),
  packs text[] not null default '{}' check (public.valid_packs(packs)),
  -- L'affidabilità incide sull'ordine di visualizzazione, non sul punteggio.
  reliability text not null check (reliability in ('Ufficiale', 'Istituzionale', 'Secondaria')),
  method text not null default '',
  has_api boolean not null default false,
  last_checked_at timestamptz,
  feedback_useful integer not null default 0,
  feedback_not_useful integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sources_workspace_idx on public.sources (workspace_id);

-- ---------------------------------------------------------------------------
-- Opportunità (bandi)
-- ---------------------------------------------------------------------------

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Codice ufficiale del bando (codice, CIG, ID TED…): serve a riconoscere un bando già
  -- noto quando lo si ritrova su una fonte, invece di crearne un doppione.
  external_code text,
  title text not null,
  authority text not null default '',
  level text not null check (level in ('Europeo', 'Nazionale', 'Regionale', 'Locale')),
  status text not null check (status in ('Aperto', 'In arrivo', 'Chiuso')),
  theme text not null default '',
  territory text not null default '',

  eligible_subject_types text[] not null default '{}' check (public.valid_subject_types(eligible_subject_types)),
  packs text[] not null default '{}' check (public.valid_packs(packs)),

  expense_categories text[] check (expense_categories is null or public.valid_expense_categories(expense_categories)),
  funding_source text check (funding_source in ('UE', 'Nazionale', 'Regionale', 'Privato')),
  cumulabile boolean,
  cofinanziamento_da_altri_fondi boolean,

  budget_totale numeric check (budget_totale >= 0),
  contributo_max numeric check (contributo_max >= 0),
  cofinanziamento_richiesto_pct numeric check (cofinanziamento_richiesto_pct between 0 and 100),
  abitanti_min integer check (abitanti_min >= 0),
  abitanti_max integer check (abitanti_max >= 0),

  deadline date,
  expected_publication date,
  replicabile boolean not null default false,
  partnership_richieste text[],

  source_id uuid references public.sources (id) on delete set null,
  source_url text not null default '',
  verified_at timestamptz,

  -- Bando importato con dati incompleti, da rivedere sui testi ufficiali.
  needs_review boolean not null default false,
  review_notes text,

  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_workspace_idx on public.opportunities (workspace_id, status);
create unique index opportunities_external_code_idx
  on public.opportunities (workspace_id, external_code) where external_code is not null;

-- Storico: una riga per ogni modifica rilevata, mai aggiornata né cancellata dall'app.
create table public.opportunity_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  detected_at timestamptz not null default now(),
  changes jsonb not null,
  snapshot jsonb not null
);

create index opportunity_revisions_opportunity_idx on public.opportunity_revisions (opportunity_id, detected_at desc);

-- ---------------------------------------------------------------------------
-- Profili
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  short_name text not null,
  subject_type text not null check (subject_type in ('ente-pubblico', 'impresa', 'associazione', 'persona-fisica')),
  organization_type text not null default '',
  themes text[] not null default '{}',
  packs text[] not null default '{}' check (public.valid_packs(packs)),
  pack_overrides jsonb,
  -- Parametri: { "abitanti": { "value": 800, "confidence": "stimato", ... }, ... }
  params jsonb not null default '{}',
  interview_answers jsonb,
  is_template boolean not null default false,
  notes text,
  -- Liste "Pronto" / "Manca" del prototipo: documenti e requisiti disponibili o da procurare.
  evidence_ready text[] not null default '{}',
  evidence_missing text[] not null default '{}',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_workspace_idx on public.profiles (workspace_id);

-- ---------------------------------------------------------------------------
-- Lavoro su bando × profilo
-- ---------------------------------------------------------------------------

-- Bandi scartati con motivazione (restano rivalutabili).
create table public.dismissals (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  dismissed_by uuid default auth.uid() references auth.users (id) on delete set null,
  dismissed_at timestamptz not null default now(),
  primary key (opportunity_id, profile_id)
);

-- Analisi qualitativa compilata a mano dal team: fuori dal motore di valutazione.
create table public.assessment_notes (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  eligibility text,
  advantages text[] not null default '{}',
  weaknesses text[] not null default '{}',
  red_flags text[] not null default '{}',
  next_steps text[] not null default '{}',
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (opportunity_id, profile_id)
);

-- Simulazioni "cosa cambierebbe se…" salvate.
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete cascade,
  label text not null,
  params jsonb not null default '{}',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index scenarios_profile_idx on public.scenarios (profile_id);

-- ---------------------------------------------------------------------------
-- Aggiornamento automatico di updated_at
-- ---------------------------------------------------------------------------

create trigger sources_updated_at before update on public.sources
  for each row execute function public.set_updated_at();
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger assessment_notes_updated_at before update on public.assessment_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Regole di accesso (Row Level Security)
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.sources enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_revisions enable row level security;
alter table public.profiles enable row level security;
alter table public.dismissals enable row level security;
alter table public.assessment_notes enable row level security;
alter table public.scenarios enable row level security;

-- Spazi di lavoro: visibili ai membri. Si creano dal pannello di Supabase, non dall'app.
create policy "membri vedono il proprio spazio" on public.workspaces
  for select to authenticated using (public.is_member(id));

-- Membri: ognuno vede i colleghi; solo gli amministratori aggiungono o tolgono persone.
create policy "membri vedono i colleghi" on public.workspace_members
  for select to authenticated using (public.is_member(workspace_id));
create policy "amministratori gestiscono i membri" on public.workspace_members
  for all to authenticated using (public.is_admin(workspace_id)) with check (public.is_admin(workspace_id));

-- Tabelle di lavoro: lettura ai membri, modifica ad amministratori ed editor.
do $$
declare
  t text;
begin
  foreach t in array array['sources', 'opportunities', 'profiles', 'dismissals', 'assessment_notes', 'scenarios']
  loop
    execute format(
      'create policy "membri leggono" on public.%I for select to authenticated using (public.is_member(workspace_id))', t);
    execute format(
      'create policy "editor inseriscono" on public.%I for insert to authenticated with check (public.can_edit(workspace_id))', t);
    execute format(
      'create policy "editor modificano" on public.%I for update to authenticated using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id))', t);
    execute format(
      'create policy "editor eliminano" on public.%I for delete to authenticated using (public.can_edit(workspace_id))', t);
  end loop;
end;
$$;

-- Storico: si legge e si aggiunge, non si modifica né si cancella.
create policy "membri leggono" on public.opportunity_revisions
  for select to authenticated using (public.is_member(workspace_id));
create policy "editor aggiungono revisioni" on public.opportunity_revisions
  for insert to authenticated with check (public.can_edit(workspace_id));

-- ---------------------------------------------------------------------------
-- Permessi di base: chi non è collegato (anon) non accede a nessuna tabella.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke update, delete on public.opportunity_revisions from authenticated;
revoke execute on function public.is_member(uuid), public.can_edit(uuid), public.is_admin(uuid) from anon;
