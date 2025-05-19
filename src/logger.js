import pino from "pino";

export function createLogger() {
  const logger = pino({
    timestamp: () => `,"time":"${new Date().toJSON()}"`,
  }).child({});
  logger.level = "silent";
  return logger;
}
