import http from 'http';
import httpProxy from 'http-proxy';

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Create an HTTP server
const server = http.createServer((req, res) => {
  console.log(req.headers.origin ?? 'https://api.transcend.io');
  console.log('HELLO');
  // On each request, use the proxy to forward the request to a specific URL
  // proxy.web(req, res, {
  //   target: req.headers.origin ?? 'https://api.transcend.io',
  // });
});

// Listen on port 5050
server.listen(5050);

// eslint-disable-next-line no-console
console.log('Proxy server running on port 5050');
