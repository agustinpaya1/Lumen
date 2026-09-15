import { createLogHandler } from '../server/log-ingestion';

// Node.js Vercel Function. Secrets are read exclusively in the server runtime.
export default { fetch: createLogHandler() };
