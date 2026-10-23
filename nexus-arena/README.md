# NEXUS — Comando Orbitale

Gioco strategico browser con **Phaser 4.2.1**, asset originali **Kenney Space Shooter Redux** e comandante nemico **Jev / TypeSafe** oppure **Qwen / Hugging Face**, tramite API server. Nessun modello ML locale.

## Avvio e pagine

Richiede Node 22.12 o successivo:

```sh
npm install
npm run dev
```

- `http://127.0.0.1:5173/`: Comando Orbitale, la modalità principale.
- `/arcade.html`: lo shooter precedente, conservato con mira mouse e due joystick touch. [Istruzioni arcade](ARCADE.md).
- `/strategie.html`: anteprima delle atmosfere della modalità arcade.

Il server rilegge `.env` dopo il salvataggio. Le variabili esterne del processo hanno priorità; le modifiche al codice delle API richiedono il riavvio del server locale.

## Come giocare

Difendi il nucleo per **sei ondate**. Durante la preparazione il tempo della battaglia è fermo: seleziona una delle **16 postazioni**, costruisci, potenzia (livello 3 dopo Ingegneria avanzata), vendi (rimborso 65%) o ripara. Parti con **240 crediti**, **6 energia** e **300 integrità del nucleo**, **50 leghe** e **2 punti ricerca**. I crediti arrivano dagli abbattimenti e dal bonus di fine ondata.

| Struttura | Costo | Energia | Impiego |
|---|---:|---:|---|
| Laser | 70 | 2 | Rapido contro unità leggere; danno ridotto contro corazze |
| Missili | 100 | 3 | Proiettili guidati con danno elevato; cadenza lenta |
| Scudo | 85 | 3 | Protegge le strutture vicine e il nucleo se nel raggio |
| Reattore | 65 | +4 per livello | Alimenta la rete; vulnerabile alle incursioni |
| Estrattore | 75 | 2 | Richiede Industria: ogni 6 s +6 crediti e +3 leghe per livello; ogni 18 s +1 ricerca per livello |

I potenziamenti aumentano anche il consumo delle difese. Se la rete è satura, alcune strutture diventano offline: usa **Equilibrata / Armi / Scudi**, oppure disattiva singoli moduli. I reattori distrutti riducono subito la capacità della rete. Gli scudi assorbono danni e ricaricano dopo tre secondi senza colpi.

Quando premi **Avvia ondata**, il cantiere delle strutture fisse si chiude e viene inviata una fotografia dello schieramento. Dopo la decisione del comandante, un preavviso di quattro secondi precede l’attacco. Durante il combattimento puoi ridistribuire energia, cambiare priorità di tiro e toccare un nemico per concentrare le armi su di lui. **EMP** stordisce e danneggia i nemici vicini al nucleo, una volta per ondata. Le riparazioni e la vendita sono disponibili solo tra le ondate. Dopo 60 secondi, eventuali incursori ancora impegnati contro infrastrutture passano all’assalto del nucleo, evitando stalli infiniti contro gli scudi.

Su mobile la barra inferiore consente costruzione e avvio senza lasciare la mappa. Le 16 postazioni sono selezionabili anche dalla barra scorrevole; **Gestisci** apre i dettagli del modulo. La pausa manuale o automatica congela combattimento e preavviso. La preparazione non ha limite di tempo. **Barriere / ricerca** apre le nuove infrastrutture anche su mobile.

## Barriere, economia e ricerca

Le **leghe** arrivano dagli abbattimenti (pari al costo dell’unità), dagli estrattori alimentati e dal bonus di fine ondata (+20). La **ricerca** arriva a fine ondata (+2) e dagli estrattori. La produzione è attiva solo in combattimento: aspettare in preparazione non genera risorse.

Ogni settore può avere una **barriera**: costa 20 crediti +25 leghe e richiede 8 secondi. Puoi avviarla in preparazione oppure durante l’attacco. L’arco giallo mostra l’avanzamento; quello ciano indica la barriera operativa e la barra ne mostra l’integrità. Blocca le navi che entrano nel suo arco finché non viene distrutta. Gli ingressi non coperti restano aperti; i bombardieri infliggono danno doppio alle barriere. Le barriere non consumano energia. Vendita e riparazione non si applicano alle barriere: un potenziamento completato ne ripristina l’integrità; dopo la distruzione puoi ricostruirle.

| Tecnologia | Ricerca / leghe | Sblocco |
|---|---:|---|
| Industria orbitale | 2 / 10 | Estrattori |
| Fortificazioni | 3 / 20 | Barriere L2/L3: 300/420 integrità, 50/75 leghe +20 crediti, 10/12 secondi |
| Ingegneria avanzata | 5 / 30 | Strutture di livello 3 |

La barriera L1 ha 180 integrità. Durante un potenziamento conserva l’integrità esistente e può essere distrutta, perdendo il cantiere. Le tecnologie si sbloccano immediatamente pagando il costo e durano per la missione; una nuova partita riparte da zero. La pausa congela anche cantieri e produzione.

