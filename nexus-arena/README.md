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

Difendi il nucleo per **sei ondate**. Durante la preparazione il tempo della battaglia è fermo: seleziona una delle **16 postazioni**, costruisci, potenzia (fino al livello 3), vendi (rimborso 65%) o ripara. Parti con **240 crediti**, **6 energia** e **300 integrità del nucleo**. I crediti arrivano dagli abbattimenti e dal bonus di fine ondata.

| Struttura | Costo | Energia | Impiego |
|---|---:|---:|---|
| Laser | 70 | 2 | Rapido contro unità leggere; danno ridotto contro corazze |
| Missili | 100 | 3 | Proiettili guidati con danno elevato; cadenza lenta |
| Scudo | 85 | 3 | Protegge le strutture vicine e il nucleo se nel raggio |
| Reattore | 65 | +4 per livello | Alimenta la rete; vulnerabile alle incursioni |

I potenziamenti aumentano anche il consumo delle difese. Se la rete è satura, alcune strutture diventano offline: usa **Equilibrata / Armi / Scudi**, oppure disattiva singoli moduli. I reattori distrutti riducono subito la capacità della rete. Gli scudi assorbono danni e ricaricano dopo tre secondi senza colpi.

Quando premi **Avvia ondata**, il cantiere si chiude e viene inviata una fotografia dello schieramento. Dopo la decisione del comandante, un preavviso di quattro secondi precede l’attacco. Durante il combattimento puoi ridistribuire energia, cambiare priorità di tiro e toccare un nemico per concentrare le armi su di lui. **EMP** stordisce e danneggia i nemici vicini al nucleo, una volta per ondata. Le riparazioni e la vendita sono disponibili solo tra le ondate. Dopo 60 secondi, eventuali incursori ancora impegnati contro infrastrutture passano all’assalto del nucleo, evitando stalli infiniti contro gli scudi.

Su mobile la barra inferiore consente costruzione e avvio senza lasciare la mappa. Le 16 postazioni sono selezionabili anche dalla barra scorrevole; **Gestisci** apre i dettagli del modulo. La pausa manuale o automatica congela combattimento e preavviso. La preparazione non ha limite di tempo.

## Il comandante AI

Una richiesta per ondata, dopo la conferma delle difese. Jev risponde a tre domande Choice: **settore d’ingresso**, **composizione** (mista, sciame, corazze, bombardieri, razziatori), **obiettivo** (nucleo, reattori, strutture raggruppate). Qwen restituisce gli stessi tre campi in JSON. Sono accettate soltanto scelte implementate.

Il contesto include strutture, livelli, integrità, alimentazione, copertura stimata dei quattro settori, concentrazione delle strutture e piano/esito dell’ondata precedente. I laser favoriscono contromosse corazzate, i missili possono essere saturati dagli sciami, i gruppi sono vulnerabili al bombardamento e i reattori ai razziatori. Le unità agiscono davvero su questi obiettivi e passano al nucleo quando non rimangono bersagli adatti.

Il modello **non decide risorse, statistiche o quantità arbitrarie**. Il budget è fissato dal gioco: 14, 21, 28, 35, 42, 49. Ogni flotta spende esattamente quel budget. Lo scenario usa il seed 716; riprovando con lo stesso piano si ottengono gli stessi ingressi e la stessa composizione del manifesto. La simulazione in tempo reale può avere piccole differenze legate al frame rate.

Il pannello Intelligence mostra risposta reale, latenza, confidenza Jev e piano applicato. Le osservazioni esplicative sono ricavate dallo schieramento: non vengono presentate come ragionamento interno del modello. Il rapporto di fine ondata mostra nemici abbattuti, passaggi, danni al nucleo e strutture distrutte.

**Senza AI** non effettua richieste: usa ingresso nord, flotta mista e obiettivo nucleo con lo stesso budget. Durante errori o chiavi mancanti si applica un piano a regole, dichiarato **REGOLE LOCALI · FALLBACK**. Non viene chiamato un altro provider a pagamento. Il limite server è di 6 richieste al minuto per indirizzo e istanza; non è un tetto di spesa globale. Il prototipo non include account o persistenza della partita.

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
