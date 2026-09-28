/**
 * Cerca Bandi — questionario-intervista
 *
 * Il profilo non si compila con un modulo a campi liberi: si costruisce con un'intervista
 * guidata che cambia percorso in base al tipo di soggetto (requisiti v3, punto aperto 4).
 * Dalle risposte si ricavano i temi, e dai temi gli ambiti e quindi le fonti pertinenti.
 */

import type { PackId, SubjectType } from "./types";

export type QuestionKind = "single" | "multi" | "number" | "text" | "boolean";

export interface Question {
  id: string;
  kind: QuestionKind;
  /** Testo della domanda, in tono colloquiale: è un'intervista, non un form. */
  prompt: string;
  help?: string;
  options?: Array<{
    value: string;
    label: string;
    /** Temi che questa risposta fa emergere. */
    themes?: string[];
    /** Ambiti aggiunti direttamente da questa risposta. */
    packs?: PackId[];
  }>;
  /** Parametro del profilo alimentato dalla risposta (per le domande numeriche/testuali). */
  paramKey?: string;
  /** La domanda compare solo se la condizione è soddisfatta. */
  showIf?: (answers: Answers) => boolean;
  required?: boolean;
}

export type Answers = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Passo 0 — comune a tutti: stabilisce il percorso
// ---------------------------------------------------------------------------

export const SUBJECT_TYPE_QUESTION: Question = {
  id: "subjectType",
  kind: "single",
  prompt: "Prima di tutto: che tipo di soggetto stiamo profilando?",
  help: "Da questa risposta dipendono le domande successive.",
  required: true,
  options: [
    { value: "ente-pubblico", label: "Un ente pubblico (Comune, istituto, ente centrale)" },
    { value: "impresa", label: "Un'impresa o uno studio professionale" },
    { value: "associazione", label: "Un'associazione o un soggetto del terzo settore" },
    { value: "persona-fisica", label: "Una persona fisica (es. proprietario di un fondo)" },
  ],
};

