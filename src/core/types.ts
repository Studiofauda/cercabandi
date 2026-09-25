/**
 * Cerca Bandi — modello dati
 *
 * Principio guida (requisiti v3, §2): un profilo NON è una scheda fissa con campi
 * eventualmente mancanti, ma un modello parametrico. Ogni campo è sempre compilabile
 * e modificabile, e può essere fatto variare per simulare soggetti diversi
 * (es. lo stesso "Piccolo Comune" con 800 o 5.000 abitanti, in Piemonte o in Lombardia).
 */

// ---------------------------------------------------------------------------
// Soggetti e profili
// ---------------------------------------------------------------------------

/** Determina quale percorso di intervista viene proposto (requisiti v3, punto aperto 4). */
export type SubjectType =
  | "ente-pubblico"
  | "impresa"
  | "associazione"
  | "persona-fisica";

/** Ambiti tematici usati per collegare un profilo alle fonti pertinenti. */
export type PackId =
  | "engineering-procurement"
  | "public-territorial"
  | "agri-rural"
  | "culture-digital"
  | "civic-nonprofit"
  | "private-philanthropy"
  // categorie aggiunte su indicazione esplicita (requisiti v3, "Ampliamento delle fonti")
  | "health"
  | "tourism"
  | "energy";

/**
 * Valore di un parametro del profilo.
 * `confidence` distingue un dato verificato da una stima: i dati incerti non bloccano
 * il punteggio, ma lo fanno restituire come intervallo (requisiti v3, Fase 1).
 */
export interface ParamValue<T> {
  value: T | null;
  confidence: "verificato" | "stimato" | "ipotesi";
  /** Da dove viene il dato: bilancio, visura, risposta all'intervista, stima dell'utente… */
  source?: string;
  updatedAt?: string;
}

/**
 * Parametri di un profilo. Sono volutamente tutti opzionali e tutti modificabili:
 * è questo che rende possibile la simulazione "cosa cambierebbe se…".
 */
export interface ProfileParams {
  // territorio
  regione?: ParamValue<string>;
  provincia?: ParamValue<string>;
  comune?: ParamValue<string>;
  abitanti?: ParamValue<number>;
  /** Classificazioni che spesso sono requisito di ammissibilità: montano, area interna, ecc. */
  classificazioni?: ParamValue<string[]>;

  // capacità economica
  fatturatoAnnuo?: ParamValue<number>;
  capacitaCofinanziamento?: ParamValue<number>;
  /** Per gli enti: capacità di anticipare cassa in attesa del rimborso. */
  anticipazioneCassa?: ParamValue<boolean>;

  // capacità organizzativa
  personaleTecnico?: ParamValue<number>;
  rupDisponibile?: ParamValue<boolean>;
  /** Giorni di preavviso minimi per riuscire ad attivare una candidatura. */
  preavvisoMinimoGiorni?: ParamValue<number>;

  // qualifiche
  certificazioni?: ParamValue<string[]>;
  polizzeMassimali?: ParamValue<number>;

  [key: string]: ParamValue<unknown> | undefined;
}

export interface Profile {
  id: string;
  name: string;
  shortName: string;
  subjectType: SubjectType;
  organizationType: string;

  /** Temi ricavati dalle risposte all'intervista; guidano il collegamento alle fonti. */
  themes: string[];
  /** Ambiti calcolati dai temi. Persistiti per tracciabilità, ricalcolabili in ogni momento. */
  packs: PackId[];
  /** Correzioni manuali al calcolo automatico degli ambiti. */
  packOverrides?: { add?: PackId[]; remove?: PackId[] };

  params: ProfileParams;

  /** Risposte grezze all'intervista, conservate per poter ricalcolare temi e ambiti. */
  interviewAnswers?: Record<string, unknown>;

  /**
   * Un profilo "modello" rappresenta una categoria (es. il piccolo Comune tipo) e non un
   * soggetto reale. Non va penalizzato nel punteggio: è anzi la base delle simulazioni.
   */
  isTemplate: boolean;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Opportunità (bandi)
// ---------------------------------------------------------------------------

export type OpportunityStatus = "Aperto" | "In arrivo" | "Chiuso";
export type OpportunityLevel = "Europeo" | "Nazionale" | "Regionale" | "Locale";

/**
 * Chi è il beneficiario formale del bando.
 * Serve a distinguere il caso "bando per il Comune, ma ci lavoreremmo noi"
 * (requisiti v3, punto aperto 2): Studio Fauda non è ammissibile come beneficiario,
 * ma l'opportunità è comunque rilevante come incarico tecnico.
 */
export type BeneficiaryRole =
  | "beneficiario-diretto"
  | "incarico-tecnico"
  | "partner-di-progetto";

/**
 * Categorie di spesa finanziabili. Servono a capire se due bandi coprono voci diverse
 * dello stesso progetto (cumulabili) o la stessa voce (doppio finanziamento, vietato).
 */
export type ExpenseCategory =
  | "progettazione"
  | "direzione-lavori"
  | "opere-strutturali"
  | "efficientamento-energetico"
  | "impianti"
  | "restauro"
  | "arredi-attrezzature"
  | "digitalizzazione"
  | "formazione"
  | "personale"
  | "comunicazione"
  | "studi-indagini";

/** Origine dei fondi: rileva perché i fondi UE hanno vincoli di cumulo più stringenti. */
export type FundingSource = "UE" | "Nazionale" | "Regionale" | "Privato";

export interface Opportunity {
  id: string;
  title: string;
  authority: string;
  level: OpportunityLevel;
  status: OpportunityStatus;
  theme: string;
  territory: string;

