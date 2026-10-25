# Verifica di Terre di Confine

## Rivalutazioni ogni cinque secondi · 25 ottobre 2026

- Entrambi i comandanti avviano una rivalutazione ogni 5 secondi di simulazione, misurati dall’avvio della richiesta precedente. La latenza della risposta non aggiunge un nuovo intervallo completo. Un’analisi ancora pendente non viene duplicata; pausa, fine partita e ordini manuali conservano il comportamento precedente.
- Anche il cambio di priorità rispetta il minimo di 5 secondi. Limite server portato a 16 richieste/minuto per comandante e IP, sufficiente per 12 controlli regolari più analisi iniziale e margine di riavvio. Le due squadre hanno budget separati.
- 163 test passati, inclusi due nuovi casi per latenza, richieste lente e pausa. Aggiornati i controlli sulla cadenza dei due comandanti e sul limite API. Build di produzione riuscita; server locale riavviato con il nuovo limite.

## Indicazioni al Consigliere · 25 ottobre 2026

- 161 test: 10 nuovi casi per priorità difensiva/offensiva/attesa, preservazione degli ordini manuali, assenza di spesa automatica predefinita, singola operazione di sviluppo pagata, tempi di addestramento/costruzione, revoca delle nuove spese, coda e cantieri già pagati, risorse insufficienti, limiti, validazione delle azioni Jev, necessità locali e scarto delle risposte pendenti con priorità superata.
- Browser con Jev/TypeSafe reale: selezionato Sviluppa prima dell’avvio. Jev ha costruito una segheria a 0 s, completata a 8 s, poi ordinato uno spadaccino a 8 s e un lanciere a 16 s. Fonti validate e costi effettivamente scalati; a 8 s oro 252, legno 205, dopo entrate regolari. Passaggio ad Aspetta a 18 s: report di posizioni ferme e nessuna nuova spesa.
- Cinque pulsanti di priorità visibili a destra, indicazione attiva evidenziata e messaggi del giocatore distinti nel diario. I comandi individuali manuali restano prioritari. Le azioni automatiche rispettano i limiti della simulazione e lo spazio libero, senza creare unità o strutture gratis.

## Descrizioni e diario del Consigliere · 25 ottobre 2026

- 151 test passati: 5 nuovi per messaggi aggiunti senza riscrivere i precedenti, deduplicazione, reclutamenti e arrivi senza spese automatiche, interventi manuali, perdite, conquiste, emergenze, pause, edifici e limite di 120 messaggi. Un caso dedicato impedisce di annunciare ricomposizioni automatiche quando il giocatore prende il comando dell’intero esercito.
- Rimossi pannello, resoconto e registro del Consigliere nemico dall’interfaccia. Il suo direttore continua a scegliere i piani e controllare il nemico. Avvio collegato direttamente al pulsante sinistro.
- Browser: 9 descrizioni visibili e associate ai relativi comandi; nessun pannello nemico residuo. A 390 × 844 il documento non presenta overflow orizzontale. A 1280 × 900 verificati messaggi successivi per reclutamento, piano Jev validato, partenza del gruppo e completamento dell’addestramento, senza sostituire i messaggi precedenti; nessun errore JavaScript nei log controllati.
- Build di produzione riuscita, con avviso preesistente sul bundle Phaser.

## Equilibrio fra attacco e difesa · 25 ottobre 2026

- 146 test passati: 11 nuovi casi per presidio stabile e simmetrico, dottrine, raccolta, richiamo con priorità manuale, intercettazione, ricomposizione, recupero e condizioni che lo impediscono, rinforzi limitati e scelta Jev validata. Aggiornati i vecchi test che richiedevano l’intero esercito in assalto senza riserve.
- Prova deterministica con regole locali, rivalutazione ogni 12 s, massimo 360 s, mappa completa: senza reclutare, sconfitta a 252 s e 27 nemici eliminati; con reclutamento automatico di prova (ciclo spadaccino/arciere/lanciere/spadaccino/ariete, costi normali, nessuna risorsa aggiunta), vittoria a 202 s, 49 reclutamenti, massimo 23 alleati e 15 nemici contemporanei. Entrambi gli eserciti hanno effettivamente attaccato; il gruppo alleato ha conquistato passaggi e distrutto la fortezza. Script ripetibile: `node artifacts/balance-scenarios.mjs`. Verifica di giocabilità, non certificazione di equilibrio per ogni strategia.
- Browser con Jev/TypeSafe reale: entrambi i pannelli hanno mostrato “risposta validata”, dottrina equilibrata, presidio e gruppo in raccolta. Dopo i reclutamenti, osservato un resoconto con 3 unità in difesa, 3 in attacco, 2 in raccolta e 1 in recupero. Nessun errore JavaScript nei log controllati.
- Build di produzione riuscita; resta l’avviso preesistente sul bundle Phaser. Nessun deploy eseguito. Le sezioni seguenti documentano verifiche delle versioni precedenti.

