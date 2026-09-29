-- ===========================================================================
-- Cercabandi — importazione dei dati del prototipo
--
-- Da eseguire UNA SOLA VOLTA nel SQL Editor di Supabase, dopo lo schema iniziale
-- e dopo aver creato lo spazio di lavoro «Studio Fauda».
--
-- Contenuto: 25 fonti, 12 bandi, 2 profili di prova.
-- Tutti i bandi sono marcati «da verificare» (needs_review): i campi strutturati sono
-- ricavati dal testo del prototipo e le deduzioni sono elencate in review_notes.
-- I bandi con scadenza già passata al 2026-09-28 sono importati come «Chiuso».
-- ===========================================================================

begin;

insert into public.sources
  (workspace_id, name, url, covers, level, scope, packs, reliability, method, has_api)
values
((select id from public.workspaces where name = 'Studio Fauda'), 'Funding & Tenders Portal', 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home', 'Grant, call, premi e procurement gestiti dalle istituzioni UE', 'UE', 'Base comune', array[]::text[], 'Istituzionale', 'Ricerca strutturata + lettura topic e allegati', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'TED', 'https://ted.europa.eu/', 'Appalti pubblici europei', 'UE', 'Base comune', array[]::text[], 'Istituzionale', 'Search API ufficiale + avviso', true),
((select id from public.workspaces where name = 'Studio Fauda'), 'Incentivi.gov.it', 'https://www.incentivi.gov.it/it/catalogo', 'Catalogo degli incentivi delle amministrazioni italiane', 'Italia', 'Base comune', array[]::text[], 'Istituzionale', 'Catalogo + rinvio all’ente titolare', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'ANAC · BDNCP', 'https://pubblicitalegale.anticorruzione.it/bandi', 'Contratti pubblici nazionali', 'Italia', 'Base comune', array[]::text[], 'Istituzionale', 'Open data + pubblicità legale', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Gazzetta Ufficiale', 'https://www.gazzettaufficiale.it/30giorni/contratti', 'Provvedimenti, avvisi e contratti', 'Italia', 'Base comune', array[]::text[], 'Istituzionale', 'Indice + testo ufficiale', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'News istituzionali e programmazione', 'https://commission.europa.eu/news-and-media/news_en', 'Anticipazioni su opportunità future', 'News', 'Base comune', array[]::text[], 'Secondaria', 'Alert separato + conferma successiva sulla fonte primaria', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Portale Appalti MIT', 'https://portaleappalti.mit.gov.it/PortaleAppalti/', 'Gare ed elenchi per servizi tecnici', 'Italia', 'Specialistica', array['engineering-procurement']::text[], 'Istituzionale', 'Avvisi, disciplinari e allegati', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Acquisti in Rete PA', 'https://www.acquistinretepa.it/', 'MePA, RdO e abilitazioni', 'Italia', 'Specialistica', array['engineering-procurement']::text[], 'Istituzionale', 'Categorie + presidio operativo', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Regione Piemonte · Bandi', 'https://bandi.regione.piemonte.it/', 'Contributi, gare, delibere e programmazione', 'Piemonte', 'Specialistica', array['engineering-procurement', 'public-territorial']::text[], 'Istituzionale', 'Avviso + allegati + atti', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Province BI · VC · NO', 'https://www.provincia.vercelli.it/it/page/appalti-e-contratti-18d4997a-833f-4cde-a22b-23a0b78dfd7e', 'SUA, gare e trasparenza', 'Locale', 'Specialistica', array['engineering-procurement', 'public-territorial']::text[], 'Istituzionale', 'Portali territoriali dedicati', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'MiC · PNRR Cultura', 'https://pnrr.cultura.gov.it/', 'Patrimonio, digitalizzazione e programmi culturali', 'Italia', 'Specialistica', array['culture-digital']::text[], 'Istituzionale', 'Avvisi, decreti e atti attuativi', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Digital Europe', 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/programmes/digital', 'Capacità digitali, dati e deployment', 'UE', 'Specialistica', array['culture-digital']::text[], 'Istituzionale', 'Programma + topic su Funding & Tenders', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Horizon Europe', 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/programmes/horizon', 'Ricerca e innovazione collaborativa', 'UE', 'Specialistica', array['culture-digital']::text[], 'Istituzionale', 'Work programme + topic + consorzio', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'CSR Puglia 2023–2027', 'https://csr.regione.puglia.it/bandi', 'PAC, investimenti agricoli e sviluppo rurale', 'Puglia', 'Specialistica', array['agri-rural']::text[], 'Istituzionale', 'Bandi, BURP e allegati', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Regione Puglia · Turismo e Cultura', 'https://www.regione.puglia.it/web/turismo-e-cultura', 'Patrimonio e architettura rurale privata', 'Puglia', 'Specialistica', array['agri-rural']::text[], 'Istituzionale', 'Avvisi e atti ufficiali', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'SABAP Brindisi, Lecce e Taranto', 'https://sabap-le.cultura.gov.it/servizi-al-cittadino/servizi-generali/contributi/', 'Autorizzazioni e contributi per beni culturali privati', 'Taranto', 'Specialistica', array['agri-rural']::text[], 'Istituzionale', 'Procedimento + verifica del vincolo', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'RUNTS', 'https://servizi.lavoro.gov.it/runts/it-it/Ricerca-enti', 'Qualifica e dati degli enti del Terzo settore', 'Italia', 'Specialistica', array['civic-nonprofit']::text[], 'Istituzionale', 'Verifica anagrafica e sezione di iscrizione', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Commissione europea · funding per ONG', 'https://commission.europa.eu/funding-and-tenders/how-apply/eligibility-who-can-get-funding/funding-opportunities-ngos_en', 'Programmi accessibili a ONG e società civile', 'UE', 'Specialistica', array['civic-nonprofit']::text[], 'Istituzionale', 'Routing verso programmi e topic ufficiali', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Agenzia Entrate · 5 per mille', 'https://www.agenziaentrate.gov.it/portale/area-tematica-5x1000', 'Raccolta ricorrente per enti ammessi', 'Italia', 'Specialistica', array['civic-nonprofit', 'private-philanthropy']::text[], 'Istituzionale', 'Accreditamento + campagna', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'ACRI · mappa delle Fondazioni', 'https://www.acri.it/fondazioni/', '84 fondazioni di origine bancaria e relativi territori', 'Italia', 'Specialistica', array['private-philanthropy']::text[], 'Secondaria', 'Indice di routing; verifica finale sul sito della singola fondazione', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Fondazione Cariplo · Bandi', 'https://www.fondazionecariplo.it/contributi/bandi/', 'Cultura, ambiente, sociale, ricerca e capacity building', 'Lombardia', 'Specialistica', array['private-philanthropy']::text[], 'Istituzionale', 'Bandi + criteri di ammissibilità + rendicontazione', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Fondazione Compagnia di San Paolo', 'https://www.compagniadisanpaolo.it/it/cosa-facciamo/contributi/', 'Cultura, persone, pianeta e partecipazione', 'Nord-Ovest', 'Specialistica', array['private-philanthropy']::text[], 'Istituzionale', 'Bandi, linee guida, scadenze e ROL', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Fondazione CRT · Progetti e bandi', 'https://www.fondazionecrt.it/progetti-e-bandi/', 'Welfare, istruzione, cultura, sviluppo locale e matching', 'Piemonte · VdA', 'Specialistica', array['private-philanthropy']::text[], 'Istituzionale', 'Bando + regolamento + territorio del progetto', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Fondazione Con il Sud', 'https://www.fondazioneconilsud.it/bandi/', 'Terzo settore, volontariato, beni comuni e coesione', 'Sud Italia', 'Specialistica', array['private-philanthropy', 'civic-nonprofit']::text[], 'Istituzionale', 'Bandi, iniziative a richiesta e partnership', false),
((select id from public.workspaces where name = 'Studio Fauda'), 'Fondazione TIM', 'https://www.fondazionetim.it/bandi', 'Salute, inclusione, ricerca, cultura e istruzione', 'Italia', 'Specialistica', array['private-philanthropy']::text[], 'Istituzionale', 'Bandi e open call corporate', false);

insert into public.opportunities
  (workspace_id, external_code, title, authority, level, status, theme, territory,
   eligible_subject_types, packs, expense_categories, funding_source,
   budget_totale, contributo_max, cofinanziamento_richiesto_pct,
   deadline, replicabile, source_id, source_url, verified_at, needs_review, review_notes)
values
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'CSR Puglia SRD01.05', 'SRD01.05 generalista: investimenti produttivi nelle aziende agricole pugliesi', 'Regione Puglia · CSR 2023–2027', 'Regionale', 'Aperto', 'Agricoltura, olivicoltura e frutteti', 'Puglia',
  array['impresa', 'persona-fisica']::text[], array['agri-rural']::text[], null, 'UE',
  60000000, null, 40,
  '2026-10-22', false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'CSR Puglia 2023–2027'),
  'https://csr.regione.puglia.it/intervento-srd01.05-generalista-operativi-i-termini-per-la-presentazione-delle-domande-di-sostegno', '2026-08-09', true, 'Importato dal prototipo (Verificato il 9 agosto 2026).
Tipo: Contributo. Modalità: Candidatura diretta.
Scadenza nel prototipo: «8–22 ottobre 2026 · sette operazioni con scadenze intermedie».
Valore nel prototipo: «€ 60 mln · aiuto 60% base, 65% per localizzazione, 80% giovani».
Riferimento: CSR Puglia · SRD01.05 generalista · DAG 37/2026 e DAG 49/2026.
Da verificare:
- Soggetti ammessi: il bando è per aziende agricole; la persona fisica è inclusa solo se costituisce o possiede un''impresa agricola.
- Scadenza: indicata l''ultima delle finestre 8–22 ottobre; ci sono scadenze intermedie per operazione.
- Cofinanziamento 40% ricavato dall''aiuto base del 60% (65% o 80% in casi specifici).
- Contributo massimo per domanda non indicato: il calcolo del cofinanziamento usa la dotazione totale.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), null, 'Contributi statali per restauro e conservazione di beni culturali privati', 'Ministero della cultura · SABAP Brindisi, Lecce e Taranto', 'Nazionale', 'Aperto', 'Patrimonio architettonico rurale e restauro', 'Province di Brindisi, Lecce e Taranto · Puglia',
  array['persona-fisica', 'impresa', 'associazione']::text[], array['culture-digital']::text[], array['restauro']::text[], 'Nazionale',
  null, null, 50,
  null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'SABAP Brindisi, Lecce e Taranto'),
  'https://sabap-le.cultura.gov.it/servizi-al-cittadino/servizi-generali/contributi/', '2026-08-09', true, 'Importato dal prototipo (Verificato il 9 agosto 2026).
