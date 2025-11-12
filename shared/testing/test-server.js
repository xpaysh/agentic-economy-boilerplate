/**
 * Test Server Helper
 *
 * Utilities for setting up and tearing down test servers
 */

const http = require('http');

/**
 * Create a test server wrapper
 */
class TestServer {
  constructor(app, options = {}) {
    this.app = app;
    this.server = null;
    this.port = options.port || 0; // 0 = random available port
    this.address = null;
    this.baseURL = null;
  }

  /**
   * Start the test server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err) => {
        if (err) {
          return reject(err);
        }

        this.address = this.server.address();
        this.port = this.address.port;
        this.baseURL = `http://localhost:${this.port}`;

        resolve(this);
      });
    });
  }

  /**
   * Stop the test server
   */
  async stop() {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          return reject(err);
        }
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Get the base URL for requests
   */
  getURL(path = '') {
    return `${this.baseURL}${path}`;
  }

  /**
   * Get server info
   */
  getInfo() {
    return {
      port: this.port,
      address: this.address,
      baseURL: this.baseURL
    };
  }
}

/**
 * Create and manage multiple test servers
 */
class TestServerManager {
  constructor() {
    this.servers = new Map();
  }

  /**
   * Add a server to the manager
   */
  async addServer(name, app, options = {}) {
    const server = new TestServer(app, options);
    await server.start();
    this.servers.set(name, server);
    return server;
  }

  /**
   * Get a server by name
   */
  getServer(name) {
    return this.servers.get(name);
  }

  /**
   * Stop a specific server
   */
  async stopServer(name) {
    const server = this.servers.get(name);
    if (server) {
      await server.stop();
      this.servers.delete(name);
    }
  }

  /**
   * Stop all servers
   */
  async stopAll() {
    const stopPromises = Array.from(this.servers.values()).map(server => server.stop());
    await Promise.all(stopPromises);
    this.servers.clear();
  }

  /**
   * Get all server URLs
   */
  getURLs() {
    const urls = {};
    for (const [name, server] of this.servers.entries()) {
      urls[name] = server.baseURL;
    }
    return urls;
  }
}

/**
 * HTTP request helper for testing
 */
async function request(url, options = {}) {
  const method = options.method || 'GET';
  const headers = options.headers || {};
  const body = options.body;

  if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method,
      headers
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsedData = data;
        if (res.headers['content-type']?.includes('application/json')) {
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedData,
          raw: data
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }

    req.end();
  });
}

/**
 * Setup helper for common test scenarios
 */
async function setupTestEnvironment(apps = {}) {
  const manager = new TestServerManager();

  // Start all provided apps
  for (const [name, app] of Object.entries(apps)) {
    await manager.addServer(name, app);
  }

  // Cleanup function
  const cleanup = async () => {
    await manager.stopAll();
  };

  return {
    manager,
    urls: manager.getURLs(),
    cleanup,
    request
  };
}

/**
 * Wait for server to be ready
 */
async function waitForServer(url, maxAttempts = 10, delay = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await request(`${url}/health`);
      return true;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error(`Server not ready after ${maxAttempts} attempts`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

/**
 * Mock storage for testing
 */
class MockStorage {
  constructor() {
    this.data = new Map();
  }

  async set(key, value, ttl = null) {
    this.data.set(key, { value, ttl: ttl ? Date.now() + ttl * 1000 : null });
  }

  async get(key) {
    const item = this.data.get(key);
    if (!item) return null;

    if (item.ttl && Date.now() > item.ttl) {
      this.data.delete(key);
      return null;
    }

    return item.value;
  }

  async delete(key) {
    return this.data.delete(key);
  }

  async exists(key) {
    return this.data.has(key);
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async clear() {
    this.data.clear();
  }
}

module.exports = {
  TestServer,
  TestServerManager,
  request,
  setupTestEnvironment,
  waitForServer,
  MockStorage
};
