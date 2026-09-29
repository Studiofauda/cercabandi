-- ===========================================================================
-- Cerca Bandi — avvisi PNRR ancora in corso o in programma (importazione una tantum)
--
-- Fonte: catalogo «Bandi delle amministrazioni titolari» di Italia Domani, letto il
-- 29/09/2026. 18 avvisi. Tutti «da verificare». Si può eseguire più volte: gli avvisi
-- già presenti (stesso codice) vengono saltati.
-- ===========================================================================

insert into public.opportunities
  (workspace_id, external_code, origin, kind, title, authority, level, status, theme, territory,
   eligible_subject_types, packs, funding_source, deadline, replicabile, source_id, source_url,
   verified_at, needs_review, review_notes)
values
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.ministeroturismo.gov.it/wp-content/uploads/2022/09/20220829-ADP41922-Convenzione-FRI-Turismo_signed.pdf', 'manuale', 'contributo', 'ART 3. D.L. 152/2021 – CONVENZIONE MITUR, ABI, CDP', 'MITUR - Ministero del Turismo',
  'Nazionale', 'Aperto', 'Investimento Fondo rotativo imprese (FRI ) per il sostegno alle imprese e gli investimenti di sviluppo', 'Italia',
  array['impresa']::text[], array['tourism', 'culture-digital']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.ministeroturismo.gov.it/wp-content/uploads/2022/09/20220829-ADP41922-Convenzione-FRI-Turismo_signed.pdf', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MITUR - Ministero del Turismo.
Stato su Italia Domani: In corso. Apertura: 05/09/22. Chiusura: Da definire.
Area geografica: Tutto il territorio nazionale. Destinatari: Imprese.
Misura PNRR: Investimento Fondo rotativo imprese (FRI ) per il sostegno alle imprese e gli investimenti di sviluppo - M1C3.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.ministeroturismo.gov.it/wp-content/uploads/2023/05/Prot.-10636-del-30-maggio-2023.pdf', 'manuale', 'contributo', 'Avviso pubblico del 30 maggio 2023 (prot. n. 10636/23) –Fondo per il Turismo Sostenibile di cui all’art. 8 del decreto-legge 6 novembre 2021, n. 152 relativo al terzo Intermediario Finanziario', 'MITUR - Ministero del Turismo',
  'Nazionale', 'Aperto', 'Investimento Sviluppo e resilienza delle imprese del settore turistico (Fondo dei Fondi BEI)', 'Italia',
  array['impresa']::text[], array['tourism', 'culture-digital']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.ministeroturismo.gov.it/wp-content/uploads/2023/05/Prot.-10636-del-30-maggio-2023.pdf', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MITUR - Ministero del Turismo.
Stato su Italia Domani: In corso. Apertura: 31/05/23. Chiusura: Da definire.
Area geografica: Tutto il territorio nazionale. Destinatari: Imprese.
Misura PNRR: Investimento Sviluppo e resilienza delle imprese del settore turistico (Fondo dei Fondi BEI) - M1C3.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.mur.gov.it/it/atti-e-normativa/decreto-direttoriale-n-644-del-15-05-2024', 'manuale', 'contributo', 'Avviso pubblico per la concessione dell’esonero contributivo in attuazione dell’art. 6, comma 1, del Decreto Interministeriale n. 1456 del 19 ottobre 2023 nell’ambito del Piano Nazionale di Ripresa e Resilienza (PNRR)…', 'MUR - Ministero dell''Università e della Ricerca',
  'Nazionale', 'Aperto', 'Investimento Introduzione di dottorati innovativi che rispondono ai fabbisogni di innovazione delle imprese e promuovono l''assunzione dei ricercatori da parte delle imprese', 'Italia',
  array['impresa']::text[], array['public-territorial', 'civic-nonprofit']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.mur.gov.it/it/atti-e-normativa/decreto-direttoriale-n-644-del-15-05-2024', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MUR - Ministero dell''Università e della Ricerca.
