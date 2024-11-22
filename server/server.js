import {createServer} from 'http';
import {parse} from 'url';
import {readFile} from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
    const {pathname} = parse(req.url, true);

    if (pathname === '/api/signaling') {
        // 处理信令逻辑
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                // 这里应该实现信令逻辑，例如将消息广播给其他客户端
                // 在实际应用中，你可能需要使用外部服务（如Redis）来存储和转发消息
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({status: 'Message received'}));
            });
        } else {
            res.writeHead(405);
            res.end('Method Not Allowed');
        }
    } else {
        // 提供静态文件
        const filePath = pathname === '/' ? '/index.html' : pathname;
        const fullPath = path.join(process.cwd(), 'public', filePath);

        try {
            const content = await readFile(fullPath);
            const contentType = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css'
            }[path.extname(filePath)] || 'text/plain';

            res.writeHead(200, {'Content-Type': contentType});
            res.end(content);
        } catch (error) {
            res.writeHead(404);
            res.end('File not found');
        }
    }
}