# Censimento delle fonti — come rilevare i bandi nuovi

Verifica eseguita il **28 settembre 2026** con richieste dirette ai siti (sola lettura, senza login).
Indirizzi e servizi possono cambiare: prima di costruire ogni lettore va ricontrollato l'endpoint.

**Legenda del metodo**
- **API**: servizio pensato per essere interrogato da un programma, con dati strutturati.
- **RSS**: feed di aggiornamenti pubblicato dal sito.
- **Open data**: file scaricabili (CSV/JSON), da confrontare con la copia precedente.
- **HTML**: lettura della pagina, confrontata con la volta prima; fragile quando il sito cambia grafica.
- **Manuale**: accesso automatico vietato o bloccato; si fa un controllo periodico a mano.

## Fonti attuali

| Fonte | Metodo | Chiave | Fattibilità | Note decisive |
|---|---|---|---|---|
| **TED** (appalti UE) | API v3 `api.ted.europa.eu/v3/notices/search` | No | **Alta** | Documentata; riuso libero anche commerciale (Dec. 2011/833/UE); limiti 700 richieste/min |
| **Funding & Tenders** (UE) | API SEDIA `api.tech.ec.europa.eu/search-api` | No (chiave pubblica fissa) | **Alta** | Copre anche Horizon Europe e Digital Europe (filtro per programma) |
| Horizon Europe, Digital Europe | Via API SEDIA | No | Alta | Nessun lettore separato |
| **ANAC · Pubblicità legale** | API JSON `pubblicitalegale.anticorruzione.it/api/v0/…` | No | **Alta** (tecnica), media (stabilità) | Dal 2024 raccoglie gli avvisi di **tutte** le stazioni appaltanti italiane, MIT e Province incluse. API "v0" non documentata: ANAC può cambiarla. Riserva: open data OCDS ufficiali |
| Gazzetta Ufficiale (5ª serie) | RSS `gazzettaufficiale.it/rss/S5` | No | Alta (segnali) | In gran parte sovrapposta ad ANAC; scadenza e importo solo nella pagina |
| Incentivi.gov.it | Open data JSON/CSV (licenza IODL 2.0) | No | Media | Nessuna API né RSS; l'indirizzo del file cambia con la data |
| Portale Appalti MIT | HTML | No | Media (tecnica) | **robots.txt vieta la lettura automatica**: si coprono tramite ANAC |
| Acquisti in Rete PA (Consip) | Open data CKAN, CC-BY 4.0 | No | Media | Aggiornamento mensile, in ritardo di mesi: solo contesto, non allerta |
| **Regione Piemonte · Bandi** | RSS `bandi.regione.piemonte.it/tutti/rss.xml` | No | **Alta** | Solo 10 elementi per feed: va letto ogni giorno; scadenza nella pagina di dettaglio |
| Province BI · VC · NO | HTML (Maggioli, Sintel) | No | Bassa | **robots.txt vieta** (Vercelli, Novara); Biella su piattaforme sparse. Si coprono tramite ANAC |
| MiC · PNRR Cultura | RSS di categoria e API WordPress | No | **Alta** | La categoria contiene anche notizie: serve un filtro |
| CSR Puglia 2023–2027 | HTML | No | Media | Nessun RSS; elenco con codice intervento e stato |
| Regione Puglia · Turismo e Cultura | RSS di tutti i bandi regionali | No | Media | **Termini del feed: solo uso personale e non commerciale.** Serve un'autorizzazione o una verifica legale |
| SABAP Brindisi, Lecce e Taranto | API WordPress (data di modifica della pagina) | No | Alta, ma rende poco | Procedura permanente: nessun bando con scadenza |
| RUNTS | Elenco Excel giornaliero | No | Media | Serve per verificare l'iscrizione degli enti, non per trovare bandi |
| News Commissione europea | RSS | No | Alta (lettura), bassa (utilità) | Notizie generiche: solo segnale secondario |
| Pagina UE "funding per ONG" | HTML statico | No | Bassa | Pagina di orientamento, senza bandi |
| Agenzia Entrate · 5 per mille | RSS generale + calendario fisso | No | Media | robots risponde 403. Meglio un promemoria annuale |
| ACRI · mappa Fondazioni | HTML (elenco di 86 fondazioni) | No | Alta (rimando) | Nessun bando: serve a trovare altre fondazioni |
| **Fondazione Cariplo** | API WordPress `/wp-json/wp/v2/bando` e RSS | No | Alta | Risponde 403 ai programmi che non si presentano come browser. Va usato un identificativo onesto e, se resta bloccato, va chiesto il permesso. `Crawl-delay: 10` |
| **Compagnia di San Paolo** | RSS `/it/contributi/feed/` | No | **Alta** | Scadenza nella pagina di dettaglio |
| **Fondazione CRT** | API WordPress `/wp-json/wp/v2/bandi-progetti` | No | **Alta** | Mescola bandi e progetti: serve un filtro |
| **Fondazione Con il Sud** | API WordPress `/wp-json/wp/v2/bando` e RSS | No | **Alta** | Tassonomie per tema e regione |
| Fondazione TIM | HTML | No | Media | Pochi bandi all'anno; oggi tutti chiusi |

## Fonti nuove proposte (sanità, turismo, energia)

| Fonte | Ambito | Metodo | Fattibilità | Note |
|---|---|---|---|---|
| **GSE** | Energia | RSS notizie + pagine misure PNRR (CER, Transizione 5.0…) | **Alta** | Alcune pagine bloccano i client automatici |
| MASE · Bandi e avvisi | Energia, ambiente | HTML con filtri per stato | Media | Mescola contributi e gare; robots risponde 403 |
| Invitalia | Turismo, imprese | HTML | Media | Gestisce misure del Ministero del Turismo (es. IFIT) |
| Ministero del Turismo · Avvisi | Turismo | Manuale | Bassa | Protetto da sistema anti-bot |
| Ministero della Salute · Bandi | Sanità | Manuale | Bassa | Protetto da sistema anti-bot |
| **Regione Piemonte · Contributi** | Tutti | RSS `/contributi-finanziamenti/rss.xml` | **Alta** | Circa 2.300 schede; filtri per tema e destinatari |
| **Regione Puglia · Bandi e avvisi** | Tutti | RSS | Alta (tecnica) | Stessi termini restrittivi del feed pugliese |
| ~~Agenas, ENEA~~ | — | — | — | Scartate: solo gare interne od offerte di lavoro |

## Regole che valgono per tutti i lettori

- **Non si aggirano i blocchi.** Se un sito vieta la lettura automatica (robots.txt, sistemi anti-bot, termini d'uso), quella fonte resta a controllo manuale finché l'ente non lo autorizza. Il programma si presenta sempre con un nome riconoscibile.
- **Ritmo lento**: al massimo 1 richiesta al secondo, o quanto indicato dal sito (es. Cariplo 10 secondi).
- **Nei feed la scadenza non compare quasi mai**: il lettore apre la pagina del singolo bando solo se il titolo è pertinente.
- **Mostrare sempre il link alla pagina ufficiale**, non ripubblicarne i contenuti.
