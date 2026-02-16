/**
 * @file Configuration information for Winston logger
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports logger a Winston logger object
 */

// Import libraries
import winston from "winston";
import { format } from "winston";

// Extract format options
const { combine, timestamp, printf, colorize, align, errors } = winston.format;

/**
 * Custom formatter for Sequelize Logs
 */
const sequelizeErrors = format((info) => {
  // Adapted from https://github.com/sequelize/sequelize/issues/14807#issuecomment-1853514339
  if (info instanceof Error && info.name.startsWith("Sequelize")) {
    if (info.parent) {
      let { message } = info.parent;
      if (info.sql) {
        message += "\nSQL: " + info.sql;
      }

      if (info.parameters) {
        const stringifiedParameters = JSON.stringify(info.parameters);
        if (stringifiedParameters !== "undefined" && stringifiedParameters !== "{}") {
          message += "\nParameters: " + stringifiedParameters;
        }
      }
      // Stack is already included in the error
      // message += "\n" + info.stack;

      // Update the message
      info.message = info.message += "\n" + message;
    }
  }
  return info;
});

// Custom logging levels for the application
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  lti: 5,
  debug: 6,
  sql: 7,
  silly: 8,
};

// Custom colors
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "white",
  verbose: "cyan",
  lti: "magenta",
  debug: "blue",
  sql: "gray",
  silly: "gray",
};

export default function configureLogger(level = "info") {
  winston.addColors(colors);

  return winston.createLogger({
    // Default logging level
    level: level,
    levels: levels,
    // Format configuration
    // See https://github.com/winstonjs/logform
    format: combine(
      sequelizeErrors(),
      errors({ stack: true }),
      colorize({ all: true }),
      //shortFormat(),
      timestamp({
        format: "YYYY-MM-DD hh:mm:ss.SSS A",
      }),
      align(),
      printf(
        (info) => `[${info.timestamp}] ${info.level}: ${info.stack ? info.message + "\n" + info.stack : info.message}`,
      ),
    ),
    // Output configuration
    transports: [new winston.transports.Console()],
    exceptionHandlers: [new winston.transports.Console()],
    rejectionHandlers: [new winston.transports.Console()],
  });
}
