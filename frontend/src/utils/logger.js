/**
 * Environment-aware logger.
 * In development: logs to console.
 * In production: silences console output (replace with Sentry / external service).
 */
const isDev = process.env.NODE_ENV === "development";

const logger = {
  error: (...args) => {
    if (isDev) console.error(...args);
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
};

export default logger;
