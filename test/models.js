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
  it("should expire old consumer logins", (done) => {
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
 * Check that old provider logins are expired
 */
const shouldExpireOldProviderLogins = () => {
  it("should expire old provider logins", (done) => {
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
        .bulkInsert("lti_provider_logins", provider_logins)
        .then(() => {
          const clock = sinon.useFakeTimers({
            now: new Date(),
            shouldClearNativeTimers: true,
          });
          models.initializeExpiration();
          clock.nextAsync().then(() => {
            models.models.ProviderLogin.findAll().then((results) => {
              results.length.should.equal(1); // Only the old hint should remain
              results[0].login_hint.should.equal("hint1");
              clock.restore();
              done();
            });
          });
        });
    });
  });
};

/**
 * Check that old provider registrations are expired
 */
const shouldExpireOldProviderRegistrations = () => {
  it("should expire old provider registrations", (done) => {
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
        .bulkInsert("lti_provider_registrations", provider_registrations)
        .then(() => {
          const clock = sinon.useFakeTimers({
            now: new Date(),
            shouldClearNativeTimers: true,
          });
          models.initializeExpiration();
          clock.nextAsync().then(() => {
            models.models.ProviderRegistration.findAll().then((results) => {
              results.length.should.equal(1); // Only the old token should remain
              results[0].token.should.equal("token1");
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

/**
 * Creating a provider should set a client ID and deployment ID for that provider
 */
const providerShouldSetClientID = () => {
  it("should set a client ID for the provider", (done) => {
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
      models.models.Provider.create({
        name: "Test Provider",
        key: "test-key",
        launch_url: "https://example.com/launch",
        domain: "example.com",
      })
        .then((createdProvider) => {
          createdProvider.client_id.should.exist;
          createdProvider.client_id.length.should.be.greaterThan(0);
          createdProvider.deployment_id.should.exist;
          createdProvider.deployment_id.length.should.be.greaterThan(0);
          done();
        })
        .catch((error) => {
          done(error);
        });
    });
  });
};

const shouldForceEmptyFieldsToNull = (field, modelName, sample) => {
  it("should force empty " + field + " in " + modelName + " to null", async () => {
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

    await db.sync({ force: true });

    try {
      await models.models[modelName].create({ ...sample, [field]: "" });
    } catch (error) {
      error.message.should.contain(modelName + "." + field + " cannot be null");
      return;
    }
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

const provider_logins = [
  {
    client_id: "client1",
    login_hint: "hint1",
    createdAt: now,
    updatedAt: now,
  },
  {
    client_id: "client2",
    login_hint: "hint2",
    createdAt: old,
    updatedAt: old,
  },
];

const provider_registrations = [
  {
    token: "token1",
    url: "https://example.com/register",
    createdAt: now,
    updatedAt: now,
  },
  {
    token: "token2",
    url: "https://example.com/register",
    createdAt: old,
    updatedAt: old,
  },
];

describe("Models", () => {
  describe("initializeExpiration", () => {
    shouldExpireOldLogins();
    shouldExpireOldNonces();
    shouldExpireOldProviderLogins();
    shouldExpireOldProviderRegistrations();
  });

  describe("Consumer.beforeValidate", () => {
    consumerShouldSetKey();
  });

  describe("Consumer", () => {
    const sampleConsumer = {
      name: "Test Consumer",
      lti13: false,
    };
    shouldForceEmptyFieldsToNull("name", "Consumer", sampleConsumer);
  });

  describe("ConsumerKey", () => {
    const sampleConsumerKey = {
      key: "thisisakey",
      secret: "thisisasecret",
    };
    shouldForceEmptyFieldsToNull("key", "ConsumerKey", sampleConsumerKey);
    shouldForceEmptyFieldsToNull("secret", "ConsumerKey", sampleConsumerKey);
  });

  describe("Provider", () => {
    const sampleProvider = {
      name: "Test Provider",
      key: "thisisakey",
      launch_url: "https://example.com/launch",
      domain: "example.com",
    };
    shouldForceEmptyFieldsToNull("name", "Provider", sampleProvider);
    shouldForceEmptyFieldsToNull("key", "Provider", sampleProvider);
    shouldForceEmptyFieldsToNull("launch_url", "Provider", sampleProvider);
    shouldForceEmptyFieldsToNull("domain", "Provider", sampleProvider);
  });

  describe("Provider.beforeValidate", () => {
    providerShouldSetClientID();
  });

  describe("ProviderKey", () => {
    const sampleProviderKey = {
      key: "thisisakey",
      secret: "thisisasecret",
    };
    shouldForceEmptyFieldsToNull("key", "ProviderKey", sampleProviderKey);
    shouldForceEmptyFieldsToNull("secret", "ProviderKey", sampleProviderKey);
  });
});