Stato su Italia Domani: In corso. Apertura: 16/05/24. Chiusura: Da definire.
Area geografica: Tutto il territorio nazionale. Destinatari: Imprese.
Misura PNRR: Investimento Introduzione di dottorati innovativi che rispondono ai fabbisogni di innovazione delle imprese e promuovono l''assunzione dei ricercatori da parte delle imprese - M4C2.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.mise.gov.it/images/stories/normativa/2_2022_07_12_Bando_2022_brevetti.pdf', 'manuale', 'contributo', 'Bando per il finanziamento di progetti di valorizzazione dei brevetti (Brevetti+)', 'MIMIT- Ministero delle Imprese e del Made in Italy',
  'Nazionale', 'Aperto', 'Investimento Investimento Sistema della Proprietà Industriale', 'Italia',
  array['impresa']::text[], array['culture-digital']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.mise.gov.it/images/stories/normativa/2_2022_07_12_Bando_2022_brevetti.pdf', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MIMIT- Ministero delle Imprese e del Made in Italy.
Stato su Italia Domani: In corso. Apertura: 27/09/22. Chiusura: Fino a esaurimento fondi.
Area geografica: Tutto il territorio nazionale tipologia Selezione beneficiari/progetti. Destinatari: Imprese.
Misura PNRR: Investimento Investimento Sistema della Proprietà Industriale - M1C2.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.consip.it/bandi-di-gara/gare-e-avvisi/avviso-di-preinformazione-aq-acceleratori-lineari', 'manuale', 'gara', 'Consip - Avviso di preinformazione "AQ Acceleratori lineari, sistemi per radioterapia (gating, SGRT e dosimetria), servizi connessi, dispositivi e servizi opzionali per le PA"', 'MS - Ministero della Salute',
  'Nazionale', 'Aperto', 'Investimenti Ammodernamento del parco tecnologico e digitale ospedaliero', 'Italia',
  array['impresa']::text[], array['health']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.consip.it/bandi-di-gara/gare-e-avvisi/avviso-di-preinformazione-aq-acceleratori-lineari', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MS - Ministero della Salute.
Stato su Italia Domani: In corso. Apertura: 28/04/22. Chiusura: Da definire.
Area geografica: Tutto il territorio nazionale tipologia Gare Consip e aggregatori. Destinatari: Imprese.
Misura PNRR: Investimenti Ammodernamento del parco tecnologico e digitale ospedaliero - M6C2.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.consip.it/bandi-di-gara/gare-e-avvisi/avviso-di-preinformazione-aq-fornitura-di-apparecchiature-di-radiologia-telecomandati-e-polifunzionali-ed1', 'manuale', 'gara', 'Consip - Avviso di preinformazione "AQ Fornitura di apparecchiature di radiologia – telecomandati e polifunzionali (ed.1)"', 'MS - Ministero della Salute',
  'Nazionale', 'Aperto', 'Investimenti Ammodernamento del parco tecnologico e digitale ospedaliero', 'Italia',
  array['impresa']::text[], array['health']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.consip.it/bandi-di-gara/gare-e-avvisi/avviso-di-preinformazione-aq-fornitura-di-apparecchiature-di-radiologia-telecomandati-e-polifunzionali-ed1', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MS - Ministero della Salute.
Stato su Italia Domani: In corso. Apertura: 04/04/22. Chiusura: Da definire.
Area geografica: Tutto il territorio nazionale tipologia Gare Consip e aggregatori. Destinatari: Imprese.
Misura PNRR: Investimenti Ammodernamento del parco tecnologico e digitale ospedaliero - M6C2.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.consip.it/bandi-di-gara/gare-e-avvisi/avviso-di-preinformazione-aq-fornitura-di-tomografi-petct-per-le-pubbliche-amministrazioni-ed-1', 'manuale', 'gara', 'Consip - Avviso di preinformazione "AQ Fornitura di tomografi PET/CT per le Pubbliche Amministrazioni (ed. 1)"', 'MS - Ministero della Salute',
  'Nazionale', 'Aperto', 'Investimenti Ammodernamento del parco tecnologico e digitale ospedaliero', 'Italia',
  array['impresa']::text[], array['health']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.consip.it/bandi-di-gara/gare-e-avvisi/avviso-di-preinformazione-aq-fornitura-di-tomografi-petct-per-le-pubbliche-amministrazioni-ed-1', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MS - Ministero della Salute.
