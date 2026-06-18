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

// 32-byte key for AES-256-GCM, used across these tests
const TEST_ENCRYPTION_KEY = Buffer.from("0123456789abcdef".repeat(4), "hex");

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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

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
 * Check that old provider deep links are expired
 */
const shouldExpireOldProviderDeepLinks = () => {
  it("should expire old provider deep links", (done) => {
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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

    db.sync({ force: true }).then(() => {
      db.getQueryInterface()
        .bulkInsert("lti_provider_deep_links", provider_deep_links)
        .then(() => {
          const clock = sinon.useFakeTimers({
            now: new Date(),
            shouldClearNativeTimers: true,
          });
          models.initializeExpiration();
          clock.nextAsync().then(() => {
            models.models.ProviderDeepLink.findAll().then((results) => {
              results.length.should.equal(1); // Only the old token should remain
              results[0].token.should.equal("dltoken1");
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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

    await db.sync({ force: true });

    try {
      await models.models[modelName].create({ ...sample, [field]: "" });
    } catch (error) {
      error.message.should.contain(modelName + "." + field + " cannot be null");
      return;
    }
  });
};

const shouldEncryptSecretAndPrivateAtRest = (modelName, sample) => {
  it("should encrypt secret and private at rest for " + modelName, async () => {
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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

    await db.sync({ force: true });

    const created = await models.models[modelName].create(sample);

    // The model transparently decrypts on access
    created.secret.should.equal(sample.secret);
    created.private.should.equal(sample.private);

    // The value stored in the database is not the plaintext
    const raw = await models.models[modelName].findOne({ where: { key: sample.key }, raw: true });
    raw.secret.should.not.equal(sample.secret);
    raw.private.should.not.equal(sample.private);

    // Re-fetching through the model decrypts again correctly
    const fetched = await models.models[modelName].findOne({ where: { key: sample.key } });
    fetched.secret.should.equal(sample.secret);
    fetched.private.should.equal(sample.private);
  });

  it("should leave a missing private key as null for " + modelName, async () => {
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
    const models = configureModels(db, logger, TEST_ENCRYPTION_KEY);

    await db.sync({ force: true });

    const created = await models.models[modelName].create({ ...sample, private: null });

    (created.private === null || created.private === undefined).should.be.true;
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
    deployment_id: "deployment1",
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
    deployment_id: "deployment2",
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

const provider_deep_links = [
  {
    token: "dltoken1",
    provider_key: "key1",
    createdAt: now,
    updatedAt: now,
  },
  {
    token: "dltoken2",
    provider_key: "key2",
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
    shouldExpireOldProviderDeepLinks();
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
    shouldEncryptSecretAndPrivateAtRest("ConsumerKey", {
      key: "thisisakey",
      secret: "thisisasecret",
      private: "thisisaprivatekey",
    });
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
    shouldEncryptSecretAndPrivateAtRest("ProviderKey", {
      key: "thisisakey",
      secret: "thisisasecret",
      private: "thisisaprivatekey",
    });
  });
});