Tipo: Avviso. Modalità: Candidatura diretta.
Scadenza nel prototipo: «Procedura permanente · istanza prima dell’inizio dei lavori».
Valore nel prototipo: «Conto capitale di norma non oltre il 50% · possibile conto interessi».
Riferimento: SABAP Brindisi, Lecce e Taranto · Contributi artt. 31, 35, 36 e 37 D.Lgs. 42/2004.
Da verificare:
- Procedura permanente, senza scadenza: l''istanza va presentata prima dell''inizio dei lavori.
- Cofinanziamento 50% ricavato da «conto capitale di norma non oltre il 50%».
- È un bando nazionale ma gestito dalla Soprintendenza per tre province: il criterio territoriale non lo filtra.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), null, 'Architettura e paesaggio rurale: edifici storici, pozzi e strutture tradizionali', 'Regione Puglia · PNRR Cultura', 'Regionale', 'Chiuso', 'Patrimonio architettonico rurale e restauro', 'Puglia',
  array['persona-fisica', 'impresa', 'associazione']::text[], array['culture-digital', 'agri-rural']::text[], array['restauro']::text[], 'UE',
  56000000, null, null,
  null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'Regione Puglia · Turismo e Cultura'),
  'https://www.regione.puglia.it/web/turismo-e-cultura/-/architettura-rurale-al-via-gli-aiuti-per-il-recupero-e-la-valorizzazione-di-edifici-storici-rurali-e-per-la-tutela-del-paesaggio-rurale', '2026-08-09', true, 'Importato dal prototipo (Avviso storico verificato il 9 agosto 2026).