Stato su Italia Domani: In corso. Apertura: 09/05/22. Chiusura: Da definire.
Area geografica: Tutto il territorio nazionale tipologia Gare Consip e aggregatori. Destinatari: Imprese.
Misura PNRR: Investimenti Ammodernamento del parco tecnologico e digitale ospedaliero - M6C2.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.consip.it/bandi-di-gara/gare-e-avvisi/aq-apparecchiature-di-radiologia-telecomandati-e-polifunzionali-ed1', 'manuale', 'gara', 'Consip - Gara a procedura aperta per l’affidamento, in relazione a ciascun lotto, di un Accordo quadro per la fornitura di apparecchiature di radiologia – telecomandati e polifunzionali, servizi connessi, dispositivi …', 'MS - Ministero della Salute',
  'Nazionale', 'Aperto', 'Investimenti Ammodernamento del parco tecnologico e digitale ospedaliero', 'Italia',
  array['impresa']::text[], array['health']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.consip.it/bandi-di-gara/gare-e-avvisi/aq-apparecchiature-di-radiologia-telecomandati-e-polifunzionali-ed1', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MS - Ministero della Salute.
Stato su Italia Domani: In corso. Apertura: 29/04/22. Chiusura: Da definire.
Area geografica: Tutto il territorio nazionale tipologia Gare Consip e aggregatori. Destinatari: Imprese.
Misura PNRR: Investimenti Ammodernamento del parco tecnologico e digitale ospedaliero - M6C2.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.mise.gov.it/it/normativa/notifiche-e-avvisi/avviso-bus-elettrici-apertura-presentazione-domande', 'manuale', 'contributo', 'Contratti di sviluppo per il sostegno di programmi di sviluppo coerenti con le finalità della Misura M2C2 dell’Investimento 5.3 “Sviluppo di una leadership internazionale, industriale e di ricerca e sviluppo nel campo…', 'MIMIT- Ministero delle Imprese e del Made in Italy',
  'Nazionale', 'Aperto', 'Investimenti Bus elettrici (filiera industriale)', 'Italia',
  array['impresa']::text[], array['energy', 'agri-rural']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.mise.gov.it/it/normativa/notifiche-e-avvisi/avviso-bus-elettrici-apertura-presentazione-domande', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MIMIT- Ministero delle Imprese e del Made in Italy.
Stato su Italia Domani: In corso. Apertura: 26/04/22. Chiusura: Fino a esaurimento fondi.
Area geografica: Tutto il territorio nazionale tipologia Selezione beneficiari/progetti. Destinatari: Imprese.
Misura PNRR: Investimenti Bus elettrici (filiera industriale) - M2C2.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.mise.gov.it/index.php/it/normativa/decreti-direttoriali/decreto-direttoriale-25-marzo-2022-contratti-di-sviluppo-pnrr-filiere', 'manuale', 'contributo', 'Decreto direttoriale 25 marzo 2022 - Contratti di sviluppo. PNRR, Filiere produttive', 'MIMIT- Ministero delle Imprese e del Made in Italy',
  'Nazionale', 'Aperto', 'Investimenti Competitività e resilienza delle filiere produttive (CdS)', 'Italia',
  array['impresa']::text[], array['culture-digital']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.mise.gov.it/index.php/it/normativa/decreti-direttoriali/decreto-direttoriale-25-marzo-2022-contratti-di-sviluppo-pnrr-filiere', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MIMIT- Ministero delle Imprese e del Made in Italy.
Stato su Italia Domani: In corso. Apertura: 11/04/22. Chiusura: Fino ad esaurimento fondi.
Area geografica: Tutto il territorio nazionale tipologia Selezione beneficiari/progetti. Destinatari: Imprese.
Misura PNRR: Investimenti Competitività e resilienza delle filiere produttive (CdS) - M1C1.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.mimit.gov.it/it/normativa/decreti-direttoriali/decreto-direttoriale-6-agosto-2024-credito-dimposta-transizione-5-0-termini-e-modalita-presentazione-domande', 'manuale', 'contributo', 'Decreto direttoriale 6 agosto 2024 - Credito d''imposta "Transizione 5.0". Termini e modalità presentazione domande', 'MIMIT- Ministero delle Imprese e del Made in Italy',
  'Nazionale', 'Aperto', 'Investimento Transazione 5.0', 'Italia',
  array['impresa']::text[], array['public-territorial']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.mimit.gov.it/it/normativa/decreti-direttoriali/decreto-direttoriale-6-agosto-2024-credito-dimposta-transizione-5-0-termini-e-modalita-presentazione-domande', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MIMIT- Ministero delle Imprese e del Made in Italy.
