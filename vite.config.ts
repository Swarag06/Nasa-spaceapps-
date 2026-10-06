import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function spherexApiPlugin(): Plugin {
  return {
    name: 'spherex-api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || '';

        // Serve static frames: /static/frames/...
        if (url.startsWith('/static/frames/')) {
          const relPath = url.replace('/static/frames/', '');
          const filePath = path.resolve(__dirname, 'data/frames', relPath);

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            if (filePath.endsWith('.webp')) {
              res.setHeader('Content-Type', 'image/webp');
            } else if (filePath.endsWith('.json')) {
              res.setHeader('Content-Type', 'application/json');
            }
            return fs.createReadStream(filePath).pipe(res);
          }
        }

        // Serve GET /health
        if (url === '/health') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ status: 'ok' }));
        }

        // Serve GET /targets
        if (url === '/targets') {
          const framesDir = path.resolve(__dirname, 'data/frames');
          const targets = [];
          if (fs.existsSync(framesDir)) {
            const entries = fs.readdirSync(framesDir);
            for (const entry of entries) {
              const indexPath = path.join(framesDir, entry, 'index.json');
              if (fs.existsSync(indexPath)) {
                try {
                  const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
                  targets.push({
                    id: data.target || entry,
                    title: data.title,
                    ra: data.ra,
                    dec: data.dec,
                    caption: data.caption,
                    frame_count: data.frames?.length || 0,
                  });
                } catch {
                  // ignore
                }
              }
            }
          }
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(targets));
        }

        // Serve GET /targets/:id/frames
        const match = url.match(/^\/targets\/([^/]+)\/frames$/);
        if (match) {
          const targetId = match[1];
          const indexPath = path.resolve(__dirname, 'data/frames', targetId, 'index.json');
          if (fs.existsSync(indexPath)) {
            res.setHeader('Content-Type', 'application/json');
            return fs.createReadStream(indexPath).pipe(res);
          } else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ detail: `Target '${targetId}' not found` }));
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), spherexApiPlugin()],
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
