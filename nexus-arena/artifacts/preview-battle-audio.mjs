import {writeFileSync} from 'node:fs';
import {synthesizeEffect,SOUND_TYPES} from '../rts-audio.js';
const rate=44100,gap=.22;
const clips=SOUND_TYPES.map((type,i)=>synthesizeEffect(type,i+1,rate));
const length=clips.reduce((n,c)=>n+c.length+Math.ceil(gap*rate),0);
const wav=Buffer.alloc(44+length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
wav.write('data',36);wav.writeUInt32LE(length*2,40);
let offset=44;
for(const clip of clips){for(const value of clip){wav.writeInt16LE(Math.round(value*32767),offset);offset+=2;}offset+=Math.ceil(gap*rate)*2;}
writeFileSync(new URL('./anteprima-effetti-sonori.wav',import.meta.url),wav);
console.log(`Anteprima: ${(length/rate).toFixed(1)} s. Ordine: ${SOUND_TYPES.join(', ')}`);