## Schieramento a sinistra, Consiglieri a destra · 25 ottobre 2026

- Layout desktop a tre colonne: reclutamento, costruzioni e avvio a sinistra; campo di battaglia e ordini manuali al centro; Consiglieri, resoconti e registri a destra. I pannelli laterali scorrono indipendentemente. Eliminata dalla vista la barra ridondante dei resoconti sopra la mappa.
- Browser con viewport 1280 × 900: pannello sinistro x=0 / larghezza 230, mappa x=230 / larghezza 725, Consiglieri x=955 / larghezza 310. I controlli mantengono gli identificativi e i collegamenti alla simulazione.
- Verifica interattiva con modelli disattivati: reclutato un arciere dal pannello sinistro, oro 320 → 280, coda di 4 secondi; avviata la battaglia dal nuovo pulsante sinistro, con applicazione di entrambi i piani locali. Nessuna chiamata AI necessaria per questa prova.
- Ripristinata la selezione Jev/TypeSafe e una partita nuova in schieramento. Su layout mobile i pannelli si impilano: a 375 px il contenuto non supera la larghezza disponibile. Nessun ID duplicato e nessun errore JavaScript nei log controllati.
- `npm run build` riuscita. Modifica di disposizione HTML/CSS; nessuna nuova regola di combattimento o di comando introdotta.

## Consiglieri Strateghi, volti e resoconti · 25 ottobre 2026

- 135 test superati, di cui 9 nuovi controlli sui resoconti fattuali dei Consiglieri. Build di produzione riuscita; resta l’avviso relativo al bundle Phaser. Nessun deploy eseguito.
- Ritratti originali generati con image_gen integrato: alleato con mantello blu, rivale con mantello rosso. PNG da 1254 × 1254 pixel, rispettivamente 2.833.501 e 2.679.843 byte, copiati senza modifiche nel progetto. Prompt e provenienza in `public/assets/advisors/README.md`.
- Interfaccia: entrambi i ruoli sono denominati “Consigliere Stratega”, con fazione, ritratto, resoconto in prima persona e fonte AI distinguibili. Miniature e sintesi compaiono anche sopra la mappa; i pannelli contengono il testo completo.
- Browser con risposte reali Jev/TypeSafe: resoconto alleato “Ho ordinato un assalto attraverso il Ponte della corona, per abbattere la fortezza avversaria”; nemico “Ho ordinato un aggiramento attraverso il Guado dei canneti…” con composizione dichiarata per i rinforzi futuri.
- Preso il controllo dei tre soldati alleati rimasti: il resoconto è passato a “Controlli direttamente 3 soldati. Non cambio i tuoi ordini…”. Dopo “Affida allo Stratega” e pausa, il testo ha riportato il piano applicato preceduto da “La battaglia è in pausa”. Nessun errore JavaScript nei log controllati.
- I test verificano bersagli effettivi anziché quelli già distrutti, controllo manuale totale/parziale, arcieri sulle alture soltanto se presenti, arieti deviati su ponti compatibili, impossibilità di promettere rinforzi dopo la perdita della caserma, pause/fine partita e reclutamenti tenuti in riserva.
- La descrizione è generata dal gioco a partire dagli ordini applicati e dallo stato corrente; non è una spiegazione libera del modello o un’esposizione del suo ragionamento interno. Nessuna richiesta aggiuntiva per produrre il resoconto.

## Jev alleato contro Jev nemico · 25 ottobre 2026