const COMMON_CLOSING: Question[] = [
  {
    id: "regione",
    kind: "text",
    prompt: "In quale regione opera principalmente?",
    paramKey: "regione",
    required: true,
  },
  {
    id: "provincia",
    kind: "text",
    prompt: "E in quale provincia?",
    paramKey: "provincia",
  },
  {
    id: "preavvisoMinimoGiorni",
    kind: "number",
    prompt: "Quanti giorni di preavviso servono, come minimo, per riuscire a preparare una candidatura?",
    help: "Serve a scartare i bandi che scadono troppo presto per essere davvero praticabili.",
    paramKey: "preavvisoMinimoGiorni",
  },
  {
    id: "isTemplate",
    kind: "single",
    prompt: "Questo profilo rappresenta un soggetto reale, o è un modello di categoria da usare per le simulazioni?",
    help: "I modelli di categoria non vengono penalizzati: servono a valutare i bandi prima di individuare il soggetto reale.",
    options: [
      { value: "reale", label: "Un soggetto reale" },
      { value: "modello", label: "Un modello di categoria, per le simulazioni" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Percorso: ente pubblico
// ---------------------------------------------------------------------------

const PATH_ENTE_PUBBLICO: Question[] = [
  {
    id: "entePubblicoTipo",
    kind: "single",
    prompt: "Di che tipo di ente si tratta?",
    required: true,
    options: [
      { value: "comune", label: "Comune", packs: ["public-territorial"] },
      { value: "unione", label: "Unione di Comuni o ente sovracomunale", packs: ["public-territorial"] },
      { value: "istituto-centrale", label: "Istituto o ente centrale", packs: ["public-territorial"] },
      { value: "altro-ente", label: "Altro ente pubblico", packs: ["public-territorial"] },
    ],
  },
  {
    id: "abitanti",
    kind: "number",
    prompt: "Quanti abitanti ha il territorio di riferimento?",
    help: "Molti bandi hanno soglie legate alla dimensione demografica. È anche il parametro più usato nelle simulazioni.",
    paramKey: "abitanti",
    showIf: (a) => a.entePubblicoTipo === "comune" || a.entePubblicoTipo === "unione",
  },
  {
    id: "classificazioni",
    kind: "multi",
    prompt: "Il territorio rientra in una di queste classificazioni?",
    help: "Spesso sono requisito di ammissibilità o danno punteggio premiale.",
    paramKey: "classificazioni",
    options: [
      { value: "montano", label: "Comune montano" },
      { value: "area-interna", label: "Area interna" },
      { value: "turistico", label: "Comune turistico" },
      { value: "sisma", label: "Zona a rischio sismico rilevante" },
      { value: "idrogeologico", label: "Area a rischio idrogeologico", themes: ["Rischio idrogeologico"] },
      { value: "nessuna", label: "Nessuna di queste" },
    ],
  },
  {
    id: "ambitiInteresse",
    kind: "multi",
    prompt: "Su quali ambiti vi interessa intercettare finanziamenti?",
    help: "Si può selezionare più di una voce: gli ambiti non sono in concorrenza tra loro.",
    required: true,
    options: [
      { value: "infrastrutture", label: "Infrastrutture, viabilità, ponti", themes: ["Ponti e viabilità", "Infrastrutture"], packs: ["engineering-procurement"] },
      { value: "edilizia", label: "Edilizia pubblica e scuole", themes: ["Edilizia scolastica", "Riqualificazione edilizia"], packs: ["engineering-procurement"] },
      { value: "energia", label: "Efficientamento energetico e rinnovabili", themes: ["Efficienza energetica"], packs: ["energy", "engineering-procurement"] },
      { value: "rigenerazione", label: "Rigenerazione urbana e spazi pubblici", themes: ["Rigenerazione urbana"], packs: ["engineering-procurement", "public-territorial"] },
      { value: "cultura", label: "Cultura, patrimonio, biblioteche", themes: ["Patrimonio culturale", "Accessibilità e partecipazione culturale"], packs: ["culture-digital"] },
      { value: "turismo", label: "Turismo e valorizzazione territoriale", themes: ["Turismo culturale"], packs: ["tourism"] },
      { value: "digitale", label: "Digitalizzazione e competenze digitali", themes: ["Competenze digitali"], packs: ["culture-digital"] },
      { value: "sociale", label: "Servizi sociali e sanitari", themes: ["Servizi alla persona"], packs: ["health", "civic-nonprofit"] },
      { value: "ambiente", label: "Ambiente, dissesto, risorsa idrica", themes: ["Rischio idrogeologico", "Risorsa idrica"], packs: ["engineering-procurement", "agri-rural"] },
      { value: "sport", label: "Impianti sportivi", themes: ["Impianti sportivi"], packs: ["engineering-procurement"] },
    ],
  },
  {
    id: "capacitaCofinanziamento",
    kind: "number",
    prompt: "Quanto riuscite a mettere come cofinanziamento, indicativamente, su un progetto?",
    help: "Anche una stima approssimativa è utile: il dato incerto non blocca la valutazione, allarga solo l'intervallo del punteggio.",
    paramKey: "capacitaCofinanziamento",
  },
  {
    id: "rupDisponibile",
    kind: "boolean",
    prompt: "È disponibile un RUP interno per seguire la procedura?",
    paramKey: "rupDisponibile",
  },
  {
    id: "anticipazioneCassa",
    kind: "boolean",
    prompt: "L'ente è in grado di anticipare le spese in attesa del rimborso?",
    paramKey: "anticipazioneCassa",
  },
];

// ---------------------------------------------------------------------------
// Percorso: impresa / studio professionale
// ---------------------------------------------------------------------------

const PATH_IMPRESA: Question[] = [
  {
    id: "attivitaPrevalente",
    kind: "multi",
    prompt: "Di cosa vi occupate principalmente?",
    required: true,
    options: [
      { value: "progettazione", label: "Progettazione e direzione lavori", themes: ["Progettazione tecnica"], packs: ["engineering-procurement"] },
      { value: "infrastrutture", label: "Infrastrutture e opere pubbliche", themes: ["Infrastrutture", "Ponti e viabilità"], packs: ["engineering-procurement"] },
      { value: "idraulica", label: "Opere idrauliche e difesa del suolo", themes: ["Rischio idrogeologico", "Risorsa idrica"], packs: ["engineering-procurement"] },
      { value: "energia", label: "Energia e rinnovabili", themes: ["Efficienza energetica"], packs: ["energy"] },
      { value: "urbanistica", label: "Urbanistica e rigenerazione", themes: ["Rigenerazione urbana", "Sviluppo territoriale"], packs: ["engineering-procurement", "public-territorial"] },
      { value: "restauro", label: "Restauro e patrimonio", themes: ["Patrimonio", "Restauro"], packs: ["culture-digital"] },
      { value: "ambiente", label: "Ambiente e sostenibilità", themes: ["Ambiente"], packs: ["agri-rural", "energy"] },
    ],
  },
  {
    id: "lavoraPerEnti",
    kind: "boolean",
    prompt: "Lavorate abitualmente per enti pubblici come partner tecnico?",
    help: "Se sì, vi segnaleremo anche i bandi destinati agli enti, indicandoli come possibile incarico tecnico invece che come candidatura diretta.",
    required: true,
  },
  {
    id: "interesseReplicabilita",
    kind: "boolean",
    prompt: "Vi interessano particolarmente i bandi replicabili su più committenti?",
    help: "Es. efficientamento energetico o rinnovamento scuole, dove la stessa impostazione si ripropone a Comuni diversi.",
  },
  {
    id: "fatturatoAnnuo",
    kind: "number",
    prompt: "Qual è il fatturato annuo medio degli ultimi esercizi?",
    help: "Serve a verificare i requisiti di capacità economica. Anche una stima va bene.",
    paramKey: "fatturatoAnnuo",
  },
  {
    id: "personaleTecnico",
    kind: "number",
    prompt: "Quante persone con competenze tecniche lavorano stabilmente con voi?",
    help: "Interni e collaboratori continuativi. Serve a valutare se riuscite a seguire una candidatura e il progetto che ne segue.",
    paramKey: "personaleTecnico",
  },
  {
    id: "certificazioni",
    kind: "multi",
    prompt: "Quali certificazioni o qualificazioni possedete?",
    paramKey: "certificazioni",
    options: [
      { value: "iso9001", label: "ISO 9001" },
      { value: "soa", label: "Attestazione SOA" },
      { value: "iso14001", label: "ISO 14001" },
      { value: "albo-professionale", label: "Iscrizione ad albo professionale" },
      { value: "nessuna", label: "Nessuna al momento" },
    ],
  },
  {
    id: "polizzeMassimali",
    kind: "number",
    prompt: "Qual è il massimale della polizza professionale?",
    paramKey: "polizzeMassimali",
  },
  {
    id: "disponibilitaRTI",
    kind: "boolean",
    prompt: "Siete disponibili a partecipare in raggruppamento (RTI/ATI) quando il bando lo richiede?",
    help: "I partner specifici non li chiediamo qui: quando un bando li richiede, lo segnaliamo come requisito del bando.",
  },
];

// ---------------------------------------------------------------------------
// Percorso: associazione / terzo settore
// ---------------------------------------------------------------------------

const PATH_ASSOCIAZIONE: Question[] = [
  {
    id: "formaGiuridica",
    kind: "single",
    prompt: "Qual è la forma giuridica?",
    required: true,
    options: [
      { value: "aps", label: "APS — Associazione di promozione sociale", packs: ["civic-nonprofit"] },
      { value: "odv", label: "ODV — Organizzazione di volontariato", packs: ["civic-nonprofit"] },
      { value: "ets-altro", label: "Altro ente del terzo settore", packs: ["civic-nonprofit"] },
      { value: "non-iscritta", label: "Associazione non ancora iscritta al RUNTS", packs: ["civic-nonprofit"] },
    ],
  },
  {
    id: "iscrizioneRunts",
    kind: "boolean",
    prompt: "L'ente è iscritto al RUNTS?",
    help: "È requisito di ammissibilità per molti bandi del terzo settore.",
  },
  {
    id: "ambitiAttivita",
    kind: "multi",
    prompt: "In quali ambiti operate?",
    required: true,
    options: [
      { value: "partecipazione", label: "Partecipazione civica e cittadinanza", themes: ["Partecipazione civica"], packs: ["civic-nonprofit"] },
      { value: "giovani", label: "Giovani e comunità", themes: ["Giovani, comunità"], packs: ["civic-nonprofit"] },
      { value: "cultura", label: "Cultura e produzione culturale", themes: ["Cultura"], packs: ["culture-digital"] },
      { value: "informazione", label: "Informazione, dati, alfabetizzazione mediatica", themes: ["Informazione, dati"], packs: ["civic-nonprofit", "culture-digital"] },
      { value: "ambiente", label: "Ambiente e sostenibilità", themes: ["Ambiente"], packs: ["energy", "agri-rural"] },
      { value: "sociale", label: "Inclusione e servizi alla persona", themes: ["Innovazione sociale"], packs: ["health", "civic-nonprofit"] },
      { value: "europa", label: "Progetti europei e mobilità (es. Erasmus)", themes: ["Cittadinanza europea"], packs: ["civic-nonprofit"] },
    ],
  },
  {
    id: "interesseFondazioni",
    kind: "boolean",
    prompt: "Vi interessano anche i bandi di fondazioni private e filantropiche?",
    help: "Oltre ai fondi pubblici e ai programmi europei.",
  },
  {
    id: "personaleTecnico",
    kind: "number",
    prompt: "Quante persone, tra dipendenti e volontari stabili, possono seguire la progettazione e la rendicontazione?",
    help: "Serve a valutare se riuscite a gestire una candidatura e il progetto che ne segue.",
    paramKey: "personaleTecnico",
  },
  {
    id: "capacitaCofinanziamento",
    kind: "number",
    prompt: "Quanto riuscite a mettere come quota propria su un progetto?",
    paramKey: "capacitaCofinanziamento",
  },
];

// ---------------------------------------------------------------------------
// Percorso: persona fisica
// ---------------------------------------------------------------------------

const PATH_PERSONA_FISICA: Question[] = [
  {
    id: "beniPosseduti",
    kind: "multi",
    prompt: "Su cosa vorrebbe intercettare un finanziamento?",
    required: true,
    options: [
      { value: "fondo-agricolo", label: "Un fondo agricolo o terreni coltivati", themes: ["Agricoltura"], packs: ["agri-rural"] },
      { value: "oliveti", label: "Oliveti o frutteti", themes: ["Olivicoltura", "Frutteti"], packs: ["agri-rural"] },
      { value: "immobile-storico", label: "Un immobile storico o di pregio", themes: ["Patrimonio architettonico rurale e restauro"], packs: ["culture-digital"] },
      { value: "pozzi", label: "Pozzi o impianti irrigui", themes: ["Risorsa idrica", "Irrigazione"], packs: ["agri-rural"] },
      { value: "bosco", label: "Boschi o aree naturali", themes: ["Biodiversità", "Agroforestazione"], packs: ["agri-rural"] },
      { value: "ricettivo", label: "Una struttura ricettiva o agrituristica", themes: ["Turismo rurale"], packs: ["tourism", "agri-rural"] },
    ],
  },
  {
    id: "haImpresaAgricola",
    kind: "boolean",
    prompt: "Possiede una partita IVA agricola o è iscritto come impresa agricola?",
    help: "Molti bandi agricoli lo richiedono come requisito di ammissibilità: se manca, il bando risulta non applicabile.",
    required: true,
  },
  {
    id: "produzioneStandard",
    kind: "number",
    prompt: "Qual è la produzione standard aziendale, se la conosce?",
    help: "È una soglia frequente nei bandi PSR/CSR. Se non la conosce, si può lasciare vuoto.",
    paramKey: "produzioneStandard",
    showIf: (a) => a.haImpresaAgricola === true,
  },
  {
    id: "superficie",
    kind: "number",
    prompt: "Quanti ettari ha il fondo, indicativamente?",
    paramKey: "superficie",
  },
  {
    id: "capacitaCofinanziamento",
    kind: "number",
    prompt: "Quale investimento proprio è disposto a sostenere?",
    help: "Quasi tutti i bandi agricoli finanziano solo una quota della spesa.",
    paramKey: "capacitaCofinanziamento",
  },
];

// ---------------------------------------------------------------------------
// Composizione del percorso
// ---------------------------------------------------------------------------

const PATHS: Record<SubjectType, Question[]> = {
  "ente-pubblico": PATH_ENTE_PUBBLICO,
  impresa: PATH_IMPRESA,
  associazione: PATH_ASSOCIAZIONE,
  "persona-fisica": PATH_PERSONA_FISICA,
};

/** Restituisce le domande da porre, dato il tipo di soggetto e le risposte già date. */
export function buildInterview(subjectType: SubjectType | null, answers: Answers = {}): Question[] {
  if (!subjectType) return [SUBJECT_TYPE_QUESTION];
  const path = PATHS[subjectType] || [];
  return [SUBJECT_TYPE_QUESTION, ...path, ...COMMON_CLOSING].filter(
    (q) => !q.showIf || q.showIf(answers)
  );
}

/** Traduce la risposta alla domanda `isTemplate` nel campo `Profile.isTemplate`. */
export function isTemplateFromAnswers(answers: Answers): boolean {
  return answers.isTemplate === "modello";
}

/**
 * Ricava temi e ambiti dalle risposte.
 * È il passaggio che garantisce la coerenza tra profilo e fonti proposte:
 * gli ambiti non vengono assegnati a mano, ma derivano da ciò che il soggetto ha dichiarato.
 */
export function deriveFromAnswers(
  subjectType: SubjectType,
  answers: Answers
): { themes: string[]; packs: PackId[] } {
  const themes = new Set<string>();
  const packs = new Set<PackId>();

  const questions = buildInterview(subjectType, answers);
  for (const q of questions) {
    const answer = answers[q.id];
    if (answer === undefined || answer === null) continue;

    const selected = Array.isArray(answer) ? answer : [answer];
    for (const value of selected) {
      const option = q.options?.find((o) => o.value === value);
      if (!option) continue;
      option.themes?.forEach((t) => themes.add(t));
      option.packs?.forEach((p) => packs.add(p));
    }
  }

  // Regole trasversali che non dipendono da una singola risposta.
  if (subjectType === "ente-pubblico") packs.add("public-territorial");
  if (subjectType === "associazione") {
    packs.add("civic-nonprofit");
    if (answers.interesseFondazioni === true) packs.add("private-philanthropy");
  }
  if (subjectType === "impresa" && answers.lavoraPerEnti === true) {
    // Chi lavora per gli enti deve vedere anche i bandi destinati agli enti,
    // come possibile incarico tecnico.
    packs.add("public-territorial");
  }

  return { themes: Array.from(themes), packs: Array.from(packs) };
}
