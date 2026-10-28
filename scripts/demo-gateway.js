// ==============================================================
// Coffee Shop Order Management System (Akufada)
// High-Fidelity Nginx Reverse Proxy & Load Balancer Simulator
// Mirrors deploy/nginx/nginx.conf & deploy/nginx/conf.d/default.conf
// ==============================================================

const http = require('http');
const url = require('url');

const GATEWAY_PORT = process.env.GATEWAY_PORT ? parseInt(process.env.GATEWAY_PORT, 10) : 8088;

const upstreamNodes = [
  { id: 'api-node-1', url: 'http://127.0.0.1:3001', healthy: true, failedAt: 0 },
  { id: 'api-node-2', url: 'http://127.0.0.1:3002', healthy: true, failedAt: 0 },
];

let roundRobinIndex = 0;
const FAIL_TIMEOUT_MS = 10000; // Nginx fail_timeout=10s

function getNextHealthyNode() {
  const now = Date.now();
  // Check if temporarily failed nodes can be retried
  for (const node of upstreamNodes) {
    if (!node.healthy && now - node.failedAt > FAIL_TIMEOUT_MS) {
      console.log(
        `[Gateway Monitor] Restoring ${node.id} to candidate pool after fail_timeout expiration.`,
      );
      node.healthy = true;
    }
  }

  const healthyNodes = upstreamNodes.filter((n) => n.healthy);
  if (healthyNodes.length === 0) {
    return null;
  }

  const selected = healthyNodes[roundRobinIndex % healthyNodes.length];
  roundRobinIndex++;
  return selected;
}

function proxyRequest(req, res, targetNode, attempt = 1) {
  const parsedTarget = url.parse(targetNode.url);
  const proxyReqOptions = {
    hostname: parsedTarget.hostname,
    port: parsedTarget.port,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: req.headers.host,
      'x-real-ip': req.socket.remoteAddress,
      'x-forwarded-for': req.socket.remoteAddress,
      'x-forwarded-proto': 'http',
      'x-correlation-id': req.headers['x-correlation-id'] || `gw-corr-${Date.now()}`,
    },
    timeout: 5000,
  };

  const proxyReq = http.request(proxyReqOptions, (upstreamRes) => {
    // If upstream returned 502/503 and we have other nodes, failover (Nginx proxy_next_upstream)
    if (upstreamRes.statusCode >= 502 && attempt === 1) {
      console.warn(
        `[Gateway Failover] ${targetNode.id} returned HTTP ${upstreamRes.statusCode}. Triaging to peer node...`,
      );
      targetNode.healthy = false;
      targetNode.failedAt = Date.now();
      const peer = upstreamNodes.find((n) => n.id !== targetNode.id && n.healthy);
      if (peer) {
        return proxyRequest(req, res, peer, attempt + 1);
      }
    }

    // Pass through status and headers
    res.writeHead(upstreamRes.statusCode, {
      ...upstreamRes.headers,
      'x-backend-instance': upstreamRes.headers['x-backend-instance'] || targetNode.id,
      'x-gateway': 'akufada_gateway_lb',
    });

    upstreamRes.pipe(res);
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy(new Error('Gateway Timeout'));
  });

  proxyReq.on('error', (err) => {
    console.warn(
      `[Gateway Failover] Connection failed to ${targetNode.id} (${err.message}). Activating passive failover...`,
    );
    targetNode.healthy = false;
    targetNode.failedAt = Date.now();

    if (attempt === 1) {
      const peer = upstreamNodes.find((n) => n.id !== targetNode.id && n.healthy);
      if (peer) {
        console.log(`[Gateway Failover] Rerouting request to healthy peer ${peer.id}`);
        return proxyRequest(req, res, peer, attempt + 1);
      }
    }

    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 502,
        title: 'Bad Gateway',
        detail: 'No upstream API replicas currently available',
        timestamp: new Date().toISOString(),
      }),
    );
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  // 1. Gateway Health Check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        status: 'ok',
        gateway: 'akufada_nginx_simulator',
        healthyReplicas: upstreamNodes.filter((n) => n.healthy).map((n) => n.id),
        timestamp: new Date().toISOString(),
      }),
    );
  }

  // 2. API Routes (/api/v1/...)
  if (req.url.startsWith('/api/v1/')) {
    const node = getNextHealthyNode();
    if (!node) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          status: 503,
          title: 'Service Unavailable',
          detail: 'All upstream API replicas are marked unhealthy',
          timestamp: new Date().toISOString(),
        }),
      );
    }

    return proxyRequest(req, res, node);
  }

  // 3. Fallback Web Proxy
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Akufada Gateway Running. Access API under /api/v1/');
});

server.listen(GATEWAY_PORT, '127.0.0.1', () => {
  console.log(
    `Akufada Reverse Proxy & Load Balancer listening on http://127.0.0.1:${GATEWAY_PORT}`,
  );
  console.log(
    `Upstream backend pool: [${upstreamNodes.map((n) => `${n.id} -> ${n.url}`).join(', ')}]`,
  );
});