- 126 test superati, di cui 14 nuovi per i due comandanti, disponibilità dei reclutamenti e precedenza manuale. Build di produzione riuscita. Nessun deploy eseguito.
- Prova reale con due richieste indipendenti TypeSafe: Jev alleato ha scelto **Assalto / Passo delle rovine**, risposta 368 ms; Jev nemico **Aggiramento / Guado dei canneti**, risposta 358 ms. Fonti validate visibili nei due pannelli. Si tratta di una partita osservata, non di una garanzia di ottimalità strategica.
- Browser: reclutato un arciere durante la battaglia con disponibilità automatica. Osservato completamento dell’addestramento e aumento a quattro arcieri nell’esercito. Il reclutamento è stato scelto dal giocatore.
- Browser: preso il controllo manuale dell’esercito a 34 s. Contatore **0 disponibili a Jev / 8 manuali**, conservato durante le rivalutazioni successive fino alla conclusione della prova; i due registri contavano 12 decisioni ciascuno. La fortezza è stata invasa mentre le truppe erano trattenute manualmente: Jev non ha annullato l’ordine per riposizionarle.
- Seconda prova browser: “Solo io” ha portato il contatore da **8 disponibili / 0 manuali** a **0 / 8**; “Affida a Jev” lo ha riportato a **8 / 0**. Disattivata la disponibilità dei nuovi reclutamenti e avviato un lanciere: coda **3 s / tuo controllo**. Al termine la coda era vuota e il contatore mostrava **3 disponibili / 1 manuale**, dopo perdite delle truppe automatiche. Ultime risposte lette: 237 ms per l’alleato e 235 ms per il nemico. Nessun errore JavaScript nei log controllati. Ripristinata la disponibilità automatica dei futuri reclutamenti al termine della prova.
- Test: ciascun Jev comanda solo la propria squadra; quello alleato agisce sulle sole unità automatiche e non modifica risorse, coda o composizione. I tre campi alleati sono passaggio, obiettivo e manovra; la composizione dei propri soldati resta una scelta umana. Il nemico mantiene le proprie quattro scelte, inclusi i rinforzi.
- Test: ordini manuali di attacco/movimento/presidio e schieramento iniziale persistono attraverso nuovi piani; una risposta già in volo non può sovrascriverli. Un attacco esplicito raggiunge il bersaglio scelto senza fermarsi per un’esca vicina. Solo una delega esplicita restituisce il soldato a Jev.
- Test: reclutamenti automatici ricevono subito il piano corrente; riserve manuali restano ferme e manuali; sospendere il Jev alleato ferma le sue richieste e i suoi soldati, preservando gli ordini umani. Gli aggiramenti alleati attraversano verso est e la difesa protegge la sponda ovest.
- Test: avvio sincronizzato delle due analisi, rivalutazione anticipata per interventi umani con minimo 8 s, telemetria manuale e coda validate, squadre invalide rifiutate e budget server indipendenti. Le fonti locali restano dichiarate; la chiave resta sul server.

## Jev, terreno tattico e movimento · 25 ottobre 2026

- 112 test passati: inclusi i test precedenti e 22 nuovi controlli per API Jev, ciclo di rivalutazione, cinque passaggi, terreno, navigazione e movimento in gruppo. Build di produzione riuscita; resta l’avviso sul bundle Phaser condiviso.
- Prova reale TypeSafe nel browser: inizialmente Jev ha scelto l’aggiramento attraverso il Ponte del mulino con esercito misto, obiettivo fortezza. Il registro ha mostrato risposte applicate a 0, 22, 45, 67 e 90 secondi di simulazione; dalla decisione a 45 s la composizione è passata ad arieti con scorta, senza trasformare le unità già presenti. Ultima latenza osservata nella prova: 225 ms, confidenza minima 35%. Le risposte provengono dal provider, non da mock; sono misure di una partita, non un benchmark del modello.
- Le prime prove hanno verificato anche ordini difensivi reali. La versione finale rende disponibile la difesa quando la fortezza rossa è danneggiata o minacciata; in assenza di minacce offre assalto e aggiramento, evitando attese difensive indefinite all’inizio.
- Test della richiesta: fotografia validata e campi non previsti rimossi, quattro Choice con terreno reale, compatibilità fra arieti e attraversamento, chiave solo sul server, attribuzione del provider solo dopo una risposta accettata, gestione di errori/credito mancante e nessuna chiamata ad altri servizi.
- Test del ciclo: analisi iniziale con tempo fermo, nuove analisi ogni 22 s, applicazione alle truppe già in campo, risposte in pausa rinviate, risposte dopo riavvio/fine ignorate, modalità locale senza fetch, sorgente locale dichiarata.
- Test di navigazione: tutti e cinque i passaggi attraversati in entrambe le direzioni; arieti esclusi da guadi e rovine; fiume, rocce ed edifici non attraversabili; un gruppo di 25 soldati raggiunge la propria formazione attraversando un ponte. Un piano confermato preserva il percorso e i soldati fermi azzerano lo stato di camminata.
- Test del terreno: copertura del bosco applicata al danno reale delle frecce; danno dall’altura; gittata estesa verificata tramite un attacco effettivo che dalla pianura non arriva; coefficienti di velocità e accelerazione controllati. Il disegno usa le coordinate della stessa definizione del terreno.
- Browser: selezionate 8 unità, ingrandita la visuale a 1,7× e impartito un ordine con clic destro. Osservato arrivo in formazione sull’Altura della corona, con descrizione del bonus nel pannello terreno. Verificati zoom e ripristino della mappa; pausa blocca anche le nuove richieste.
- Layout controllato nel pannello stretto e con viewport desktop 1280 × 900. Su desktop mappa e Intelligence sono affiancate, con pannello laterale scorrevole. La barra di Jev e l’avvio rapido restano prima della mappa anche sul layout stretto. Non verificato con tocco su telefono fisico o panning con tasto centrale.
- Grafica procedurale originale: texture terreno, tre alture, due boschi, quattro costoni, cinque passaggi distinti, soldati con armatura e animazione legata al movimento, frecce, polvere e impatti. Provenienza e vincoli in `ART-DIRECTION.md`. Nessun deploy eseguito.

