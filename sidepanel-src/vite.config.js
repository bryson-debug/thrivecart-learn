import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  base: '/sidepanel/',
  plugins: [react()],
  // @hsds/tokens (a transitive dep of @helpscout/ui-kit) gets installed
  // nested under ui-kit's own node_modules rather than hoisted, due to a
  // peer-dep version mismatch (@hsds/tokens wants react-dom 16/17, we're on
  // 18). Vite's resolver doesn't find that nested copy for the bare
  // "@hsds/tokens" specifier and leaves it as an unresolvable import in the
  // browser bundle -- alias it to the real installed path explicitly.
  resolve: {
    alias: {
      '@hsds/tokens': path.resolve(__dirname, '../node_modules/@helpscout/ui-kit/node_modules/@hsds/tokens/index.cjs'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../public/sidepanel'),
    emptyOutDir: true,
  },
});
