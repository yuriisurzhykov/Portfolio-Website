const http = require('node:http');
const https = require('node:https');

function createProxy({apiKey, upstreamRequest = https.request}) {
    if (!apiKey) throw new Error('API key unavailable');
    let requests = 0;
    const server = http.createServer((req, res) => {
        if (req.url !== '/v1/responses') {res.writeHead(403); res.end('Forbidden route'); return;}
        if (req.method !== 'POST') {res.writeHead(405); res.end('Method not allowed'); return;}
        if (++requests > 100) {res.writeHead(429); res.end('Repair request budget exceeded'); return;}
        const chunks = []; let size = 0;
        req.on('data', chunk => {
            size += chunk.length;
            if (size > 4 * 1024 * 1024) {res.writeHead(413); res.end('Request too large'); req.destroy();}
            else chunks.push(chunk);
        });
        req.on('end', () => {
            if (res.writableEnded) return;
            const fail = () => {if (!res.headersSent) res.writeHead(502); res.end('Upstream request failed');};
            let upstream;
            try {
                upstream = upstreamRequest({hostname: 'api.openai.com', port: 443, path: '/v1/responses', method: 'POST',
                    headers: {'authorization': `Bearer ${apiKey}`, 'content-type': 'application/json', 'accept': 'text/event-stream'}}, response => {
                    const headers = {};
                    if (response.headers['content-type']) headers['content-type'] = response.headers['content-type'];
                    res.writeHead(response.statusCode, headers);
                    response.on('error', () => res.destroy());
                    response.pipe(res);
                });
                upstream.on('error', fail);
                upstream.setTimeout(120000, () => upstream.destroy());
                res.on('close', () => upstream.destroy());
                upstream.end(Buffer.concat(chunks));
            } catch {fail();}
        });
        req.on('error', () => res.destroy());
    });
    server.on('connect', (_req, socket) => socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'));
    server.on('upgrade', (_req, socket) => socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'));
    server.requestTimeout = 30000;
    server.headersTimeout = 10000;
    return server;
}
if (require.main === module) createProxy({apiKey: process.env.OPENAI_API_KEY}).listen(8080, '0.0.0.0');
module.exports = {createProxy};
