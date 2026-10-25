# Terre di Confine · direzione visiva

Phaser 4, mappa logica 1200 × 760, vista dall’alto inclinata negli edifici. Terreno, edifici e soldati originali procedurali nei moduli `rts-art.js` e `rts-game.js`. Le texture del terreno sono generate una volta per scena con seed fisso 7391, senza variazioni casuali fra le partite. I due Consiglieri Strateghi hanno ritratti pittorici originali generati con image_gen integrato, salvati in `public/assets/advisors/`; i prompt completi e la provenienza sono nel README di quella cartella.

Il prato usa verde salvia, paglia e terra; il fiume turchese desaturato divide la mappa. Muratura e costoni usano calcare caldo. Il giocatore è blu ardesia, Jev rosso rame; oro tenue per obiettivi, selezione e informazioni tattiche. Le ombre cadono in basso a destra e distinguono unità, rocce, boschi ed edifici dal suolo.

Sagome: spada e scudo per la fanteria, cavallo con quattro zampe animate, cavaliere corazzato e lancia protesa per la cavalleria, cappuccio/arco per gli arcieri, tetto e quattro ruote per gli arieti. Gli edifici hanno tetti di fazione e insegne; i ponti distinguono muratura, legno, rovine e acqua bassa. Le aree dipinte usano le stesse coordinate dei bonus e degli ostacoli della simulazione.

Camminata legata allo spazio percorso, orientamento graduale, oscillazione del mantello, ruote in movimento, attacco di spada, frecce con arco visivo, polvere e impatti brevi. Il feedback resta nel renderer; i bonus, gli ordini e le collisioni restano nella simulazione. Il terreno si ispeziona con cursore e tasto T; lo zoom aiuta a leggere le unità su pannelli stretti.

Manifesto: terreno e rilievi (texture Canvas 1200 × 760), cinque attraversamenti e cinque zone (coordinate in `rts-terrain.js`), quattro sagome soldati/ariete e cinque edifici (Graphics Phaser), effetti di movimento/combattimento (Graphics Phaser), interfaccia (HTML/CSS). Provenienza: codice originale del progetto. Le modalità precedenti mantengono i propri crediti e asset Kenney.

Ritratti dei Consiglieri: due PNG originali da 1254 × 1254, generati con image_gen integrato. Stile pittorico storico, luce calda, fondo verde scuro, volto centrale leggibile in miniatura. Mantello blu ardesia per l’alleato, rosso rame per il rivale; cornici, distintivi di fazione e lieve pulsazione durante l’analisi sono CSS. La preferenza di riduzione del movimento disattiva la pulsazione. I resoconti si leggono in balloon sotto il volto e nel registro; nessuna voce o sincronizzazione labiale è implicata dall’animazione.
