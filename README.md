# Cerca Bandi — Studio Fauda

Strumento per individuare bandi e opportunità di finanziamento coerenti con profili di
potenziali beneficiari, valutarne la compatibilità e preparare le candidature.

Questo repository contiene il **nucleo logico** del progetto: modello dati, intervista
guidata e motore di valutazione. Sono le parti che incorporano le decisioni prese nei
requisiti v3 e che sarebbe costoso rifare in seguito. L'interfaccia e l'infrastruttura
vanno costruite sopra questo nucleo.

---

## Stack previsto

| Livello | Scelta | Note |
|---|---|---|
| Frontend | Next.js | Stesso framework del sito esistente (studiofauda.com) |
| Hosting | Vercel o Netlify | Da verificare i termini d'uso per progetti di lavoro |
| Database + auth | Supabase (o Neon/Turso) | Supabase include l'autenticazione già pronta |
| Accesso | Sottodominio dedicato | Es. `bandi.studiofauda.com`, con link dal sito |

L'applicazione è **autonoma** rispetto al sito: non richiede modifiche al repository
gestito dall'agenzia, solo un sottodominio o un collegamento.

---

## Struttura

```
src/core/
  types.ts         Modello dati: profili parametrici, bandi, revisioni, fonti, valutazioni
  interview.ts     Questionario-intervista a percorsi differenziati per tipo di soggetto
  scoring.ts       Motore di valutazione a pesi dinamici, con intervallo di incertezza
  combinations.ts  Cumulabilità: bandi diversi sullo stesso progetto, senza doppio finanziamento
  verify.ts        Verifica della logica su casi reali (eseguibile con `npx tsx`)
```

Per eseguire la verifica:

```bash
npm install
npm run typecheck
npm run verify
```

---

## Decisioni incorporate nel codice

**Profili parametrici, non schede fisse.** Ogni campo del profilo è sempre compilabile e
modificabile. Lo stesso modello di "Piccolo Comune" può essere simulato con 800 o 5.000
abitanti, in Piemonte o in Lombardia, ottenendo punteggi diversi sullo stesso bando
(`simulate()` in `scoring.ts`).

**L'intervista cambia percorso.** Quattro percorsi distinti — ente pubblico, impresa,
associazione, persona fisica — con domande pertinenti a ciascuno. Le risposte generano
automaticamente temi e ambiti: gli ambiti non si assegnano a mano.

**Incarico tecnico.** Se un'impresa dichiara di lavorare per enti pubblici, i bandi
destinati agli enti restano visibili con ruolo `incarico-tecnico` invece di essere
scartati come non applicabili. Il cofinanziamento non viene mai conteggiato a carico dello
studio, perché è a carico del committente. Quando però il bando lo richiede, il punteggio
viene ridotto (fattore 0.8): l'incarico dipende dalla capacità dell'amministrazione di
coprire la propria quota, quindi è meno certo.

**Replicabilità come moltiplicatore.** I bandi riproponibili a più committenti ricevono un
moltiplicatore (oggi 1.15) per i profili che hanno dichiarato interesse in tal senso.

**Pesi dinamici.** I pesi dei criteri si adattano al singolo bando: se non è richiesto
cofinanziamento la capacità economica non pesa; sui bandi locali il territorio pesa di
più; con la scadenza vicina contano di più le tempistiche.

**Dati incerti, non bloccanti.** Un parametro mancante non impedisce la valutazione:
allarga l'intervallo di punteggio (`scoreRange`) e viene elencato in `uncertainParams`.
Anche un dato **stimato** allarga l'intervallo, della metà rispetto a un dato mancante;
un'**ipotesi** vale quanto un dato mancante. Ogni voce di `uncertainParams` indica il
campo (`key`), se appartiene al profilo o al bando, e il criterio su cui incide, così
l'interfaccia può portare l'utente direttamente al campo da compilare o verificare.

**Soglie demografiche.** Un bando può indicare `abitantiMin` / `abitantiMax` (estremi
inclusi). Sono requisiti di ammissibilità: fuori soglia il verdetto è NO-GO, qualunque sia
il peso del criterio. Se gli abitanti del profilo non sono indicati la valutazione procede
con un intervallo più ampio. Per gli incarichi tecnici il criterio non si applica, perché
le soglie riguardano il Comune committente.

**Competenze tecniche.** Imprese e associazioni dichiarano nell'intervista le competenze
interne (`params.competenze`); il bando indica quelle richieste (`competenzeRichieste`).
Il criterio "Competenze tecniche" vale la quota coperta e pesa solo sui bandi che ne
richiedono. Non blocca mai (`nonBlocking`): una competenza mancante si copre con un
partner o un raggruppamento. Per enti pubblici e persone fisiche non si applica, perché
le competenze sono quelle dei professionisti da incaricare.

