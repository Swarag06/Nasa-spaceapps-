import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import https from 'https';
import {defineConfig, Plugin} from 'vite';

function spherexRemoteProxyPlugin(): Plugin {
  return {
    name: 'spherex-remote-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || '';

        // Proxy fallback: /remote-frames/...
        if (url.startsWith('/remote-frames/')) {
          const relPath = url.replace('/remote-frames/', '');
          const targetUrl = `https://swarag06.github.io/spherex-frames/${relPath}`;

          https.get(targetUrl, (proxyRes) => {
            res.statusCode = proxyRes.statusCode || 200;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            if (proxyRes.headers['content-type']) {
              res.setHeader('Content-Type', proxyRes.headers['content-type']);
            }
            proxyRes.pipe(res);
          }).on('error', (err) => {
            console.error('Remote proxy error:', err);
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Failed to proxy remote frames' }));
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), spherexRemoteProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