## RTS medievale · 25 ottobre 2026

- `npm test`: 90 test passati, di cui 12 nuovi per la modalità RTS. `npm run build`: riuscita, con quattro pagine incluse. Resta l'avviso di dimensione del bundle Phaser condiviso.
- Simulazione: schieramento senza reddito o invasione; truppe che attraversano il fiume solo sui ponti in entrambi i sensi; movimento attorno agli edifici; coda di reclutamento, capacità, costi, cantieri e produzione; cattura dei ponti, contesa e arieti esclusi dalla cattura; vantaggi di combattimento; ondate alternate, attacco all'economia e stop dei rinforzi alla distruzione della caserma.
- Verificata una vittoria tramite assedio effettivo di due arieti contro una fortezza senza altre difese. Verificata una sconfitta lasciando il regno senza nuovi ordini. Queste prove verificano la simulazione, non certificano il bilanciamento di tutte le strategie.
- Browser desktop: osservati terreno, fiume, due ponti, edifici medievali e soldati con gambe animate; selezionate 8 unità, impartito movimento con clic destro verso il ponte nord, reclutato un ariete e avviata la battaglia. Osservati reclutamento completato, movimento, nemici, combattimento e perdite. Nessun errore JavaScript nei log controllati dopo il caricamento finale.
- Browser desktop: costruita una torre sul terreno. Risorse passate da 320 oro / 220 legno a 240 / 130; cantiere e messaggio aggiornati. Verificata pausa con overlay e comandi disabilitati, poi riavvio della partita.
- Layout stretto: verificata la disposizione a due colonne dei pannelli sotto la mappa con viewport mobile; larghezza contenuto 375 px senza scorrimento orizzontale. Non provato su un telefono fisico né con tocco reale.
- Comandante RTS dichiarato a regole locali; nessuna richiesta a Jev/Qwen. Le modalità precedenti restano in `/orbitale.html` e `/arcade.html`. Nessun deploy eseguito.

# Verifiche precedenti di Comando Orbitale

## Espansione: economia, fortificazioni e rivalutazioni live

- 78 test: aggiunti 10 controlli su ricerca/sblocchi, estrazione solo alimentata e solo in combattimento, cantieri temporizzati anche live, intercettazione delle navi già in movimento, danno dei bombardieri, potenziamenti, ricostruzione, riallocazione del solo budget residuo, retarget senza trasformare le navi, snapshot validati e risorse di fine ondata.
- Test precedenti ancora inclusi: partita completa di sei ondate e conservazione del budget.
- Browser reale (layout mobile circa 700 × 630): sbloccata Industria, costruiti laser N1/E1 e un estrattore S1, rete 6/6, 25 crediti e 40 leghe rimasti. Prima risposta Jev: 333 ms, confidenza 56%, corazze da sud verso gli estrattori.
- Barriera sud avviata durante il combattimento, con costo realmente scalato. Al termine degli 8 secondi, arco ciano operativo e danni alla barriera osservati (164/180 e poi 60/180). Estrattore effettivamente distrutto; rete scesa a 4/6. Produzione osservata: +6 crediti e +3 leghe.
- Seconda risposta Jev a 12 s: 236 ms, piano confermato, 5 punti riserva. Terza risposta a 30 s: 250 ms, confidenza 37%, nuovo obiettivo barriere, nessuna riserva rimasta. Contatore RISPOSTA #3, cronologia e perdite osservate visibili. Sono misure di una partita, non un benchmark strategico.
- Qwen coperto con risposte simulate; nessuna nuova chiamata Qwen reale. Nessun test su telefono fisico. Deploy Vercel non eseguito.