Tipo: Contributo. Modalità: Candidatura diretta.
Scadenza nel prototipo: «Avviso 2022 concluso · solo benchmark».
Valore nel prototipo: «Dotazione regionale oltre € 56 mln · procedura conclusa».
Riferimento: Regione Puglia · Avviso architettura rurale · A.D. 40/2022.
Da verificare:
- Avviso 2022 concluso: conservato solo come riferimento per bandi simili futuri.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'CIG BC79F3A91B', 'PFTE, progetto esecutivo, CSP e opzione DL/CSE per la Caserma Aliano Bracci', 'Provveditorato Interregionale OO.PP. Piemonte, Valle d’Aosta e Liguria', 'Locale', 'Chiuso', 'Riqualificazione edilizia ed efficienza energetica', 'Novara (NO) · Piemonte',
  array['impresa']::text[], array['engineering-procurement']::text[], array['progettazione', 'direzione-lavori']::text[], 'Nazionale',
  409217.56, null, 0,
  '2026-08-26', false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'Portale Appalti MIT'),
  'https://portaleappalti.mit.gov.it/PortaleAppalti/it/ppgare_bandi_lista.wp?actionPath=%2FExtStr2%2Fdo%2FFrontEnd%2FBandi%2Fview.action&codice=G07134&currentFrame=7', '2026-08-08', true, 'Importato dal prototipo (Verificato l’8 agosto 2026).