Stato su Italia Domani: In corso. Apertura: 07/08/24. Chiusura: Fino a esaurimento fondi.
Area geografica: Tutto il territorio nazionale. Destinatari: Imprese.
Misura PNRR: Investimento Transazione 5.0 - M7.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.gazzettaufficiale.it/eli/id/2024/08/06/24A04160/sg', 'manuale', 'contributo', 'Decreto interministeriale 24 luglio 2024 - Modalità attuative del Piano Transizione 5.0', 'MIMIT- Ministero delle Imprese e del Made in Italy',
  'Nazionale', 'Aperto', 'Investimento Transizione 5.0', 'Italia',
  array['impresa']::text[], array['public-territorial']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.gazzettaufficiale.it/eli/id/2024/08/06/24A04160/sg', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MIMIT- Ministero delle Imprese e del Made in Italy.
Stato su Italia Domani: In corso. Apertura: 07/08/24. Chiusura: Fino a esaurimento fondi.
Area geografica: Tutto il territorio nazionale. Destinatari: Imprese.
Misura PNRR: Investimento Transizione 5.0 - M7.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.ministeroturismo.gov.it/wp-content/uploads/2022/08/Avviso-Art.-3_10135_5.8.2022_signed.pdf', 'manuale', 'contributo', 'MISURA PNRR M1C3, INVESTIMENTO 4.2.5, ART. 3 DL 152/2021', 'MITUR - Ministero del Turismo',
  'Nazionale', 'Aperto', 'Investimento Fondo rotativo imprese (FRI ) per il sostegno alle imprese e gli investimenti di sviluppo', 'Italia',
  array['ente-pubblico', 'impresa', 'associazione']::text[], array['tourism', 'culture-digital']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.ministeroturismo.gov.it/wp-content/uploads/2022/08/Avviso-Art.-3_10135_5.8.2022_signed.pdf', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MITUR - Ministero del Turismo.
Stato su Italia Domani: In corso. Apertura: 16/08/22 tipologia Selezione beneficiari/progetti destinatari Altro Focus PNRR Investimento Fondo rotativo imprese (FRI ) per il sostegno alle imprese e gli investimenti di sviluppo - M1C3 Vai al bando completo <p class="label". Chiusura: Da definire.
Area geografica: —. Destinatari: Altro.
Misura PNRR: Investimento Fondo rotativo imprese (FRI ) per il sostegno alle imprese e gli investimenti di sviluppo - M1C3.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.invitalia.it/cosa-facciamo/creiamo-nuove-aziende/nuove-imprese-a-tasso-zero', 'manuale', 'contributo', 'ON - Oltre Nuove Imprese a Tasso Zero', 'MIMIT- Ministero delle Imprese e del Made in Italy',
  'Nazionale', 'Aperto', 'Investimento Creazione di imprese femminili', 'Italia',
  array['impresa', 'persona-fisica']::text[], array['civic-nonprofit', 'public-territorial']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.invitalia.it/cosa-facciamo/creiamo-nuove-aziende/nuove-imprese-a-tasso-zero', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MIMIT- Ministero delle Imprese e del Made in Italy.
Stato su Italia Domani: In corso. Apertura: 19/05/22. Chiusura: Fino a esaurimento fondi.
Area geografica: Tutto il territorio nazionale. Destinatari: Individui, Imprese.
Misura PNRR: Investimento Creazione di imprese femminili - M5C1.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.invitalia.it/cosa-facciamo/creiamo-nuove-aziende/smartstart-italia', 'manuale', 'contributo', 'Smart&Start', 'MIMIT- Ministero delle Imprese e del Made in Italy',
  'Nazionale', 'Aperto', 'Investimento Creazione di imprese femminili', 'Italia',
  array['impresa', 'persona-fisica']::text[], array['civic-nonprofit', 'public-territorial']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.invitalia.it/cosa-facciamo/creiamo-nuove-aziende/smartstart-italia', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MIMIT- Ministero delle Imprese e del Made in Italy.
