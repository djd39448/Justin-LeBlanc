/** Starts the isolated loopback Node service. Dependencies: runtime, app, config and Node adapter.
 * Consumers: dedicated host service. Why: provider sockets and SQLite require a persistent process. */
import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createRuntime } from './runtime.js';

const runtime = createRuntime(loadConfig());
const server = serve({
  fetch: createApp(runtime).fetch,
  port: runtime.config.PORT,
  hostname: '127.0.0.1',
});
console.error(
  JSON.stringify({
    event: 'server_started',
    port: runtime.config.PORT,
    demo: runtime.config.DEMO_MODE,
  }),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    server.close(() => {
      runtime.store.close();
      process.exit(0);
    });
  });
