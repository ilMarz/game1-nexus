# Terre di Confine — RTS medievale

## Effetti sonori

Il gioco medievale include 13 effetti originali sintetizzati localmente con Web Audio. La nuova palette usa risonanze metalliche per le lame, corda e fruscio per le frecce, colpi profondi di legno per gli arieti, detriti per i crolli e corni armonici per avvio, conquista, allarme ed esiti. Conferme brevi e campane distinguono ordini e completamenti. I colpi hanno varianti di timbro e intonazione. Il primo clic/tasto sblocca l’audio secondo le regole del browser.

I controlli **Audio ON/OFF** e **Volume** sono nell’intestazione; le preferenze restano salvate localmente quando lo storage è disponibile. Pausa e scheda nascosta fermano le voci; gli eventi in silenzio non si accumulano per essere riprodotti alla ripresa. Il riavvio interrompe i suoni della partita precedente. Massimo 10 voci (8 per il combattimento), precedenza ai segnali importanti, leggera variazione di intonazione e varianti dei colpi, posizione stereo sulla mappa, volume comune con compressore. Phaser non inizializza un secondo motore audio.

Gli eventi provengono dalla simulazione: i colpi suonano quando vengono sferrati, i crolli solo alla distruzione, le conferme solo al completamento di addestramento/costruzione. `rts-audio.js` contiene sintesi e mixer; un’anteprima WAV di 13,9 secondi è in `artifacts/anteprima-effetti-sonori.wav`, rigenerabile con `node artifacts/preview-battle-audio.mjs`. Ordine: lame, freccia, ariete, crollo, caduta, pronto, cantiere, conquista, allarme, ordine, avvio, vittoria, sconfitta.

## Vercel Web Analytics

Le quattro pagine (`index.html`, `orbitale.html`, `strategie.html`, `arcade.html`) caricano il modulo condiviso `analytics.js`, che usa `inject` da `@vercel/analytics`. Il caricamento è separato dai moduli di gioco. Vite seleziona esplicitamente la modalità sviluppo o produzione; le visite locali durante `npm run dev` non vengono registrate.