## Verifica precedente della modalità strategica

- 68 test passati, inclusi i 52 test arcade e 16 verifiche di simulazione/API strategica.
- Sei ondate adattive completate nella simulazione con difese costruite e potenziate usando i crediti guadagnati; verificati anche sconfitta, EMP, rete satura, perdita dei reattori e assenza di stalli.
- Il test comparativo usa lo stesso piano, budget e seed: difese al nord proteggono meglio dall’ingresso nord rispetto alle stesse difese al sud.
- Tutte le composizioni spendono esattamente il budget fissato dal gioco, da 14 a 49; risposta del modello e campi non autorizzati non possono cambiarlo.
- Browser 713 × 630: costruiti laser in N1, E1 e S1, crediti 240 → 30, rete 6/6, copertura dei settori aggiornata e scelta delle postazioni tramite barra touch.
- Chiamata reale Jev verificata: 361 ms, confidenza minima fra le tre scelte 53%. Piano: corazzati da ovest contro le strutture raggruppate; il pannello identifica ovest fra i settori meno coperti e tre laser vulnerabili alle corazze.
- Prima ondata completata nel browser: 6 abbattimenti, 0 passaggi, nucleo integro, 1 torretta distrutta, bonus 87. Crediti finali 179 e cantiere riaperto per la seconda ondata.
- Secondo schieramento reale: laser N1, missili E1, reattore S1, crediti 5 e rete 5/10. Jev seleziona corazzati da sud con obiettivo reattori (1111 ms, confidenza minima 49%). Il settore sud ha copertura 0; gli attaccanti convergono sul reattore, osservato a 16/90 integrità prima della pausa. La barra sulla mappa mostra il piano applicato.
- Qwen verificato con risposta simulata; nessuna nuova chiamata reale Hugging Face in questa iterazione. Le tre scelte native Jev sono state invece provate con il servizio reale.
- Build multipagina e due Function Vercel configurate; deploy non eseguito in questa sessione. Nessuna modifica alle chiavi esistenti.
- Il completamento delle sei ondate è stato verificato nella simulazione; la partita manuale browser ha coperto la prima ondata. Nessuna prova su telefono fisico.

# Archivio delle verifiche arcade