  /** Chi può presentare domanda: determina il ruolo che ciascun profilo può assumere. */
  eligibleSubjectTypes: SubjectType[];
  /** Ambiti tematici del bando; incrociati con quelli del profilo. */
  packs: PackId[];

  /** Voci di spesa che il bando finanzia. Base del ragionamento sulla cumulabilità. */
  expenseCategories?: ExpenseCategory[];
  /** Origine dei fondi, rilevante per i vincoli di cumulo. */
  fundingSource?: FundingSource;
  /**
   * Il bando dichiara esplicitamente se il contributo è cumulabile con altri.
   * `undefined` significa che il dato non è stato ancora verificato sul testo ufficiale.
   */
  cumulabile?: boolean;
  /** Il bando consente che la quota di cofinanziamento provenga da altri contributi pubblici. */
  cofinanziamentoDaAltriFondi?: boolean;

  budgetTotale?: number;
  contributoMax?: number;
  cofinanziamentoRichiestoPct?: number;

  /**
   * Soglie demografiche di ammissibilità (estremi inclusi), es. "Comuni fino a 5.000 abitanti".
   * Sono requisiti, non preferenze: un profilo fuori soglia non è ammissibile.
   */
  abitantiMin?: number;
  abitantiMax?: number;

  /** Per i bandi aperti: giorni alla scadenza della domanda. */
  deadline?: string;
  /** Per i bandi "In arrivo": stima della data di pubblicazione. */
  expectedPublication?: string;

  /**
   * Un bando replicabile permette di riproporre la stessa impostazione a più soggetti
   * (es. efficientamento energetico su più Comuni): agisce da moltiplicatore del punteggio
   * per i profili che lavorano su commessa (requisiti v3, punto aperto 1).
   */
  replicabile: boolean;

  /** Partner o raggruppamenti richiesti dal bando (non sono un dato del profilo). */
  partnershipRichieste?: string[];

  sourceId: string;
  sourceUrl: string;
  /** Data dell'ultima verifica sulla fonte ufficiale. */
  verifiedAt?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Storico delle modifiche a un bando (requisiti v3, §5).
 * Le versioni non vengono sovrascritte: ogni cambiamento rilevato genera una revisione,
 * così proroghe, nuovi requisiti o importi diversi non passano inosservati.
 */
export interface OpportunityRevision {
  id: string;
  opportunityId: string;
  detectedAt: string;
  changes: Array<{
    field: string;
    previous: unknown;
    current: unknown;
  }>;
  /** Snapshot completo del bando al momento della revisione. */
  snapshot: Opportunity;
}

// ---------------------------------------------------------------------------
// Fonti
// ---------------------------------------------------------------------------

export type SourceScope = "Base comune" | "Specialistica";
export type SourceReliability = "Ufficiale" | "Istituzionale" | "Secondaria";

export interface Source {
  id: string;
  name: string;
  url: string;
  covers: string;
  level: string;
  scope: SourceScope;
  /** Ambiti serviti dalla fonte; incrociati con quelli del profilo. */
  packs: PackId[];

  /**
   * L'affidabilità incide sull'ordine di visualizzazione, non sul punteggio del bando
   * (requisiti v3, punto aperto 5).
   */
  reliability: SourceReliability;
  /** Metodo di lettura: open data, API ufficiale, ricerca strutturata… */
  method: string;
  /** True quando la fonte espone un'API interrogabile automaticamente (es. TED). */
  hasApi: boolean;

  lastCheckedAt?: string;
  /** Feedback rapido raccolto dall'uso reale, invece di una verifica formale periodica. */
  feedback?: { useful: number; notUseful: number };
}

// ---------------------------------------------------------------------------
// Valutazione
// ---------------------------------------------------------------------------

/** Stato di un dato incerto: i dati stimati allargano l'intervallo meno di quelli mancanti. */
export type ParamStatus = "mancante" | "stimato" | "ipotesi";

/**
 * Dato incerto su cui si basa un criterio. `key` è il nome del campo, così l'interfaccia
 * può portare l'utente direttamente al punto da compilare o verificare.
 */
export interface UncertainParam {
  key: string;
  label: string;
  criterion: string;
  /** Il campo appartiene al profilo (da compilare) o al bando (da estrarre dai testi). */
  subject: "profilo" | "bando";
  status: ParamStatus;
}

export interface ScoreBreakdown {
  criterion: string;
  weight: number;
  score: number;
  note: string;
  /** Requisito di ammissibilità: se non soddisfatto (punteggio 0) blocca, qualunque sia il peso. */
  eligibility?: boolean;
  /** Dati incerti usati dal criterio: allargano l'intervallo di punteggio. */
  uncertainParams?: UncertainParam[];
}

export interface Evaluation {
  opportunityId: string;
  profileId: string;
  /** Punteggio centrale, 0–100. */
  score: number;
  /** Intervallo di incertezza dovuto ai parametri stimati o mancanti. */
  scoreRange: [number, number];
  role: BeneficiaryRole | null;
  verdict:
    | "GO"
    | "GO condizionato"
    | "Da approfondire"
    | "Incarico tecnico"
    | "NO-GO"
    | "Non applicabile";
  breakdown: ScoreBreakdown[];
  /** Dati mancanti o stimati che, se compilati o verificati, restringerebbero l'intervallo. */
  uncertainParams: UncertainParam[];
  evaluatedAt: string;
}

/** Bando scartato con motivazione: non viene escluso da future rivalutazioni. */
export interface DismissedOpportunity {
  opportunityId: string;
  profileId: string;
  reason: string;
  dismissedBy: string;
  dismissedAt: string;
}
