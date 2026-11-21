import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        demos: 'demos/index.html',
        popup: 'demos/popup/index.html',
        chladni: 'demos/chladni/index.html',
      },
    },
  },
});