- `npm test`: 52 test passati: API, provider, `.env`, pausa, input, AI off, mira e fuoco automatico, tattiche, adattamento e joystick. Inclusi due puntatori simultanei indipendenti, rilascio di un controller senza interrompere l’altro, zona morta, cattura persa, annullamento e reset.
- `npm run build`: completata. Il bundle principale include il motore Phaser; Vite segnala il superamento della soglia indicativa di 500 kB, con circa 364 kB gzip di JavaScript.
- Browser reale: caricamento asset, avvio, movimento WASD, fuoco e collisioni, nemici, punteggio, potenziamento doppio laser, sconfitta, nuovo avvio e pausa osservati.
- Correzione input: focus del canvas all'avvio/ripresa; movimento orizzontale e verticale osservato con WASD, pausa manuale persistente che non viene chiusa dai tasti movimento, pulsante Riprendi visibile. La ripresa automatica alla pressione di un tasto movimento è coperta dal test di regressione.
- Ispezione grafica a due dimensioni della finestra. Il gioco usa sprite originali Kenney e un'immagine astronomica Hubble; nessun modello ML locale.
- Endpoint `/api/director` provato via HTTP: restituisce correttamente `missing_token` senza HF_TOKEN.
- Hugging Face reale verificato dopo la configurazione della chiave e l'aggiunta di credito: `/api/director` ha restituito `source: huggingface`, `tactic: assault` e il messaggio italiano "Assalto in corso. Preparati al peggio.". La chiave resta nel file `.env` escluso da Git.
- Deploy Vercel non eseguito: il controllo `vercel whoami` restituisce `Logged out`. Configurazione di build e Function già presenti.
- Boss e vittoria sono implementati; non è stata completata una partita vincente durante la verifica manuale.
- Jev integrato con API nativa TypeSafe e modello predefinito `jev-1.14.0`. Risposta reale osservata nel browser: JEV ATTIVO, assalto, latenza 231 ms, confidenza 80%. Sono misure di una singola chiamata, non un benchmark.
- Browser: selettore Jev/Qwen/Auto visibile e selezione Jev verificata. Il direttore mantiene le quattro tattiche implementate; le frasi associate a Jev sono predefinite.
- Nuovo gestore input: in locale D sposta X da 720 a 929,7, W sposta Y da 630 a circa 494. Dopo il cambio di direttore e la ripresa, le frecce spostano la nave a X=788 e Y=607 circa. Nella build compilata servita su porta 4174, destra/su spostano la nave da (720,630) a circa (879,505), poi il vettore torna a zero al rilascio. Posizioni lette dall'output diagnostico visibile, oltre all'ispezione grafica.
- AI off: verificati selezione prima della partita, passaggio Jev → off durante la partita, assalto fisso, refresh AI disabilitato e indicatore tattico sotto il timer. Le risposte tardive della modalità precedente vengono ignorate tramite revisione della selezione; l'endpoint off non esegue fetch, come verificato dal test. Il confronto non usa un seed condiviso tra partite.
- Mira mouse verificata nel browser: nessun colpo senza pressione; tenendo il sinistro per 650 ms, 4 colpi. Muovendo A dopo il rilascio, X passa da 720 a 572,7 e la rotazione si aggiorna verso il cursore fermo, senza nuovi colpi. In una nuova partita, sinistro e D simultanei per 550 ms spostano X da 720 a circa 952, con 3 colpi e rotazione circa -59,7° verso il mirino in alto a sinistra. Laser e scia seguono la mira. Scatto con Spazio ed EMP con F mantenuti. Il controllo touch non è stato verificato su hardware mobile.
- Pannello tattico verificato nel browser a 713 × 630: assalto fisso senza API e risposta reale Jev con assalto frontale, risposta #1 e 248 ms. Frecce di ingresso dall’alto e cronologia visibili. Gli avvisi di ingresso usano coordinate condivise con lo spawn; le linee della raffica indicano la mira corrente prima del tiro, non una traiettoria bloccata in anticipo.
- Prova Qwen in questa sessione: nessuna decisione utilizzabile; osservati stato API non disponibile, fonte REGOLE LOCALI e relativo evento nella cronologia. Nessuna risposta Qwen dichiarata come riuscita.
- Aspetto strategie: osservate tutte e quattro le atmosfere nell’anteprima a 713 × 630, con cambi di palette e geometrie distinti; verificati pulsanti e ritorno al gioco. Nella partita, assalto ambra verificato con movimento e tiro simultanei. La build produce sia `index.html` sia `strategie.html` e condivide il motore e gli effetti fra le due pagine. Nessuna API viene chiamata dall’anteprima. La modalità riduzione movimento è implementata ma non verificata con la preferenza di sistema attiva.
- Fuoco automatico continuo ripristinato, con mira mouse indipendente: avviando la partita e premendo solo D per 600 ms, nave da X=720 a X=946,7 e almeno 5 colpi, senza clic nell’arena o movimento del mouse. La pausa arresta il contatore dei colpi. Superate le precedenti verifiche relative al fuoco manuale: rilascio e uscita dal canvas non fermano più il tiro. Restano 33 test, con i test del puntatore aggiornati alla sola mira.
- Direttore adattivo, browser reale: nave ferma a posizione normalizzata 50/88, fermo 100%, bordi 100%. Jev seleziona ATTACCO LATERALE a 4 secondi (321 ms). Dopo i danni, recupero locale a 10 secondi e risposta reale Jev TREGUA a 12 secondi (232 ms). A 16 secondi il pannello mostra scafo 24%, danni recenti 66 e la cronologia delle tre decisioni; grafica verde e linee di tiro osservate. Sono esempi di una partita, non un benchmark di qualità dei modelli. La telemetria estesa e i limiti API sono verificati anche con risposte simulate; il nuovo prompt Qwen non è stato verificato con una chiamata reale in questa iterazione.
- Due joystick: layout touch forzato nel browser a 713 × 630. Il destro porta la rotazione a 90° senza muovere la nave (X=720); usando poi il sinistro, X passa a circa 929 e la rotazione resta 90°, con fuoco continuo. Pausa verificata. Due dita simultanee sono coperte da eventi di test con pointer ID distinti; non è stata effettuata una prova su hardware mobile fisico.