Tipo: Gara. Modalità: Candidatura diretta.
Scadenza nel prototipo: «26 agosto 2026 · ore 09:00».
Valore nel prototipo: «€ 217.883,20 base · € 409.217,56 complessivi».
Riferimento: Portale Appalti MIT · procedura G07134 · CIG BC79F3A91B.
Stato portato a «Chiuso»: la scadenza del 2026-08-26 è passata.
Da verificare:
- Gara d''appalto, non contributo: importo complessivo € 409.217,56 (base € 217.883,20).'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'TED 498709-2026', 'I.S. Monti: direzione lavori e CSE per adeguamento antincendio, restauro ed efficienza energetica', 'Agenzia del Demanio', 'Europeo', 'Chiuso', 'Riqualificazione edilizia ed efficienza energetica', 'Asti (AT) · Piemonte',
  array['impresa']::text[], array['engineering-procurement']::text[], array['direzione-lavori']::text[], 'Nazionale',
  494390, null, 0,
  '2026-09-07', false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'TED'),
  'https://ted.europa.eu/it/notice/-/detail/498709-2026', '2026-08-08', true, 'Importato dal prototipo (Verificato l’8 agosto 2026).
Tipo: Gara. Modalità: Candidatura diretta.
Scadenza nel prototipo: «7 settembre 2026».
Valore nel prototipo: «€ 494.390,00 stimati».
Riferimento: TED · avviso 498709-2026 · CIG BC70533D9C.
Stato portato a «Chiuso»: la scadenza del 2026-09-07 è passata.
Da verificare:
- Gara d''appalto pubblicata su TED, stazione appaltante Agenzia del Demanio.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), null, 'Città rigenerative: spazio pubblico, mobilità sostenibile e qualità dell’aria', 'Regione Piemonte · PR FESR 2021–2027', 'Regionale', 'Aperto', 'Rigenerazione urbana', 'Piemonte',
  array['ente-pubblico']::text[], array['public-territorial', 'engineering-procurement']::text[], null, 'UE',
  30000000, 4500000, 10,
  '2026-10-30', true,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'Regione Piemonte · Bandi'),
  'https://bandi.regione.piemonte.it/contributi-finanziamenti/citta-rigenerative-strategie-integrate-rigenerazione-urbana-mobilita-sostenibile-qualita-dellaria', '2026-08-08', true, 'Importato dal prototipo (Verificato l’8 agosto 2026).
