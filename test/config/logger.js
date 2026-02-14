/**
 * @file /config/logger.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should, expect } from "chai";

// Load module under test
import configureLogger from "../../src/config/logger.js";

// Modify Object.prototype for BDD style assertions
should();

describe("/config/logger.js", () => {
  it("should create a Winston logger with the correct configuration", async () => {
    // Call the function under test
    const logger = configureLogger();
    // Assertions
    expect(logger).to.be.an.instanceOf(Object);
    // Default level
    expect(logger.level).to.equal("info");
    // Custom levels
    expect(logger.levels).to.deep.equal({
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      lti: 5,
      debug: 6,
      sql: 7,
      silly: 8,
    });
  });

  it("should create a Winston logger with the correct configuration and custom level", async () => {
    // Call the function under test
    const logger = configureLogger("debug");
    // Assertions
    expect(logger).to.be.an.instanceOf(Object);
    // Default level
    expect(logger.level).to.equal("debug");
    // Custom levels
    expect(logger.levels).to.deep.equal({
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      lti: 5,
      debug: 6,
      sql: 7,
      silly: 8,
    });
  });

  // Test that the logger has the custom sequelizeErrors format
  it("should have the custom sequelizeErrors format", async () => {
    const logger = configureLogger();
    
    // Test this by sending an error through the logger and checking the output
    const error = new Error("Test Sequelize Error");
    error.name = "SequelizeDatabaseError";
    error.parent = { message: "Parent error message"}
    error.sql = "SELECT * FROM test"
    error.parameters = { id: 1 };
    
    // Capture the log output
    let loggedMessage;
    logger.on("data", (log) => {
      loggedMessage = log.message;
    });
    
    // Log the error (using silly instead of error to ensure it gets processed but isn't visible in the console during testing)
    logger.silly(error);
    
    // Wait for the log to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Assertions
    expect(loggedMessage).to.include("Test Sequelize Error");
    expect(loggedMessage).to.include("Parent error message");
    expect(loggedMessage).to.include("SQL: SELECT * FROM test");
    expect(loggedMessage).to.include('Parameters: {"id":1}');
  });

  // Test that the logger will print stack traces for errors
  it("should print stack traces when present", async () => {
    const logger = configureLogger();

    // Capture the log output
    let loggedMessage;
    let loggedStack;
    logger.on("data", (log) => {
      loggedStack = log.stack;
      loggedMessage = log.message;
    });

    function b() {
      throw new Error("Test Stack Error");
    }

    function a() {
        b();
    }
    
    try {
      a();
    } catch (error) {
      // Log the error (using silly instead of error to ensure it gets processed but isn't visible in the console during testing)
      logger.silly(error);
    }
    
    // Wait for the log to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Assertions
    expect(loggedMessage).to.include("Test Stack Error");
    expect(loggedStack).to.include("at b");
    expect(loggedStack).to.include("at a");
  });

  // It should log a message without a stack as well
  it("should log a message without a stack", async () => {
    const logger = configureLogger();

    // Capture the log output
    let loggedMessage;
    let loggedStack;
    logger.on("data", (log) => {
      loggedStack = log.stack;
      loggedMessage = log.message;
    });

    const error = new Error("Test No Stack Error");
    delete error.stack; // Remove the stack trace

    // Log the error (using silly instead of error to ensure it gets processed but isn't visible in the console during testing)
    logger.silly(error);
    
    // Wait for the log to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Assertions
    expect(loggedMessage).to.include("Test No Stack Error");
    expect(loggedStack).to.be.undefined;
  });
});