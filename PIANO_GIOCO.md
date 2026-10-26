# NEXUS: Protocollo Fuga — piano di sviluppo

Proposta del 23 ottobre 2026. Documento di progetto: nessun gioco è stato ancora implementato e nessuna chiamata AI a pagamento è stata eseguita.

## Obiettivo e ipotesi

Creare un gioco browser single player, in italiano, con grafica 3D stilizzata e visuale isometrica. Una partita dura 10–15 minuti. Il giocatore deve percepire un avversario che reagisce alle sue scelte attraverso comportamenti osservabili.

Prima versione per desktop con tastiera e mouse, senza account. Mobile, multiplayer e campagna estesa sono sviluppi successivi. La cartella iniziale è vuota: lo stack e il concept seguenti sono proposte modificabili.

## Concept e ciclo di gioco

Sei un tecnico intrappolato in una stazione orbitale controllata da NEXUS, un'intelligenza artificiale ostile. Devi recuperare tre chiavi di accesso, ripristinare una navetta e raggiungere l'hangar.

Ogni settore offre un percorso breve sorvegliato e un'alternativa più lenta. Il giocatore osserva le pattuglie, si muove tra coperture, distrae i droni, interagisce con terminali e decide quando rischiare. Correre produce rumore; un impulso EMP disabilita temporaneamente un drone ma consuma una risorsa limitata.

Il ciclo è: osservare → scegliere un percorso → eludere o distrarre → recuperare una risorsa → affrontare la risposta della stazione → raggiungere il settore successivo.

Esempio: il giocatore disattiva due telecamere nella stessa zona. NEXUS riceve questi eventi e può inviare una pattuglia a investigare; una luce ambra e un annuncio anticipano l'arrivo. Il sistema conserva sempre una via praticabile. Se il giocatore passa inosservato, NEXUS non conosce magicamente la sua posizione.

Vittoria: raggiungere la navetta con le chiavi. Sconfitta: esaurire la salute dopo essere stati intercettati. Un checkpoint per settore limita la ripetizione; il punteggio finale premia discrezione, tempo e risorse conservate.

## Direzione grafica

L'obiettivo è una piccola scena curata, simile a un diorama di fantascienza industriale.

- Camera ortografica inclinata, movimento morbido e pareti che si abbassano quando nascondono il personaggio.
- Materiali opachi, pavimenti chiari consumati, strutture in grafite; ambra per allarme e pericoli, verde acqua per terminali e percorsi sicuri.
- Forme e animazioni distinguibili: droni circolari, guardiani pesanti, personaggio con zaino luminoso.
- Illuminazione precalcolata dove possibile, poche luci dinamiche, ombre selettive, bagliore contenuto e particelle localizzate.
- Coni visivi leggibili, anticipazione prima degli attacchi, indicatori che combinano colore e forma.
- HUD essenziale: salute, batteria EMP, obiettivo e livello di allarme. Testo italiano breve e leggibile.
- Audio ambientale, passi, segnali dei droni e musica che cresce con l'allarme. Controlli separati del volume e movimento della camera riducibile.

Pipeline: realizzare una stanza campione con personaggio e drone; verificare leggibilità e prestazioni; usare quella scena come riferimento per tutta la famiglia di asset. Modelli modulari GLB, texture compresse e provenienza/licenze registrate. L'eventuale generazione di immagini serve per concept e texture preparate durante lo sviluppo; la coerenza finale va verificata nella scena.

## Motore AI: due livelli complementari

### 1. AI immediata dei nemici

Implementata in TypeScript, eseguita localmente e indipendente dalla rete:

- Stati: pattuglia, indagine, inseguimento, ricerca e ritorno.
- Percezione tramite cono visivo, occlusione delle pareti e raggio dei rumori.
- Memoria dell'ultima posizione osservata e degli ultimi suoni.
- A* su griglia di navigazione 2D coerente con la geometria 3D; porte e ostacoli aggiornano la percorribilità.
- Percorsi ricalcolati su evento o intervallo, con recupero in caso di blocco.

La simulazione usa un passo fisso; percezione e navigazione vengono distribuite tra aggiornamenti per contenere il costo CPU.

### 2. NEXUS, direttore strategico con Jev