Tipo: Contributo. Modalità: Opportunità commerciale indiretta.
Scadenza nel prototipo: «30 ottobre 2026 · ore 12:00».
Valore nel prototipo: «€ 30.000.000 · contributo fino al 90% · interventi € 250.000–5.000.000».
Riferimento: Bandi Regione Piemonte · Città rigenerative.
Da verificare:
- Contributo massimo € 4.500.000 ricavato: 90% dell''intervento massimo di € 5.000.000.
- Replicabile: segnato come proponibile a più Comuni.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), null, 'Efficienza energetica e rinnovabili negli impianti sportivi pubblici', 'Regione Piemonte · PR FESR 2021–2027', 'Regionale', 'Aperto', 'Riqualificazione edilizia ed efficienza energetica', 'Piemonte',
  array['ente-pubblico']::text[], array['energy', 'engineering-procurement', 'public-territorial']::text[], array['efficientamento-energetico', 'impianti']::text[], 'UE',
  14000000, null, 30,
  '2026-10-30', true,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'Regione Piemonte · Bandi'),
  'https://bandi.regione.piemonte.it/contributi-finanziamenti/bando-efficienza-energetica-e-fonti-rinnovabili-negli-edifici-strutture-e', '2026-08-08', true, 'Importato dal prototipo (Verificato l’8 agosto 2026).
Tipo: Contributo. Modalità: Opportunità commerciale indiretta.
Scadenza nel prototipo: «30 ottobre 2026 · ore 12:00».
Valore nel prototipo: «€ 14.000.000 · contributo fino al 70%».
Riferimento: Bandi Regione Piemonte · edifici e impianti sportivi.
Da verificare:
- Contributo massimo per intervento non indicato: il calcolo del cofinanziamento usa la dotazione totale (€ 14 mln).
- Voci di spesa dedotte dal titolo (efficienza energetica e rinnovabili).
- Replicabile: segnato come proponibile a più Comuni.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), null, 'Accordi di Programma 2026–2028 per opere pubbliche di sviluppo locale', 'Regione Piemonte · Fondo Sviluppo e Coesione', 'Regionale', 'Chiuso', 'Sviluppo territoriale', 'Piemonte',
  array['ente-pubblico']::text[], array['public-territorial', 'engineering-procurement']::text[], null, 'Nazionale',
  5971887.56, null, null,
  '2026-09-21', true,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'Regione Piemonte · Bandi'),
  'https://bandi.regione.piemonte.it/contributi-finanziamenti/avviso-gli-anni-2026-2028-finanziamento-accordi-programma', '2026-08-08', true, 'Importato dal prototipo (Verificato l’8 agosto 2026).
Tipo: Contributo. Modalità: Opportunità commerciale indiretta.
Scadenza nel prototipo: «21 settembre 2026 · ore 12:00».
Valore nel prototipo: «€ 5.971.887,56 di dotazione».
Riferimento: Bandi Regione Piemonte · Accordi di Programma 2026–2028.
Stato portato a «Chiuso»: la scadenza del 2026-09-21 è passata.
Da verificare:
- Percentuale di cofinanziamento non indicata nel prototipo.
- Replicabile: segnato come proponibile a più Comuni.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'MIT E00023', 'Elenco per servizi di ingegneria, architettura e altri servizi tecnici', 'Provveditorato Interregionale OO.PP. Piemonte, Valle d’Aosta e Liguria', 'Regionale', 'Aperto', 'Sviluppo territoriale', 'Piemonte · Valle d''Aosta · Liguria',
  array['impresa']::text[], array['engineering-procurement']::text[], null, 'Nazionale',
  null, null, 0,
  null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'Portale Appalti MIT'),
  'https://portaleappalti.mit.gov.it/PortaleAppalti/it/ppgare_oper_ec_bandi_avvisi.wp?actionPath=%2FExtStr2%2Fdo%2FFrontEnd%2FBandi%2FviewIscrizione.action&codice=E00023&currentFrame=7', '2026-08-08', true, 'Importato dal prototipo (Verificato l’8 agosto 2026).
