// Only used by the secret-free integration probe; production runs proxy.cjs.
const http = require('node:http');
const {createProxy} = require('../proxy/proxy.cjs');
const upstream = http.createServer((req, res) => {req.resume(); req.on('end', () => {res.setHeader('content-type', 'text/event-stream'); res.end('data: fixture\n\n');});});
upstream.listen(0, '127.0.0.1', () => createProxy({apiKey: process.env.OPENAI_API_KEY,
    upstreamRequest: (options, callback) => http.request({...options, hostname: '127.0.0.1', port: upstream.address().port}, callback),
}).listen(8080, '0.0.0.0'));