Per raccogliere visite e visualizzazioni, abilita Web Analytics nel progetto Vercel e pubblica una nuova build. I dati saranno visibili nel pannello Analytics dopo le visite al deployment. Non servono chiavi client o modifiche al backend del gioco. Integrazione: [documentazione ufficiale Vercel](https://vercel.com/docs/analytics/quickstart).

## Avversario attivo e produzione simmetrica

La logistica nemica continua anche fra le risposte di Jev: ogni 2–4 secondi valuta una spesa possibile, mantenendo al massimo due reclutamenti in coda. Un ordine di sviluppo fresco ha priorità per una singola azione; attese, fondi insufficienti e strutture già presenti non bloccano le successive valutazioni. L’IA sviluppa l’economia, ricostruisce la caserma, amplia gli alloggi, prepara arieti e recluta contromisure rispetto all’esercito del giocatore.

`rts-enemy.js` misura forza e salute dell’esercito blu, crescita economica, passaggi conquistati e vantaggio nelle perdite. Questi segnali regolano il ritmo logistico, la forza desiderata e la pressione offensiva durante la partita; costi, reddito, salute e danni restano quelli normali. Jev riceve la stessa valutazione nel prompt. Se una risposta tarda, la simulazione esce dalla difesa dopo l’emergenza, rivaluta raccolte ferme e passa a nuovi obiettivi dopo le conquiste. Gli arieti già presenti fanno scegliere ai piani locali un ponte largo.

Il Jev nemico gestisce esercito e sviluppo insieme: sceglie reclutamenti, caserme, alloggi, segherie e torri usando le stesse funzioni e gli stessi costi del giocatore. Parte con 320 oro e 220 legno; ha una propria coda, tempi di addestramento/costruzione, entrate da segherie e passaggi, capienza e premi per le eliminazioni. Le vecchie ondate gratuite sono state eliminate. Distruggere la sua economia riduce le entrate; distruggere la caserma sospende il reclutamento fino alla ricostruzione.

Le rivalutazioni rimangono ogni 5 secondi, ma non azzerano i percorsi per un cambio di composizione o di sviluppo. Una rotta/obiettivo resta impegnata per 30 secondi e un gruppo lanciato può avanzare per almeno 25 secondi prima di un normale cambio di piano. Le emergenze interrompono l’impegno. Questa stabilità vale anche per il Consigliere alleato in autonomia; le priorità esplicite del giocatore prevalgono subito.

Senza minacce reali il nemico mantiene un presidio e prepara attacchi. Una forza insufficiente per fortezza/torri passa a un’incursione su segheria/caserma o a un passaggio; non attende indefinitamente l’assalto perfetto. La guarnigione iniziale conserva tipi di unità diversi, lasciando anche fanteria nel gruppo offensivo.

## Indicazioni al Consigliere

**Delega difensiva d’emergenza:** anche fuori da Sviluppa, il Consigliere alleato attivo può spendere quando nemici minacciano gli edifici e la forza dei difensori vicini è insufficiente. La valutazione considera posizione, salute e tipo delle unità; tiene conto anche dei soldati manuali presenti, senza modificarne gli ordini. La delega consente fanteria, cavalieri, arcieri, torri, ricostruzione della caserma e alloggi necessari; esclude arieti e segherie. Un primo rinforzo difensivo può essere avviato dalle regole immediate del campo, prima della prossima rivalutazione Jev; il modello riceve poi la stessa autorizzazione temporanea e opzioni limitate alla difesa. Le nuove operazioni d’emergenza sono distanziate di almeno 5 secondi e rispettano risorse, capienza, code e tempi normali. La delega termina appena attacco o insufficienza della difesa vengono meno; code e cantieri già pagati proseguono. La priorità scelta dal giocatore resta memorizzata. Disattivando il Consigliere si sospende anche questa delega.

A destra puoi cambiare la priorità con **Difendi**, **Sviluppa il regno**, **Attacca**, **Aspetta** oppure tornare all’autonomia equilibrata. La priorità persiste fino al prossimo comando ed entra nella fotografia inviata a Jev. Le reazioni sulle unità automatiche sono immediate; il nuovo piano viene richiesto rispettando il limite minimo di 5 secondi. Le risposte pendenti della vecchia priorità vengono scartate.

- **Difendi:** richiama e protegge gli edifici di casa. Nessuna nuova spesa automatica.
- **Attacca:** dottrina offensiva, squadra d’assalto con presidio residuo, raccolta e controlli di sicurezza normali. I soldati manuali restano esclusi.
- **Aspetta:** mantiene ferme le unità automatiche, che si difendono entro la propria gittata; niente nuovi reclutamenti o cantieri automatici.
- **Sviluppa il regno:** autorizza Jev a scegliere una singola azione di sviluppo per ogni piano accettato: spadaccino, cavaliere, arciere, ariete, caserma, alloggi, segheria, torre oppure attesa. I costi vengono pagati tramite le stesse funzioni usate dal giocatore. Addestramento, costruzione, capienza, coda, spazio libero e ostacoli restano vincolanti. Nessun nuovo ordine se ci sono già due reclutamenti in coda; i cantieri dello stesso tipo non si duplicano. Limiti automatici: una caserma, tre alloggi, tre segherie, quattro torri.

Per impostazione iniziale, costruzioni e reclutamenti restano manuali. Uscire da Sviluppa revoca subito nuove spese automatiche; le code e i cantieri già pagati continuano. Il diario distingue le tue indicazioni, le risposte del Consigliere e l’esito reale delle operazioni. Nella modalità locale, le esigenze sono valutate con regole dichiarate: infrastruttura mancante, capienza, arieti in arrivo, difese, produzione e carenze dell’esercito.

## Descrizioni e diario del Consigliere

Le sezioni **Recluta e schiera** e **Rinforza il regno** mostrano una descrizione visibile per ogni unità, edificio e riparazione, oltre ai costi. A destra compare soltanto il tuo Consigliere: il pannello nemico è stato rimosso, ma il comandante avversario resta attivo nella simulazione.

Il diario funziona come una chat di report: aggiunge messaggi con orario, conserva gli ultimi 120 e distingue gli ordini validati di Jev dalle notizie osservate sul campo. Include reclutamenti richiesti dal giocatore, rinforzi pronti, perdite, cambi di controllo manuale, conquiste, edifici, incursioni, ritirate, pause e fine partita. Non aggiunge richieste al modello e non produce ragionamenti privati. Scorre verso i nuovi messaggi soltanto se stai già leggendo il fondo; il riavvio azzera lo storico. I dettagli di strategia e controllo sono espandibili sopra il diario.

## I Consiglieri Strateghi

Su desktop l’interfaccia è divisa in tre colonne: **schieramento a sinistra**, **mappa al centro**, **Consiglieri con resoconti a destra**. Reclutamento, edifici, riparazione e avvio sono riuniti nel pannello sinistro; i due pannelli laterali scorrono indipendentemente. Sugli schermi piccoli le sezioni si impilano per mantenere leggibili i comandi.

Nel gioco Jev prende il ruolo di **Consigliere Stratega**, sia alleato sia nemico. I due personaggi hanno ritratti originali distinti, con mantello blu per l’alleato e rosso per il rivale, nel pannello dei Consiglieri. Le immagini sono state create con image_gen integrato e salvate in `public/assets/advisors/`; il README di quella cartella conserva i prompt completi e la provenienza.

Ogni Consigliere descrive in prima persona gli ordini applicati: passaggio, manovra, bersaglio reale, presidi, raccolta, recupero e prossimi rinforzi. I testi cambiano anche quando intervieni manualmente, sospendi la guida, metti in pausa o rimani senza unità disponibili. I resoconti sono una traduzione in italiano delle decisioni strutturate e dello stato effettivo del campo; non aggiungono chiamate al modello né attribuiscono ragionamenti privati. Il registro conserva anche il resoconto associato a ogni decisione.

La pagina principale è uno strategico medievale **Jev alleato contro Jev nemico**. Tu scegli e recluti i soldati; il tuo Jev guida automaticamente quelli che gli affidi, mentre puoi intervenire manualmente in qualsiasi momento. Avvia con `npm install` e `npm run dev`, poi apri `http://127.0.0.1:5173/`. Per entrambi i Jev configura `TYPESAFE_API_KEY` in `.env`, senza prefisso `VITE_`. Le chiavi esistenti restano valide e vengono usate solo dal server.

## Tu recluti, Jev comanda, tu puoi intervenire

La modalità predefinita avvia **due richieste indipendenti** a TypeSafe: il tuo Jev blu e quello nemico rosso. Entrambi vedono eserciti, terreno, edifici, perdite, piani precedenti e ordini manuali. Ognuno decide per il proprio schieramento. L’analisi iniziale ferma il tempo finché entrambe le risposte sono pronte; successivamente le analisi non interrompono la battaglia.

- **Produzione tua:** scegli spadaccini, cavalieri, arcieri o arieti durante lo scontro, pagando i costi normali. Il Jev alleato non può spendere risorse, reclutare o inventare unità.
- **Disponibilità:** “Nuove truppe al Consigliere” assegna i futuri reclutamenti al comandante. Se disattivato, ogni unità messa in coda resta una riserva manuale: cambiare la casella in seguito non altera gli elementi già in coda.
- **Intervento manuale:** movimento, attacco a un bersaglio, presidio, ritirata e “Solo io” tolgono le unità selezionate al Jev alleato. Il controllo resta tuo anche dopo la conclusione dell’ordine, finché non scegli “Affida allo Stratega”. Una risposta AI arrivata in ritardo non può annullare il tuo comando.
- **Delega:** “Affida allo Stratega” rende le unità selezionate nuovamente disponibili e applica la strategia corrente. Le nuove unità automatiche ricevono gli ordini appena completano l’addestramento. Gli altri soldati manuali restano indipendenti.
- **Sospensione:** disattivando “Consigliere alleato attivo”, i suoi soldati presidiano la posizione; i tuoi ordini manuali proseguono. Puoi riattivarlo in seguito. Il Jev nemico continua ad agire.
- **Adattamento:** ciascun comandante rivaluta normalmente ogni 5 secondi. Reclutamenti, ordini manuali, perdite, edifici e cambi di controllo dei passaggi anticipano la rivalutazione, mantenendo almeno 5 secondi fra le richieste dello stesso comandante. Gli ordini già in corso rimangono attivi durante l’analisi.
- **Trasparenza:** due pannelli e due riepiloghi mostrano i rispettivi piani, fonti, latenze e registri. Il numero di unità manuali e disponibili è sempre visibile. Le rotte alleate sono azzurre, quelle nemiche color rame; i soldati blu hanno un indicatore azzurro se affidati a Jev, oro se manuali.

Il Jev alleato sceglie **passaggio, obiettivo, manovra e dottrina** sulle truppe fornite dal giocatore. Il Jev nemico sceglie anche la composizione dei propri rinforzi, con quantità fissata dal gioco. Il server limita separatamente ciascun comandante a 16 richieste/minuto per IP e istanza; nessuna chiave viene inviata al browser. La modalità locale evita entrambe le chiamate ed è etichettata esplicitamente. Pausa, fine partita, sospensione e riavvio invalidano o rinviano le risposte pendenti secondo il loro stato.

## Equilibrio fra difesa e attacco

Entrambi i Jev scelgono anche una **dottrina**: equilibrata conserva circa il 34% dei soldati sani alla base, offensiva il 20%, prudente il 60%, arrotondando per eccesso e mantenendo almeno una guardia. Gli incursori aumentano la guarnigione; una minaccia immediata alla fortezza richiama tutte le truppe automatiche, con almeno 6 secondi di stabilità prima di ripartire. Gli ordini manuali restano sempre esclusi dal richiamo.

Gli attaccanti si radunano sulla propria sponda: servono 6 unità per fortezza/torri, 4 per caserma/segheria, oppure un ariete e tre scorte; bastano 2 per un passaggio. Almeno il 70% deve raggiungere la raccolta. Perdite gravi impongono una ricomposizione di almeno 8 secondi. I nuovi soldati raggiungono una squadra vicina o attendono compagni alla raccolta.

Sotto il 28% di salute, i soldati automatici tornano alla base e riprendono servizio dall’80%. Entrambi gli eserciti recuperano 5 punti salute al secondo entro 140 metri da fortezza/caserma operativa, dopo 6 secondi senza colpi e senza nemici entro 220 metri. Anche i soldati manuali possono recuperare, ma non vengono spostati dal Consigliere. I resoconti mostrano difesa, attacco, raccolta e recupero. Jev sceglie il piano; le reazioni immediate seguono queste regole condivise della simulazione.

Il nemico recluta e costruisce con la propria economia: non riceve gruppi gratuiti a intervalli fissi.

## La nuova modalità

- **Obiettivo:** difendi la tua fortezza e distruggi quella nemica. La partita finisce quando cade una delle due.
- **Schieramento:** prima di iniziare puoi spostare le truppe sul tuo territorio, scegliere le costruzioni e mettere in coda reclutamenti. Economia, cantieri e addestramento iniziano con la battaglia.
- **Comandi:** clic o riquadro per selezionare, Maiusc per aggiungere, clic destro per muovere o attaccare un nemico. `Q` seleziona tutti, `A` poi clic avanza combattendo, `H` presidia, `R` ritira, Spazio mette in pausa. `1–4` reclutano. `T` mostra/nasconde l’analisi del terreno. I pulsanti `+ / − / ⌖` ingrandiscono e ripristinano la visuale; con una selezione, lo zoom si centra sull’esercito. Trascina con il tasto centrale per spostare la visuale ingrandita. Su touch seleziona un soldato oppure Tutti, poi tocca il terreno o un bersaglio.
- **Truppe:** spadaccini, cavalieri, arcieri e arieti. I cavalieri combattono a cavallo, hanno 150 salute e velocità 88, costano 60 oro e 20 legno e si addestrano in 5 secondi. Infliggono danni ×1,5 agli arcieri e ×2 agli arieti, e subiscono il 20% di danno in meno dalle frecce. Gli spadaccini restano la fanteria economica di prima linea. Gli arieti infliggono triplo danno agli edifici e resistono alle frecce, ma vanno scortati.
- **Economia:** ogni 5 secondi ricevi 12 oro e 8 legno, più 5 oro e 12 legno per segheria. Ogni attraversamento presidiato per 5 secondi passa sotto il tuo controllo e aggiunge 15 oro e 5 legno ogni 5 secondi. Le presenze contrapposte fermano la conquista; gli arieti non conquistano.
- **Edifici:** puoi costruire caserme, torri, segherie e alloggi sulla tua sponda anche durante il combattimento. Le torri e le fortezze sparano; le caserme permettono il reclutamento; gli alloggi aumentano di 10 il limite iniziale di 30 unità. La coda di addestramento è condivisa fra le caserme, con massimo 8 unità in attesa. La fortezza può essere riparata.
- **Avversario:** Jev comanda subito il proprio esercito, paga i reclutamenti e i cantieri, conquista risorse e lancia offensive mantenendo una guarnigione. Può ricostruire una caserma perduta se dispone di risorse.
- **Pausa:** congela simulazione e interazioni di gioco; il cambio scheda mette automaticamente in pausa. Il riavvio azzera tutta la partita.

## Jev, comandante del regno rivale

`POST /api/warlord` riceve una fotografia validata di unità, posizioni, salute, edifici, cantieri, risorse, perdite e controllo degli attraversamenti. Jev/TypeSafe risponde a sei Choice: **passaggio, composizione, obiettivo, manovra, dottrina e sviluppo**. Nessun campo libero viene eseguito come codice o istruzione di gioco. Le opzioni sono azioni implementate; un piano con arieti e un guado non viene accettato. La difesa è disponibile anche per ricomporre le forze.

L’analisi iniziale congela il tempo. Dopo la risposta, il Jev nemico rivaluta ogni **5 secondi di simulazione**, oppure prima in presenza di eventi rilevanti, con intervallo minimo di 5 secondi. Gli ordini cambiano rotta e bersaglio delle truppe attive, mantenendo tipo, salute e posizione. La composizione cambia solo i rinforzi futuri. L’assalto combatte lungo il percorso; l’aggiramento evita inseguimenti fino all’arrivo nella sponda occidentale; la difesa protegge gli edifici di casa e intercetta gli incursori. Il Jev alleato usa gli stessi comportamenti dal lato opposto della mappa, rispettando il controllo manuale. Gli arieti esistenti usano comunque un ponte compatibile. Un piano confermato conserva i percorsi già in corso; bersagli distrutti vengono sostituiti.

I pannelli dei Consiglieri e il registro mostrano **provenienza reale**, latenza, confidenza e piano applicato. L’osservazione della copertura del passaggio è calcolata dalla telemetria, non presentata come ragionamento privato del modello. Il registro conserva le ultime sette decisioni.

Chiave mancante, errore del provider, risposte invalide o limite server producono un **ripiego locale dichiarato**, senza chiamare un altro provider. Le regole locali osservano i passaggi meno coperti, la composizione e le strutture dell’avversario. L’opzione “Regole locali · senza Jev” non effettua chiamate. Timeout server 8 s, client 10 s, limite di 16 richieste/minuto per IP, comandante e istanza. Pausa e fine partita fermano la programmazione; le risposte tardive dopo riavvio/fine vengono ignorate e quelle arrivate in pausa attendono la ripresa. Le modifiche al codice API richiedono il riavvio del server locale.

## Terreno e movimento

| Terreno | Vantaggio | Punto debole |
|---|---|---|
| Alture | +25% gittata; +15% danni a distanza verso la pianura; tiro dal basso −15% | Movimento −12%; gli accessi possono essere aggirati |
| Boschi | Le unità ricevono −40% danni dalle frecce | Movimento −28%, gittata −15%; niente costruzioni |
| Ponte della corona / Ponte del mulino | Percorso rapido e compatibile con gli arieti | Accessi prevedibili da presidiare; il ponte nord è esposto alle alture |
| Guado dei salici / Guado dei canneti | Aggiramento lungo i bordi della mappa | Fanteria e cavalleria, velocità −48%, strettoia |
| Passo delle rovine | Collegamento centrale diretto | Fanteria e cavalleria, velocità −32%, passaggio molto stretto |
| Costoni rocciosi | Ostacoli per proteggere un fianco e incanalare gli avversari | Impediscono movimento e costruzione |

I percorsi A* evitano fiume, costoni ed edifici, rispettano i limiti degli arieti e includono il costo del terreno. Le truppe accelerano, cambiano orientamento gradualmente, si separano e raggiungono una formazione con cavalleria/fanteria davanti e arcieri dietro. La simulazione nel browser avanza a 30 passi al secondo, con interpolazione della grafica fra i passi.

Grafica originale disegnata dal codice: terreno con texture e rilievi, acqua e guadi, ponti distinti, boschi, edifici con muratura e insegne, soldati con armatura, mantello e camminata legata alla distanza percorsa. Frecce animate, colpi, polvere e cadute completano il combattimento. Si può ingrandire la mappa fino a 2,4×. Il prototipo non include nebbia di guerra, salvataggi o multiplayer. Le modalità precedenti restano in `/orbitale.html` e `/arcade.html`.

Verifica: `npm test` e `npm run build`. I test RTS controllano attraversamento dei ponti, ostacoli, schieramento, economia, reclutamento, costruzione, conquista, incursioni, danni e vittoria/sconfitta.

# NEXUS — Comando Orbitale (modalità precedente)

Gioco strategico browser con **Phaser 4.2.1**, asset originali **Kenney Space Shooter Redux** e comandante nemico **Jev / TypeSafe** oppure **Qwen / Hugging Face**, tramite API server. Nessun modello ML locale.

## Avvio e pagine

Richiede Node 22.12 o successivo:

```sh
npm install
npm run dev
```

- `http://127.0.0.1:5173/orbitale.html`: Comando Orbitale, la modalità precedente.
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