Modello: **Jev di TypeSafe**, tramite API server con scelte strutturate e validate dal gioco.

Il modello riceve un riepilogo compatto: fase della missione, allarme, eventi percepiti dalla stazione, risorse note, azioni consentite e memoria breve. Sceglie tra interventi già implementati:

- mantenere la situazione attuale;
- spostare una pattuglia verso un settore noto;
- intensificare temporaneamente una scansione;
- oscurare una zona per un intervallo limitato;
- selezionare una comunicazione preparata dal gioco e coerente con gli eventi.

L'adattamento deriva dal contesto della partita; non richiede addestrare o modificare il modello durante il gioco.

Le richieste partono su eventi rilevanti e al cambio di settore, con almeno 30 secondi tra richieste e massimo 20 chiamate per partita. Durante l'attesa continua a funzionare un direttore locale basato su regole. Il modello non gestisce movimento, collisioni o danni.

Contratto esemplificativo, da formalizzare con JSON Schema:

```json
{
  "action": "investigate_sector",
  "sectorId": "reactor",
  "durationSeconds": 20,
  "message": "Anomalia rilevata nel settore reattore."
}
```

Il backend verifica schema, identificatori, durata, cooldown e disponibilità dell'azione. Il motore ricontrolla le condizioni prima di applicarla: nessun intervento può bloccare l'unica uscita, creare nemici accanto al giocatore o usare informazioni non percepite. Richieste associate a un identificatore e una revisione dello stato impediscono di applicare due volte una decisione o applicarla al settore sbagliato.

Usare output strutturati quando supportati dalla combinazione modello/provider; verificarlo con chiamate reali. In assenza di supporto, JSON richiesto nel prompt e validazione obbligatoria, con scarto delle risposte non valide. Timeout iniziale di 4 secondi, da misurare: se scade o il servizio fallisce, si usa la politica locale e si ignora la risposta tardiva.

## Architettura proposta

| Componente | Scelta | Scopo |
|---|---|---|
| Client | TypeScript + Vite | Build e organizzazione del codice |
| Grafica | Three.js con renderer WebGL | Scene 3D e camera isometrica |
| Gameplay | Sistemi TypeScript separati | Input, collisioni semplici, missioni e combattimento |
| AI locale | FSM + A* | Percezione, decisioni e navigazione dei nemici |
| Backend | Node.js + API HTTP | Proxy AI, validazione e limiti di consumo |
| Integrazione modello | API TypeSafe | Accesso a Jev dal backend |
| Salvataggio | IndexedDB | Impostazioni, checkpoint e record locali |
| Asset | GLB e texture ottimizzate | Ambiente modulare e animazioni |
| Distribuzione | Hosting statico HTTPS + backend | Link pubblico giocabile |

Three.js copre il rendering: collisioni, navigazione e regole di gioco sono componenti da sviluppare. Per questo MVP, il mondo resta su un piano con ostacoli semplici; un motore di fisica completo non è necessario.

Flusso: gioco → riepilogo degli eventi → backend → Jev → validazione della proposta → verifica nello stato corrente → evento nel gioco.

La chiave TYPESAFE_API_KEY resta esclusivamente nel backend. Limiti per sessione, controllo globale del consumo e protezione dalle richieste ripetute servono anche se un client viene modificato. Il limite per partita nel browser da solo non protegge la spesa. Al superamento del budget globale, il backend sospende le chiamate e il gioco usa il direttore locale.

L'inferenza completamente nel browser è un'opzione futura. Transformers.js supporta WASM e WebGPU con modelli compatibili; non è sufficiente scegliere un qualsiasi modello del catalogo. Download, RAM e competizione con la GPU del gioco vanno misurati prima di adottarla.

## Confini della prima versione

Inclusi: una stazione con tre settori e hangar, una partita completa di 10–15 minuti, un personaggio, due tipi di nemico, telecamere, EMP e distrazione, tre obiettivi, direttore AI, tutorial integrato, checkpoint, menu audio/grafica e riepilogo finale.

Rimandati: multiplayer, mondo aperto, generazione libera di mappe, conversazioni illimitate, voce generata, crafting e account. La prima mappa è progettata manualmente; pattuglie, risorse ed eventi possono variare entro vincoli verificati.

