const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '10000', 10);

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'text/javascript; charset=UTF-8',
    '.mjs': 'text/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
    // Health check endpoint for Render monitoring
    if (req.url === '/health' || req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'telegram-drive-web', uptime: process.uptime() }));
        return;
    }

    // Parse URL and sanitize file path
    const safeUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let filePath = path.join(DIST_DIR, decodeURIComponent(safeUrl.pathname));

    // Security: Prevent directory traversal
    if (!filePath.startsWith(DIST_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        fs.readFile(filePath, (readErr, content) => {
            if (!readErr) {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = MIME_TYPES[ext] || 'application/octet-stream';
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
                });
                res.end(content);
            } else {
                // SPA fallback: return index.html for client-side routing
                fs.readFile(path.join(DIST_DIR, 'index.html'), (spaErr, spaContent) => {
                    if (spaErr) {
                        res.writeHead(500);
                        res.end('Internal Server Error: Application bundle not found');
                    } else {
                        res.writeHead(200, {
                            'Content-Type': 'text/html; charset=UTF-8',
                            'Cache-Control': 'no-cache',
                        });
                        res.end(spaContent);
                    }
                });
            }
        });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Telegram Drive web service listening on 0.0.0.0:${PORT}`);
});
