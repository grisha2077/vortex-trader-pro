const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../../logs");

// Configure file transport for different log levels
const fileTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: "vortex-trader-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: logFormat,
  level: "info",
});

// Configure error file transport
const errorFileTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: "vortex-trader-error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: logFormat,
  level: "error",
});

// Configure console transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [fileTransport, errorFileTransport, consoleTransport],
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: logsDir,
      filename: "vortex-trader-exception-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      format: logFormat,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: logsDir,
      filename: "vortex-trader-rejection-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      format: logFormat,
    }),
  ],
});

// Add request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      type: "request",
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });
  next();
};

module.exports = {
  logger,
  requestLogger,
};
