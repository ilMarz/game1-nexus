import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  build:{rollupOptions:{input:{
    main:fileURLToPath(new URL('./index.html',import.meta.url)),
    orbitale:fileURLToPath(new URL('./orbitale.html',import.meta.url)),
    strategie:fileURLToPath(new URL('./strategie.html',import.meta.url)),
    arcade:fileURLToPath(new URL('./arcade.html',import.meta.url))
  }}}
});
