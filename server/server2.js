import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {
    const filePath = req.url === '/' ? '/index.html' : req.url;
    const fullPath = path.join(__dirname, 'public', filePath);
    const extname = path.extname(fullPath);

    const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css'
    }[extname] || 'text/plain';

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // Broadcast the message to all other clients
        clients.forEach((client) => {
            if (client !== ws && client.readyState === ws.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });

    ws.on('close', () => {
        clients.delete(ws);
    });
});

const PORT = process.env.PORT || 2003;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});