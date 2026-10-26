import {defineConfig,loadEnv} from 'vite';
import {fileURLToPath} from 'node:url';
import {gateGameHtml} from './server/game-access.js';

export default defineConfig(({mode})=>({
  plugins:[{name:'jev-access-limit',transformIndexHtml:{order:'pre',handler:html=>gateGameHtml(html,{...loadEnv(mode,process.cwd(),''),...process.env})}}],
  build:{rollupOptions:{input:{
    main:fileURLToPath(new URL('./index.html',import.meta.url)),
    orbitale:fileURLToPath(new URL('./orbitale.html',import.meta.url)),
    strategie:fileURLToPath(new URL('./strategie.html',import.meta.url)),
    arcade:fileURLToPath(new URL('./arcade.html',import.meta.url))
  }}}
}));