Stato su Italia Domani: In corso. Apertura: 19/05/22. Chiusura: Fino a esaurimento fondi.
Area geografica: Tutto il territorio nazionale. Destinatari: Individui, Imprese.
Misura PNRR: Investimento Creazione di imprese femminili - M5C1.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.mur.gov.it/it/atti-e-normativa/decreto-ministeriale-n-481-del-26-02-202', 'manuale', 'contributo', 'Avviso finalizzato all’acquisizione della disponibilità di nuovi posti letto presso alloggi o residenze per studenti delle istituzioni della formazione superiore', 'MUR - Ministero dell''Università e della Ricerca',
  'Nazionale', 'In arrivo', 'Riforma Alloggi per gli studenti e riforma della legislazione sugli alloggi per gli studenti', 'Italia',
  array['impresa']::text[], array['public-territorial', 'civic-nonprofit']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.mur.gov.it/it/atti-e-normativa/decreto-ministeriale-n-481-del-26-02-202', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MUR - Ministero dell''Università e della Ricerca.
Stato su Italia Domani: In programma. Apertura: Da definire. Chiusura: Da definire.
Area geografica: Tutto il territorio nazionale. Destinatari: Imprese, Altro.
Misura PNRR: Riforma Alloggi per gli studenti e riforma della legislazione sugli alloggi per gli studenti - M4C1.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.ministeroturismo.gov.it/partecipa-al-tourism-digital-hub-e-contribuisci-allofferta-di-servizi-per-il-settore-vat-refund/', 'manuale', 'contributo', 'PARTECIPA AL TOURISM DIGITAL HUB E CONTRIBUISCI ALL’OFFERTA DI SERVIZI PER IL SETTORE VAT REFUND', 'MITUR - Ministero del Turismo',
  'Nazionale', 'In arrivo', 'Investimenti Hub del Turismo Digitale', 'Italia',
  array['ente-pubblico', 'impresa', 'associazione']::text[], array['tourism', 'culture-digital']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.ministeroturismo.gov.it/partecipa-al-tourism-digital-hub-e-contribuisci-allofferta-di-servizi-per-il-settore-vat-refund/', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MITUR - Ministero del Turismo.
Stato su Italia Domani: In programma. Apertura: Da definire destinatari Altro Focus PNRR Investimenti Hub del Turismo Digitale - M1C3 Vai al bando completo <p class="label". Chiusura: Da definire.
Area geografica: —. Destinatari: Altro.
Misura PNRR: Investimenti Hub del Turismo Digitale - M1C3.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
),
(
  (select id from public.workspaces where name = 'Studio Fauda'), 'PNRR https://www.ministeroturismo.gov.it/partecipa-allavviso-e-contribuisci-al-programma-tourism-digital-hub-accordo-di-adesione-pp-aa/%20', 'manuale', 'contributo', 'PARTECIPA ALL’AVVISO E CONTRIBUISCI AL PROGRAMMA TOURISM DIGITAL HUB – ACCORDO DI ADESIONE PP.AA.', 'MITUR - Ministero del Turismo',
  'Nazionale', 'In arrivo', 'Investimento Hub del Turismo Digitale', 'Italia',
  array['ente-pubblico', 'impresa', 'associazione']::text[], array['tourism', 'culture-digital']::text[], 'UE', null, false,
  (select id from public.sources where workspace_id = (select id from public.workspaces where name = 'Studio Fauda') and name like 'MiC · PNRR%' limit 1),
  'https://www.ministeroturismo.gov.it/partecipa-allavviso-e-contribuisci-al-programma-tourism-digital-hub-accordo-di-adesione-pp-aa/%20', now(), true, 'Importato da Italia Domani (catalogo degli avvisi PNRR) il 29 settembre 2026.
Amministrazione titolare: MITUR - Ministero del Turismo.
Stato su Italia Domani: In programma. Apertura: Da definire. Chiusura: Da definire.
Area geografica: Tutto il territorio nazionale. Destinatari: Altro.
Misura PNRR: Investimento Hub del Turismo Digitale - M1C3.
Da verificare: soggetti ammessi (ricavati dai «destinatari»), importi e cofinanziamento non indicati nel catalogo.'
)
on conflict (workspace_id, external_code) where external_code is not null do nothing;