## Il comandante AI

Una richiesta iniziale e fino a **due rivalutazioni durante l’ondata**, a 12 e 30 secondi di simulazione (massimo 18 richieste per missione). Se l’ondata termina prima, la rivalutazione non avviene. Jev risponde a tre domande Choice: **settore d’ingresso**, **composizione** (mista, sciame, corazze, bombardieri, razziatori), **obiettivo** (nucleo, reattori, strutture raggruppate, estrattori, barriere). Qwen restituisce gli stessi tre campi in JSON. Sono accettate soltanto scelte implementate.

Il contesto include strutture, livelli, integrità, alimentazione, copertura stimata dei quattro settori, concentrazione delle strutture e piano/esito dell’ondata precedente, barriere attive/in costruzione, risorse e tecnologie. Durante la rivalutazione include anche tempo, abbattimenti, passaggi, danni, strutture perse, contatti attivi, piano corrente e budget delle riserve. I laser favoriscono contromosse corazzate, i missili possono essere saturati dagli sciami, i gruppi sono vulnerabili al bombardamento e i reattori ai razziatori. Le unità agiscono davvero su questi obiettivi e passano al nucleo quando non rimangono bersagli adatti.

Le rivalutazioni modificano l’obiettivo delle navi già attive e la composizione/ingresso dei soli rinforzi ancora da schierare. Le navi presenti mantengono posizione, tipo e salute. Il manifesto distribuisce gli arrivi su circa 26 secondi; nuovi ordini lasciano almeno 3 secondi prima del prossimo rinforzo. Se non restano riserve, la composizione e l’ingresso indicano gli ordini del comandante, ma non trasformano le navi esistenti. Il registro distingue **NUOVI ORDINI** da **PIANO CONFERMATO**: il modello può confermare un piano utile. Una risposta arrivata dopo fine ondata o riavvio viene ignorata.

Il modello **non decide risorse, statistiche o quantità arbitrarie**. Il budget è fissato dal gioco: 14, 21, 28, 35, 42, 49. Ogni flotta spende esattamente quel budget. Lo scenario usa il seed 716; riprovando con lo stesso piano si ottengono gli stessi ingressi e la stessa composizione del manifesto. La simulazione in tempo reale può avere piccole differenze legate al frame rate.

Il pannello Intelligence mostra risposta reale, latenza, confidenza Jev e piano applicato. Le osservazioni esplicative sono ricavate dallo schieramento: non vengono presentate come ragionamento interno del modello. Il rapporto di fine ondata mostra nemici abbattuti, passaggi, danni al nucleo e strutture distrutte.

**Senza AI** non effettua richieste: usa ingresso nord, flotta mista e obiettivo nucleo con lo stesso budget, senza rivalutazioni. Durante errori o chiavi mancanti si applica un piano a regole, dichiarato **REGOLE LOCALI · FALLBACK**. Non viene chiamato un altro provider a pagamento. Il limite server è di 18 richieste al minuto per indirizzo e istanza; non è un tetto di spesa globale. Il prototipo non include account o persistenza della partita.

## Chiavi e Vercel

Le chiavi esistenti continuano a funzionare. Nel file `.env`, escluso da Git:

```env
TYPESAFE_API_KEY=la_propria_chiave
TYPESAFE_MODEL=jev-1.14.0
HF_TOKEN=il_proprio_token
HF_MODEL=Qwen/Qwen3-8B
```

Non usare il prefisso `VITE_`. Le credenziali restano sul server. Il nuovo endpoint è `/api/commander`; quello arcade resta `/api/director`.

Per Vercel: **Root Directory `nexus-arena`**, framework Vite, build `npm run build`, output `dist`. Configura le variabili server e fai un redeploy. La build include pagina strategica, arcade e anteprima; entrambe le Function sono configurate in `vercel.json`.

## Verifica

```sh
npm test
npm run build
```

I test comprendono economia, rete energetica, contromosse, budget delle flotte, effetti del posizionamento, EMP, stalli, vittoria sulle sei ondate, sconfitta, validazione delle API e credenziali solo server. Restano inclusi i test della modalità arcade. Le prove con risposte simulate non certificano la qualità strategica dei modelli. Dettagli e prove browser in [VERIFICA.md](VERIFICA.md).

## Asset e licenze

Sprite e suoni originali **Kenney Vleugels, Space Shooter Redux**, CC0. Fonte: https://opengameart.org/content/space-shooter-redux. Licenza: `public/assets/LICENSE-KENNEY.txt`. Sfondo Orione: NASA, ESA, Hubble Space Telescope Orion Treasury Project Team, Massimo Robberto (STScI, ESA); fonte https://science.nasa.gov/asset/hubble/orion-nebula-3/. Crediti in `public/assets/CREDITS.txt`. Phaser: MIT.