Tipo: Qualificazione. Modalità: Qualificazione operativa.
Scadenza nel prototipo: «Iscrizione aperta · nessuna chiusura pubblicata».
Valore nel prototipo: «Nessun affidamento immediato · abilita a future selezioni».
Riferimento: Portale Appalti MIT · elenco E00023.
Da verificare:
- Iscrizione a un elenco di operatori, senza scadenza e senza affidamento immediato.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), null, 'MePA: servizi professionali di progettazione e verifica di opere di ingegneria civile', 'Consip · Acquisti in Rete PA', 'Nazionale', 'Aperto', 'Sviluppo territoriale', 'Italia',
  array['impresa']::text[], array['engineering-procurement']::text[], null, 'Nazionale',
  null, null, 0,
  null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'Acquisti in Rete PA'),
  'https://www.acquistinretepa.it/opencms/opencms/programma_approfondimenti_ingegneria_civile.html', '2026-08-08', true, 'Importato dal prototipo (Verificato l’8 agosto 2026).
Tipo: Qualificazione. Modalità: Qualificazione operativa.
Scadenza nel prototipo: «Abilitazione aperta · verificare la categoria attiva».
Valore nel prototipo: «Nessun affidamento immediato · accesso a RdO e negoziazioni».
Riferimento: Acquisti in Rete PA · categoria ingegneria civile.
Da verificare:
- Abilitazione MePA, senza scadenza: verificare che la categoria sia attiva.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), null, 'Nuovi spazi di partecipazione attiva: pre-assessment e successivo sostegno', 'Fondazione Compagnia di San Paolo · capitale filantropico privato', 'Regionale', 'Chiuso', 'Partecipazione civica e cittadinanza europea', 'Piemonte · Liguria · Valle d''Aosta',
  array['associazione']::text[], array['civic-nonprofit', 'private-philanthropy']::text[], null, 'Privato',
  null, null, null,
  '2026-09-22', false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'Fondazione Compagnia di San Paolo'),
  'https://www.compagniadisanpaolo.it/it/contributi/linee-guida-per-nuovi-spazi-di-partecipazione-attiva/', '2026-08-09', true, 'Importato dal prototipo (Verificato il 9 agosto 2026).
Tipo: Avviso. Modalità: Candidatura diretta.
Scadenza nel prototipo: «22 settembre 2026».
Valore nel prototipo: «Prima fase di assessment; eventuale richiesta di contributo solo dopo esito positivo».
Riferimento: Fondazione Compagnia di San Paolo · Linee Guida per nuovi spazi di partecipazione attiva.
Stato portato a «Chiuso»: la scadenza del 2026-09-22 è passata.
Da verificare:
- Prima fase di pre-assessment: il contributo si chiede solo dopo esito positivo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), null, 'Ordinarie 2026: progetti di welfare, istruzione, cultura e sviluppo locale', 'Fondazione CRT · capitale filantropico privato', 'Regionale', 'Aperto', 'Politiche pubbliche e innovazione sociale', 'Piemonte · Valle d''Aosta',
  array['associazione', 'ente-pubblico']::text[], array['private-philanthropy', 'civic-nonprofit']::text[], null, 'Privato',
  null, null, null,
  '2026-10-15', false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name = 'Fondazione CRT · Progetti e bandi'),
  'https://www.fondazionecrt.it/wp-content/uploads/2026/01/bando-ordinarie-2026-def.pdf', '2026-08-09', true, 'Importato dal prototipo (Allegati verificati il 9 agosto 2026).
