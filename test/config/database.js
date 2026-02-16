/**
 * @file /config/database.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should, expect } from "chai";
import sinon from "sinon";

// Load module under test
import configureDatabase from "../../src/config/database.js";

// Modify Object.prototype for BDD style assertions
should();

describe("/config/database.js", () => {
  it("should create a Sequelize instance with the correct configuration", async () => {
    // Create spy for logger.sql.bind
    const logger = { sql: { bind: sinon.spy() } };
    // Call the function under test
    const sequelize = configureDatabase(logger, ":memory:");
    // Assertions
    expect(sequelize).to.be.an.instanceOf(Object);
    expect(sequelize.options.dialect).to.equal("sqlite");
    expect(sequelize.options.storage).to.equal(":memory:");
    expect(logger.sql.bind.calledOnce).to.be.true;
    expect(sequelize.options.pool).to.deep.equal({ max: 1, idle: Infinity, maxUses: Infinity });
  });

  it("should create a Sequelize instance with the correct configuration using default file", async () => {
    // Create spy for logger.sql.bind
    const logger = { sql: { bind: sinon.spy() } };
    // Call the function under test
    const sequelize = configureDatabase(logger);
    // Assertions
    expect(sequelize).to.be.an.instanceOf(Object);
    expect(sequelize.options.dialect).to.equal("sqlite");
    expect(sequelize.options.storage).to.equal("lti-toolkit.db");
    expect(logger.sql.bind.calledOnce).to.be.true;
    expect(sequelize.options.pool).to.deep.equal({ max: 1, idle: Infinity, maxUses: Infinity });
  });
});
