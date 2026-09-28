type LogLevel = "debug" | "info" | "warn" | "error";

const logMessage = (level: LogLevel, ...args: unknown[]) => {
  if (import.meta.env.DEV) {
    const timestamp = new Date().toISOString();
    const prefix = `${timestamp} [${level.toUpperCase()}]:`;

    const methods: Record<LogLevel, (...args: unknown[]) => void> = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug || console.log,
    };
    methods[level](prefix, ...args);
  }
};

const log = {
  debug: (...args: unknown[]) => logMessage("debug", ...args),
  info: (...args: unknown[]) => logMessage("info", ...args),
  warn: (...args: unknown[]) => logMessage("warn", ...args),
  error: (...args: unknown[]) => logMessage("error", ...args),
};

export default log;