**Profilo reale o modello.** Nell'intervista la domanda `isTemplate` è una scelta tra
"soggetto reale" e "modello di categoria"; `isTemplateFromAnswers()` la traduce nel campo
del profilo.

**Storico dei bandi.** `OpportunityRevision` conserva le versioni successive di un bando
invece di sovrascriverle, così proroghe e modifiche ai requisiti non sfuggono.

**Affidabilità della fonte.** Influisce sull'ordine di visualizzazione, non sul punteggio.

**Cumulabilità.** `combinations.ts` individua coppie di bandi che potrebbero finanziare lo
stesso progetto coprendo voci di spesa diverse, e propone come ripartirle. Segnala le
sovrapposizioni (spese che entrambi finanziano, da imputare a uno solo), i casi in cui un
bando è interamente contenuto nell'altro (doppio finanziamento, da escludere) e i vincoli
più stringenti tra due fondi europei.

> Il modulo **non stabilisce** se due contributi siano cumulabili: è una questione
> giuridica che si decide sui testi ufficiali e, per i fondi UE, sui regolamenti
> applicabili. Segnala le combinazioni che vale la pena verificare e quelle da scartare
> subito, con i motivi. La verifica finale resta umana.

Perché funzioni serve popolare due campi del bando che oggi molti dati non hanno:
`expenseCategories` (quali spese finanzia) e `fundingSource`. Senza, la combinazione viene
comunque proposta ma marcata come "da verificare", perché la sovrapposizione non è
escludibile.

---

## Parametri da calibrare insieme

Sono numeri scelti come punto di partenza ragionevole, da rivedere con dati reali:

- `DIGEST_THRESHOLD = 70` — soglia di segnalazione di un nuovo bando.
- `REPLICABILITY_MULTIPLIER = 1.15` — peso della replicabilità.
- `TECHNICAL_COFINANCING_FACTOR = 0.8` — riduzione applicata agli incarichi tecnici sui
  bandi che richiedono cofinanziamento.
- `ESTIMATED_UNCERTAINTY_FACTOR = 0.5` — quanto allarga l'intervallo un dato stimato,
  rispetto a uno mancante.
- `UNCERTAINTY_SPREAD = 40` — ampiezza dell'intervallo generata da un criterio del tutto
  incerto, a peso pieno.
- Pesi base in `computeWeights()` (soglie demografiche e competenze pesano 2 quando presenti).

Nota: il ruolo di incarico tecnico **non è di per sé penalizzante**. Viene evidenziato nel
verdetto, e il cofinanziamento non grava mai sulla capacità economica dello studio, perché
resta a carico del committente. La riduzione si applica solo quando il bando richiede un
cofinanziamento: in quel caso l'incarico dipende dalla capacità dell'amministrazione di
coprire la propria quota, ed è quindi meno certo.

---

## Da costruire

**Fase 1 — Fondamenta**
- [ ] Progetto Next.js e schema del database
- [ ] Autenticazione multi-utente
- [ ] Interfaccia dell'intervista guidata
- [ ] Viste Opportunità / Profili / Fonti collegate al database
- [ ] Simulazione "cosa cambierebbe se…"

**Fase 2 — Fonti e continuità**
- [ ] Ampliamento delle fonti e delle categorie (sanità, turismo, energia)
- [ ] Controllo automatico settimanale e on-demand
- [ ] Integrazione API ufficiali dove disponibili (es. TED)
- [ ] Digest dei nuovi bandi sopra soglia
- [ ] Storico delle modifiche ai bandi

**Fase 3 — Condivisione e integrazioni**
- [ ] Report di un singolo bando su pagina protetta, con testo copiabile
- [ ] Microsoft To Do via Microsoft Graph (richiede registrazione su Azure)

**Fase 4 — Modulo "Prepara candidatura"**
- [ ] Elenco elaborati, indice, bozza
- [ ] Gruppo di lavoro, governance, stima ore uomo

---

## Identità visiva

Palette "contrasto fluo" e font Archivo (sostituto open source di Neue Haas Grotesk
Display Pro, da rimpiazzare col font licenziato in produzione). I riferimenti sono nel
prototipo già realizzato.

---

## Nota sulle fonti

L'ampliamento delle fonti richiede ricerca web attiva per verificare che ogni portale
esista e sia quello corretto. Conviene farlo dopo aver messo in funzione l'intervista,
così la ricerca è mirata sui temi che emergono davvero dai profili.