Tipo: Contributo. Modalità: Candidatura diretta.
Scadenza nel prototipo: «15 ottobre 2026 · ore 15:00».
Valore nel prototipo: «Contributo determinato dalla Fondazione · cofinanziamento obbligatorio, senza soglia minima fissa».
Riferimento: Fondazione CRT · Bando Ordinarie 2026 e Regolamento generale.
Da verificare:
- Soggetti ammessi: enti non profit ed enti pubblici, da confermare sul regolamento.
- Cofinanziamento obbligatorio ma senza soglia fissa: la percentuale non è indicata, quindi oggi il motore lo considera assente.'
);

insert into public.profiles
  (workspace_id, name, short_name, subject_type, organization_type,
   themes, packs, params, interview_answers, is_template, notes, evidence_ready, evidence_missing)
values
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'Studio Fauda', 'SF', 'impresa', 'Studio di ingegneria e progettazione multidisciplinare',
  array['Progettazione tecnica', 'Infrastrutture', 'Ponti e viabilità', 'Rischio idrogeologico', 'Risorsa idrica', 'Rigenerazione urbana', 'Sviluppo territoriale']::text[], array['engineering-procurement', 'public-territorial']::text[], '{"regione":{"value":"Piemonte","confidence":"verificato"},"provincia":{"value":"Vercelli","confidence":"verificato"},"capacitaCofinanziamento":{"value":50000,"confidence":"stimato"},"preavvisoMinimoGiorni":{"value":12,"confidence":"verificato"}}'::jsonb, '{"subjectType":"impresa","attivitaPrevalente":["progettazione","infrastrutture","idraulica","urbanistica"],"lavoraPerEnti":true,"interesseReplicabilita":true,"regione":"Piemonte","isTemplate":"reale"}'::jsonb, false,
  'Profilo di prova: da rifare con l''intervista guidata (passo 5).', array['Portfolio lavori', 'Esperienze con amministrazioni locali', 'Competenze tecniche multidisciplinari']::text[], array['Fatturato verificato', 'Matrice certificati di regolare esecuzione', 'Polizze e massimali', 'Disponibilità partner per categoria']::text[]
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'Piccolo Comune dell''Alto Piemonte (modello)', 'PC', 'ente-pubblico', 'Comune montano, pedemontano o turistico di piccola dimensione',
  array['Ponti e viabilità', 'Infrastrutture', 'Efficienza energetica', 'Patrimonio culturale', 'Accessibilità e partecipazione culturale']::text[], array['public-territorial', 'engineering-procurement', 'energy', 'culture-digital']::text[], '{"regione":{"value":"Piemonte","confidence":"verificato"},"abitanti":{"value":800,"confidence":"ipotesi"},"classificazioni":{"value":["montano"],"confidence":"ipotesi"},"rupDisponibile":{"value":false,"confidence":"ipotesi"},"capacitaCofinanziamento":{"value":30000,"confidence":"stimato"},"preavvisoMinimoGiorni":{"value":45,"confidence":"verificato"}}'::jsonb, '{"subjectType":"ente-pubblico","entePubblicoTipo":"comune","ambitiInteresse":["infrastrutture","energia","cultura"],"classificazioni":["montano"],"rupDisponibile":false,"isTemplate":"modello"}'::jsonb, true,
  'Profilo di prova: da rifare con l''intervista guidata (passo 5).', array['Mandato istituzionale del Comune, da associare all’ente reale prima dell’analisi']::text[], array['Comune reale, popolazione aggiornata e classificazioni ufficiali', 'DUP, bilancio, programma triennale e cofinanziamento disponibile', 'RUP, personale tecnico-finanziario e carico delle gare già in corso', 'Livello progettuale, quadro economico e cronoprogramma dell’intervento', 'Titolarità del bene, vincoli, autorizzazioni e disponibilità delle aree', 'Storico di contributi, revoche, ritardi e capacità di rendicontazione', 'Capacità di anticipazione di cassa e copertura dei costi non ammissibili', 'Accordi con Unione, Provincia, gestori e partner operativi']::text[]
);

commit;