## Roadmap e risultati verificabili

Stima preliminare: **19–25 giornate di lavoro**, circa 4–6 settimane per uno sviluppatore esperto con asset modulari disponibili. Asset originali complessi, problemi del provider e ampliamenti dello scope possono aumentarla. È una stima di pianificazione, non una scadenza garantita.

| Fase | Durata | Risultato e criterio di uscita |
|---|---|---|
| 1. Prova del modello | 1–2 giorni | Chiamate reali con scenari italiani; verificare provider, JSON, latenza, costi e coerenza; fissare configurazione e modello prima dell'integrazione |
| 2. Prototipo giocabile | 3 giorni | Una stanza, movimento, collisioni, drone, terminale e uscita; ciclo completo divertente anche con direttore locale |
| 3. Campione grafico | 4–5 giorni | Una stanza con qualità visiva finale, personaggio animato, effetti e HUD; verifica in browser su hardware di riferimento |
| 4. Motore AI e integrazione | 4–5 giorni | Percezione, memoria, navigazione, direttore remoto, vincoli e fallback; differenze visibili tra strategie del giocatore |
| 5. Partita completa | 4–6 giorni | Tre settori, obiettivi, risorse, audio, tutorial, checkpoint, vittoria e sconfitta |
| 6. Verifica e pubblicazione | 3–4 giorni | Prestazioni, browser, bilanciamento, gestione errori e build pubblicabile con configurazione del backend documentata |

La prima milestone di gioco è una stanza ben leggibile con una missione di 3 minuti: il drone sente una distrazione, indaga, perde il giocatore dietro un ostacolo e torna in pattuglia; NEXUS può attivare un intervento verificabile senza interrompere il movimento.

## Verifica della qualità

Obiettivi da misurare sul portatile desktop di riferimento, identificato nella fase 1; non sono risultati già ottenuti:

- 60 FPS a 1080p con qualità media; impostazione ridotta per dispositivi meno potenti.
- Download iniziale compresso entro 25 MB, contenuti successivi caricati per settore; prima interazione entro 8 secondi su connessione di test da 30 Mbps con cache vuota.
- Almeno 100 scenari AI preparati: obiettivo di almeno il 95% di proposte utilizzabili prima del fallback e nessuna azione illegale applicata nei casi di test.
- Misurare latenza mediana e p95, tasso di fallback e consumo per partita; l'inferenza non deve fermare simulazione o rendering.
- Test di timeout, rate limit, provider indisponibile, JSON invalido, risposta duplicata e risposta tardiva.
- Scenari di navigazione con porte chiuse, ostacoli, perdita del contatto e obiettivo irraggiungibile.
- Verifica di checkpoint, completamento della missione e impossibilità per il direttore di chiudere l'unico percorso verso l'uscita.
- Prove su Chrome, Edge e Firefox; verifica dedicata su Safari prima di dichiararne il supporto.
- Cinque playtest con persone esterne: comprensione dell'obiettivo, lettura dei pericoli, percezione di equità e interesse a rigiocare.

Se il direttore generativo non migliora i playtest, ridurne il ruolo a comunicazioni ed eventi di settore e lasciare la strategia al sistema locale. Il valore dell'integrazione va dimostrato nel comportamento percepito.

## Consumo e dipendenze

Prima dello sviluppo completo servono un account TypeSafe e una chiave backend abilitata a Jev.

Per il prototipo: limite indicativo di 1.500 token di input e 150 di output per chiamata, massimo 20 chiamate per partita. Il caso massimo corrisponde quindi a circa 30.000 token di input e 3.000 di output, esclusi eventuali token di ragionamento o costi accessori del provider. Preferire modalità senza ragionamento esteso se esposta e verificata dal provider.

Misurare il consumo effettivo nella fase 1. Calcolare il costo per 100 partite dalle tariffe correnti del provider, più hosting; fissare poi un tetto di spesa e di concorrenza. Non assumere che crediti gratuiti o disponibilità del servizio restino invariati.

## Riferimenti

- [API TypeSafe](https://docs.typesafe.ai/api/system-one)
- [Documentazione Three.js](https://threejs.org/docs/)
