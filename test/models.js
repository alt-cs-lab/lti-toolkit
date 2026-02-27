/**
 * @file Database Models Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should } from "chai";
import sinon from "sinon";

// Modify Object.prototype for BDD style assertions
should();

// Import unit to test
import configureModels from "../src/models/models.js";
import configureDatabase from "../src/config/database.js";

/**
 * Check that old nonces are expired
 */
const shouldExpireOldNonces = () => {
  it("should expire old nonces", (done) => {
    // Stub Logger
    const logger = {
      error: sinon.stub(),
      info: sinon.stub(),
      lti: sinon.stub(),
      sql: sinon.stub(),
    };

    // Database instance
    const db = configureDatabase(logger, ":memory:");

    // Initialize Models
    const models = configureModels(db, logger);

    db.sync({ force: true }).then(() => {
      db.getQueryInterface()
        .bulkInsert("lti_oauth_nonces", nonces)
        .then(() => {
          const clock = sinon.useFakeTimers({
            now: new Date(),
            shouldClearNativeTimers: true,
          });
          models.initializeExpiration();
          clock.nextAsync().then(() => {
            models.models.OauthNonce.findAll().then((results) => {
              results.length.should.equal(1); // Only the old nonce should remain
              results[0].nonce.should.equal("nonce1");
              clock.restore();
              done();
            });
          });
        });
    });
  });
};

/**
 * Check that old logins are expired
 */
const shouldExpireOldLogins = () => {
  it("should expire old logins", (done) => {
    // Stub Logger
    const logger = {
      error: sinon.stub(),
      info: sinon.stub(),
      lti: sinon.stub(),
      sql: sinon.stub(),
    };

    // Database instance
    const db = configureDatabase(logger, ":memory:");

    // Initialize Models
    const models = configureModels(db, logger);

    db.sync({ force: true }).then(() => {
      db.getQueryInterface()
        .bulkInsert("lti_consumer_logins", logins)
        .then(() => {
          const clock = sinon.useFakeTimers({
            now: new Date(),
            shouldClearNativeTimers: true,
          });
          models.initializeExpiration();
          clock.nextAsync().then(() => {
            models.models.ConsumerLogin.findAll().then((results) => {
              results.length.should.equal(1); // Only the old nonce should remain
              results[0].nonce.should.equal("nonce1");
              clock.restore();
              done();
            });
          });
        });
    });
  });
};

/**
 * Creating a consumer should set a key for that consumer
 */
const consumerShouldSetKey = () => {
  it("should set a key for the consumer", (done) => {
    // Stub Logger
    const logger = {
      error: sinon.stub(),
      info: sinon.stub(),
      lti: sinon.stub(),
      sql: sinon.stub(),
    };

    // Database instance
    const db = configureDatabase(logger, ":memory:");

    // Initialize Models
    const models = configureModels(db, logger);

    db.sync({ force: true }).then(() => {
      models.models.Consumer.create({
        name: "Test Consumer",
      })
        .then((createdConsumer) => {
          createdConsumer.key.should.exist;
          createdConsumer.key.length.should.be.greaterThan(0);
          done();
        })
        .catch((error) => {
          done(error);
        });
    });
  });
};

// Test Fixtures
const now = new Date().toISOString().slice(0, 23).replace("T", " ") + " +00:00";
const old = new Date(Date.now() - 1000 * 60 * 20).toISOString().slice(0, 23).replace("T", " ") + " +00:00";

const nonces = [
  {
    key: "key1",
    nonce: "nonce1",
    createdAt: now,
    updatedAt: now,
  },
  {
    key: "key2",
    nonce: "nonce2",
    createdAt: old,
    updatedAt: old,
  },
];

const logins = [
  {
    key: "key1",
    state: "active",
    nonce: "nonce1",
    iss: "https://example.com",
    client_id: "client1",
    keyset_url: "https://example.com/jwks",
    createdAt: now,
    updatedAt: now,
  },
  {
    key: "key2",
    state: "expired",
    nonce: "nonce2",
    iss: "https://example.com",
    client_id: "client2",
    keyset_url: "https://example.com/jwks",
    createdAt: old,
    updatedAt: old,
  },
];

describe("Models", () => {
  describe("initializeExpiration", () => {
    shouldExpireOldLogins();
    shouldExpireOldNonces();
  });

  describe("Consumer.beforeValidate", () => {
    consumerShouldSetKey();
  });
});
