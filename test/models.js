/**
 * @file Database Models Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should } from "chai";
import sinon from "sinon";

// Modify Object.prototype for BDD style assertions
should();

// Import Library
import LTIToolkit from "../index.js";
const lti = await LTIToolkit({
  domain_name: "http://localhost:3000",
  admin_email: "admin@localhost.local",
  provider: {
    handleLaunch: async function () {},
  },
  consumer: {
    postProviderGrade: async function () {},
    deployment_name: "LTI Toolkit Dev",
    deployment_id: "test-deployment-id",
  },
  test: true, // Indicate that we are in a test environment
});

/**
 * Check that timer is set properly
 */
const shouldInitializeExpiration = (state) => {
  it("should initialize expiration of old records", (done) => {
    const spy = sinon.spy();
    const interval = sinon.stub(global, "setInterval").returns({
      unref: spy,
    });
    state.lti.test.initializeExpiration();
    interval.calledOnce.should.be.true;
    interval.calledOnceWithMatch(sinon.match.func, 5 * 60 * 1000).should.be.true;
    spy.calledOnce.should.be.true;
    done();
  });
};

/**
 * Check that old nonces are expired
 */
const shouldExpireOldNonces = (state) => {
  it("should expire old nonces", (done) => {
    state.lti.test.db
      .getQueryInterface()
      .bulkDelete("lti_oauth_nonces", {}, { truncate: true })
      .then(() => {
        state.lti.test.db
          .getQueryInterface()
          .bulkInsert("lti_oauth_nonces", nonces)
          .then(() => {
            const clock = sinon.useFakeTimers({
              now: new Date(),
              shouldClearNativeTimers: true,
            });
            state.lti.test.initializeExpiration();
            clock.nextAsync().then(() => {
              state.lti.models.OauthNonce.findAll().then((results) => {
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
const shouldExpireOldLogins = (state) => {
  it("should expire old logins", (done) => {
    state.lti.test.db
      .getQueryInterface()
      .bulkDelete("lti_consumer_logins", {}, { truncate: true })
      .then(() => {
        state.lti.test.db
          .getQueryInterface()
          .bulkInsert("lti_consumer_logins", logins)
          .then(() => {
            const clock = sinon.useFakeTimers({
              now: new Date(),
              shouldClearNativeTimers: true,
            });
            state.lti.test.initializeExpiration();
            clock.nextAsync().then(() => {
              state.lti.models.ConsumerLogin.findAll().then((results) => {
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
const consumerShouldSetKey = (state) => {
  it("should set a key for the consumer", (done) => {
    state.lti.models.Consumer.create({
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
  const state = {};

  beforeEach(() => {
    state.lti = lti;
  });

  describe("initializeExpiration", () => {
    shouldInitializeExpiration(state);
    shouldExpireOldLogins(state);
    shouldExpireOldNonces(state);
  });

  describe("Consumer.beforeValidate", () => {
    consumerShouldSetKey(state);
  });
});
