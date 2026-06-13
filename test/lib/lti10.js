/**
 * @file LTI 1.0 Utility Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { use, should, expect } from "chai";
import chaiShallowDeepEqual from "chai-shallow-deep-equal";
import chaiString from "chai-string";
import { nanoid } from "nanoid";
import sinon from "sinon";
import crypto from "crypto";
import ky from "ky";
import xml2js from "xml2js";

// NOTE: This uses https://www.npmjs.com/package/oauth-sign
// as a sanity check against my own signing code based on that library
import { hmacsign } from "oauth-sign";

// Import the library to test
import LTI10Utils from "../../src/lib/lti10.js";

// Configure Chai
use(chaiShallowDeepEqual);
use(chaiString);

// Modify Object.prototype for BDD style assertions
should();

const ltiLaunch = {
  oauth_consumer_key: "thisisatestkey",
  oauth_signature_method: "HMAC-SHA1",
  oauth_timestamp: Math.floor(Date.now() / 1000),
  oauth_nonce: nanoid(),
  oauth_version: "1.0",
  lti_message_type: "basic-lti-launch-request",
  lti_version: "LTI-1p0",
  oauth_callback: "about:blank",
  user_id: nanoid(),
  user_image: "https://placehold.co/64x64",
  oauth_signature: "thisisaninvalidsignature",
};

const domain_name = "http://localhost:3000";

/**
 * Sign an LTI Launch Request
 *
 * @param {Object} body - the LTI launch request to sign
 * @returns the signed LTI launch request
 */
const signedBody = function (body) {
  const newBody = { ...body };
  delete newBody.oauth_signature;
  const signature = hmacsign("POST", new URL("/lti/provider/launch", domain_name).href, newBody, "thisisatestsecret");
  newBody.oauth_signature = signature;
  return newBody;
};

/**
 * Build OAuth Header Auth String for testing
 *
 * @param {Object} body - the LTI launch request body to build the header from
 * @returns the OAuth header string
 */
const buildOAuthHeader = function (body) {
  let header = "OAuth ";
  for (const key in body) {
    header += `${encodeURIComponent(key)}="${encodeURIComponent(body[key])}", `;
  }
  return header.slice(0, -2); // Remove trailing comma and space
};

describe("/lib/lti10.js", function () {
  describe("validate10", function () {
    it("should validate a valid LTI 1.0 launch request", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);

      // Call the function to test
      const result = await lti10Utils.validate10({
        body: body,
        method: "POST",
        originalUrl: new URL("/lti/provider/launch", domain_name).href,
      });

      expect(result).to.be.an("object");

      // Assert that the nonce was checked and stored
      sinon.assert.calledWith(models.OauthNonce.findOne, {
        where: {
          key: body.oauth_consumer_key,
          nonce: body.oauth_nonce,
        },
      });
      sinon.assert.calledWith(models.OauthNonce.create, {
        key: body.oauth_consumer_key,
        nonce: body.oauth_nonce,
      });

      // Assert that the consumer key was looked up
      sinon.assert.calledWith(models.ConsumerKey.findByPk, body.oauth_consumer_key);
    });

    it("should reject an invalid LTI 1.0 launch request due to invalid signature", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with an invalid signature
      try {
        await lti10Utils.validate10({
          body: ltiLaunch,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for invalid signature");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid OAuth Signature");
      }
    });

    it("should reject an LTI 1.0 launch request with a reused nonce", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves({ nonce: ltiLaunch.oauth_nonce }),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);

      // Call the function to test with a reused nonce
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for reused nonce");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Duplicate OAuth Nonce Detected");
      }
    });

    it("should reject an LTI 1.0 launch request with an invalid consumer key", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves(null),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);

      // Call the function to test with an invalid consumer key
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for invalid consumer key");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid Consumer Key");
      }
    });

    it("should reject an LTI 1.0 launch request with missing signature", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = { ...ltiLaunch };
      delete body.oauth_signature;

      // Call the function to test with a missing signature
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for missing signature");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: OAuth Signature Missing");
      }
    });

    it("should reject an LTI 1.0 launch request with missing consumer key", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves(null),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);
      delete body.oauth_consumer_key;

      // Call the function to test with a missing consumer key
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for missing consumer key");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: OAuth Consumer Key Missing");
      }
    });

    it("should reject an LTI 1.0 launch request with missing timestamp", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);
      delete body.oauth_timestamp;

      // Call the function to test with a missing timestamp
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for missing timestamp");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: OAuth Timestamp Missing");
      }
    });

    it("should reject an LTI 1.0 launch request with missing nonce", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);
      delete body.oauth_nonce;

      // Call the function to test with a missing nonce
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for missing nonce");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: OAuth Nonce Missing");
      }
    });

    it("should reject an LTI 1.0 launch request with missing signature method", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);
      delete body.oauth_signature_method;

      // Call the function to test with a missing signature method
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for missing signature method");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid OAuth Signature Method");
      }
    });

    it("should reject an LTI 1.0 launch request with unsupported signature method", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);
      body.oauth_signature_method = "PLAINTEXT";

      // Call the function to test with an unsupported signature method
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for unsupported signature method");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid OAuth Signature Method");
      }
    });

    it("should reject an LTI 1.0 launch request with missing OAuth version", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);
      delete body.oauth_version;

      // Call the function to test with a missing OAuth version
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for missing OAuth version");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid OAuth Version");
      }
    });

    it("should reject an LTI 1.0 launch request with unsupported OAuth version", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);
      body.oauth_version = "2.0";

      // Call the function to test with an unsupported OAuth version
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for unsupported OAuth version");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid OAuth Version");
      }
    });

    it("should reject an LTI 1.0 launch request with missing body", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with a missing body
      try {
        await lti10Utils.validate10({
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for missing body");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Request Body Missing");
      }
    });

    it("should reject an LTI 1.0 launch request with missing LTI message type", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const newBody = { ...ltiLaunch };
      delete newBody.lti_message_type;
      const body = signedBody(newBody);

      // Call the function to test with a missing LTI message type
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for missing LTI message type");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid LTI Message Type");
      }
    });

    it("should reject an LTI 1.0 launch request with unsupported LTI message type", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const newBody = { ...ltiLaunch };
      newBody.lti_message_type = "unsupported-message-type";
      const body = signedBody(newBody);

      // Call the function to test with an unsupported LTI message type
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for unsupported LTI message type");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid LTI Message Type");
      }
    });

    it("should reject an LTI 1.0 launch request with an invalid LTI version", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const newBody = { ...ltiLaunch };
      newBody.lti_version = "LTI-2p0";
      const body = signedBody(newBody);

      // Call the function to test with an invalid LTI version
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for invalid LTI version");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid LTI Version");
      }
    });

    it("should reject an LTI 1.0 launch request with missing LTI Version", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const newBody = { ...ltiLaunch };
      delete newBody.lti_version;
      const body = signedBody(newBody);

      // Call the function to test with a missing LTI version
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for missing LTI version");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid LTI Version");
      }
    });

    it("should reject an LTI 1.0 launch request with an invalid OAuth Callback", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);
      body.oauth_callback = "invalid-callback";

      // Call the function to test with an invalid OAuth callback
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for invalid OAuth callback");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid OAuth Callback: invalid-callback");
      }
    });

    it("should reject an LTI 1.0 launch request with an invalid OAuth Timestamp", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);
      body.oauth_timestamp = Math.floor(Date.now() / 1000) + 10000; // Set timestamp far in the future

      // Call the function to test with an invalid OAuth timestamp
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for invalid OAuth timestamp");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: OAuth Timestamp Invalid!");
      }
    });

    it("should reject an LTI 1.0 launch request when unable to store new OAuth Nonce", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves(null), // Simulate failure to store nonce
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody(ltiLaunch);

      // Call the function to test with an invalid OAuth Nonce creation
      try {
        await lti10Utils.validate10({
          body: body,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validate10 to throw an error for unable to store OAuth Nonce");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Unable to save OAuth Nonce - Aborting!");
      }
    });
  });

  describe("validateOauthBody", function () {
    it("should validate a valid OAuth body signed message", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
        ProviderKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {
        silly: sinon.stub(),
      };

      // Stub Crypto Library for consistent testing
      sinon.stub(crypto, "createHash").returns({
        update: sinon.stub().returnsThis(),
        digest: sinon.stub().returns("thisisatestbodyhash"),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody({ oauth_body_hash: "thisisatestbodyhash", ...ltiLaunch });

      // Build the OAuth header for testing
      const oauthHeader = buildOAuthHeader(body);

      // Call the function to test
      const result = await lti10Utils.validateOauthBody({
        headers: {
          authorization: oauthHeader,
        },
        rawBody: "thisisatestbody",
        method: "POST",
        originalUrl: new URL("/lti/provider/launch", domain_name).href,
      });

      expect(result).to.be.an("object");

      // Assert that the nonce was checked and stored
      sinon.assert.calledWith(models.OauthNonce.findOne, {
        where: {
          key: body.oauth_consumer_key,
          nonce: body.oauth_nonce,
        },
      });
      sinon.assert.calledWith(models.OauthNonce.create, {
        key: body.oauth_consumer_key,
        nonce: body.oauth_nonce,
      });

      // Assert that the provider key was looked up
      sinon.assert.calledWith(models.ProviderKey.findByPk, body.oauth_consumer_key);
    });

    it("should reject an OAuth body signed message with an invalid body hash", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
        ProviderKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {
        silly: sinon.stub(),
      };

      // Stub Crypto Library for consistent testing
      sinon.stub(crypto, "createHash").returns({
        update: sinon.stub().returnsThis(),
        digest: sinon.stub().returns("thisisatestbodyhash"),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch but with an invalid body hash
      const body = signedBody({ oauth_body_hash: "invalidbodyhash", ...ltiLaunch });

      // Build the OAuth header for testing
      const oauthHeader = buildOAuthHeader(body);

      // Call the function to test with an invalid body hash
      try {
        await lti10Utils.validateOauthBody({
          headers: {
            authorization: oauthHeader,
          },
          rawBody: "thisisatestbody",
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validateOauthBody to throw an error for invalid body hash");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid OAuth Body Hash");
      }
    });

    it("should reject an OAuth body signed message with a missing body hash", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
        ProviderKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch but with a missing body hash
      const body = signedBody({ ...ltiLaunch });
      delete body.oauth_body_hash;

      // Build the OAuth header for testing
      const oauthHeader = buildOAuthHeader(body);

      // Call the function to test with a missing body hash
      try {
        await lti10Utils.validateOauthBody({
          headers: {
            authorization: oauthHeader,
          },
          rawBody: "thisisatestbody",
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validateOauthBody to throw an error for missing body hash");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Missing OAuth Body Hash");
      }
    });

    it("should reject an OAuth body signed message with a non-string body hash", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
        ProviderKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch but with a non-string body hash
      const body = signedBody({ oauth_body_hash: 12345, ...ltiLaunch });

      // Build the OAuth header for testing
      const oauthHeader = buildOAuthHeader(body);

      // Call the function to test with a non-string body hash
      try {
        await lti10Utils.validateOauthBody({
          headers: {
            authorization: oauthHeader,
          },
          rawBody: "thisisatestbody",
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validateOauthBody to throw an error for non-string body hash");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid OAuth Body Hash");
      }
    });

    it("should reject an OAuth body signed message with a non-string raw body", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
        ProviderKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody({ oauth_body_hash: "thisisatestbodyhash", ...ltiLaunch });

      // Build the OAuth header for testing
      const oauthHeader = buildOAuthHeader(body);

      // Call the function to test with a non-string raw body
      try {
        await lti10Utils.validateOauthBody({
          headers: {
            authorization: oauthHeader,
          },
          rawBody: 12345,
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validateOauthBody to throw an error for non-string raw body");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid Raw Body Format");
      }
    });

    it("should reject an OAuth body signed message with a missing raw body", async function () {
      // Mock Library Dependencies
      const models = {
        OauthNonce: {
          findOne: sinon.stub().resolves(null),
          create: sinon.stub().resolves({
            nonce: ltiLaunch.oauth_nonce,
          }),
        },
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
        ProviderKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a valid signature for the test launch
      const body = signedBody({ oauth_body_hash: "thisisatestbodyhash", ...ltiLaunch });

      // Build the OAuth header for testing
      const oauthHeader = buildOAuthHeader(body);

      // Call the function to test with a missing raw body
      try {
        await lti10Utils.validateOauthBody({
          headers: {
            authorization: oauthHeader,
          },
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validateOauthBody to throw an error for missing raw body");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Raw Body Missing");
      }
    });

    it("should reject an OAuth body signed message with a missing Authorization header", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with a missing Authorization header
      try {
        await lti10Utils.validateOauthBody({
          headers: {},
          rawBody: "thisisatestbody",
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validateOauthBody to throw an error for missing Authorization header");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Missing Authorization Header");
      }
    });

    it("should reject an OAuth body signed message with an invalid Authorization header format", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with an invalid Authorization header format
      try {
        await lti10Utils.validateOauthBody({
          headers: {
            authorization: "InvalidAuthHeader",
          },
          rawBody: "thisisatestbody",
          method: "POST",
          originalUrl: new URL("/lti/provider/launch", domain_name).href,
        });
        throw new Error("Expected validateOauthBody to throw an error for invalid Authorization header format");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Invalid Authorization Header Format");
      }
    });
  });

  describe("postOutcome", function () {
    it("should post an outcome successfully", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Stub the HTTP request through ky
      sinon.stub(ky, "post").resolves({
        status: 200,
        text: sinon.stub().resolves(
          "<imsx_POXEnvelopeResponse>\n\
            <imsx_POXHeader>\n\
              <imsx_POXResponseHeaderInfo>\n\
                <imsx_statusInfo>\n\
                  <imsx_codeMajor>success</imsx_codeMajor>\n\
                </imsx_statusInfo>\n\
              </imsx_POXResponseHeaderInfo>\n\
            </imsx_POXHeader>\n\
          </imsx_POXEnvelopeResponse>",
        ),
      });

      // Call the function to test
      const result = await lti10Utils.postOutcome("thisisagradeid", 0.95, "thisisatestkey", "http://example.com/grade");

      expect(result).to.be.true;

      // Assert that the ConsumerKey was looked up
      sinon.assert.calledWith(models.ConsumerKey.findByPk, "thisisatestkey");

      // Assert that the HTTP request was made with the correct parameters
      sinon.assert.calledWith(
        ky.post,
        "http://example.com/grade",
        sinon.match({
          headers: {
            "Content-Type": "application/xml",
            Authorization: sinon.match.string,
          },
          body: sinon.match.string,
        }),
      );

      const body = ky.post.getCall(0).args[1].body;
      expect(body).to.include("<sourcedId>thisisagradeid</sourcedId>");
      expect(body).to.include("<textString>0.95</textString>");
    });

    it("should reject an outcome post with an invalid Consumer Key", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerKey: {
          findByPk: sinon.stub().resolves(null), // Simulate invalid consumer key
        },
      };
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with an invalid Consumer Key
      try {
        await lti10Utils.postOutcome("thisisagradeid", 0.95, "invalidkey", "http://example.com/grade");
        throw new Error("Expected postOutcome to throw an error for invalid Consumer Key");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Error: Invalid Consumer Key");
      }
    });

    it("should reject an outcome post with a non-success response from the LMS", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Stub the HTTP request through ky to return a non-success response
      sinon.stub(ky, "post").resolves({
        status: 200,
        text: sinon.stub().resolves(
          "<imsx_POXEnvelopeResponse>\n\
            <imsx_POXHeader>\n\
              <imsx_POXResponseHeaderInfo>\n\
                <imsx_statusInfo>\n\
                  <imsx_codeMajor>failure</imsx_codeMajor>\n\
                </imsx_statusInfo>\n\
              </imsx_POXResponseHeaderInfo>\n\
            </imsx_POXHeader>\n\
          </imsx_POXEnvelopeResponse>",
        ),
      });

      // Call the function to test with a non-success response from the LMS
      try {
        await lti10Utils.postOutcome("thisisagradeid", 0.95, "thisisatestkey", "http://example.com/grade");
        throw new Error("Expected postOutcome to throw an error for non-success response from LMS");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.startWith("Failed to post grade: ");
      }
    });

    it("should reject an outcome post when the HTTP request fails", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerKey: {
          findByPk: sinon.stub().resolves({
            key: "thisisatestkey",
            secret: "thisisatestsecret",
          }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Stub the HTTP request through ky to simulate a failure
      sinon.stub(ky, "post").resolves({
        status: 500,
        statusText: "Internal Server Error",
      });

      // Call the function to test with a simulated HTTP request failure
      try {
        await lti10Utils.postOutcome("thisisagradeid", 0.95, "thisisatestkey", "http://example.com/grade");
        throw new Error("Expected postOutcome to throw an error for HTTP request failure");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Failed to post grade: HTTP 500 - Internal Server Error");
      }
    });
  });

  describe("buildResponse", async function () {
    it("should build a valid LTI 1.0 response", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test
      const result = await lti10Utils.buildResponse(
        "success",
        "status",
        "Description",
        {
          key: "thisisatestkey",
          secret: "thisisatestsecret",
        },
        "http://example.com/grade",
        "thisisamessageid",
        "operationID",
        "body",
      );

      // Assert that the response is correctly structured
      expect(result).to.be.a("object");
      expect(result).to.have.property("content");
      expect(result).to.have.property("headers");
      expect(result.headers).to.startWith('OAuth oauth_consumer_key="thisisatestkey"');
      expect(result.content).to.include("<imsx_codeMajor>success</imsx_codeMajor>");
      expect(result.content).to.include("<imsx_severity>status</imsx_severity>");
      expect(result.content).to.include("<imsx_description>Description</imsx_description>");
      expect(result.content).to.include("<imsx_messageRefIdentifier>thisisamessageid</imsx_messageRefIdentifier>");
      expect(result.content).to.include("<imsx_operationRefIdentifier>operationID</imsx_operationRefIdentifier>");
      expect(result.content).to.include("<imsx_POXBody>body</imsx_POXBody>");
    });

    it("should build a valid LTI 1.0 response with missing optional parameters", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test
      const result = await lti10Utils.buildResponse(
        "success",
        "status",
        "Description",
        {
          key: "thisisatestkey",
          secret: "thisisatestsecret",
        },
        "http://example.com/grade",
        null,
        null,
        null,
      );

      // Assert that the response is correctly structured
      expect(result).to.be.a("object");
      expect(result).to.have.property("content");
      expect(result).to.have.property("headers");
      expect(result.headers).to.startWith('OAuth oauth_consumer_key="thisisatestkey"');
      expect(result.content).to.include("<imsx_codeMajor>success</imsx_codeMajor>");
      expect(result.content).to.include("<imsx_severity>status</imsx_severity>");
      expect(result.content).to.include("<imsx_description>Description</imsx_description>");
      expect(result.content).to.include("<imsx_messageRefIdentifier>unknown</imsx_messageRefIdentifier>");
      expect(result.content).to.include("<imsx_operationRefIdentifier>unknown</imsx_operationRefIdentifier>");
      expect(result.content).to.include("<imsx_POXBody/>");
    });
  });

  const basicOutcomesRequest = {
    imsx_poxenveloperequest: {
      $: {
        xmlns: "http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0",
      },
      imsx_poxheader: {
        imsx_poxrequestheaderinfo: {
          imsx_version: "V1.0",
          imsx_messageidentifier: "123456789",
        },
      },
      imsx_poxbody: "body",
    },
  };

  describe("validateBasicOutcomesRequest", function () {
    it("should validate a valid basic outcomes request", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test
      const result = await lti10Utils.validateBasicOutcomesRequest({
        body: basicOutcomesRequest,
      });

      // Assert that the request is valid
      expect(result).to.be.a("object");
      expect(result).to.have.property("message_id", "123456789");
      expect(result).to.have.property("body", "body");
    });

    it("should reject a basic outcomes request with an invalid body structure", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with an invalid body structure
      try {
        await lti10Utils.validateBasicOutcomesRequest({
          body: {
            invalid: "structure",
          },
        });
        throw new Error("Expected validateBasicOutcomesRequest to throw an error for invalid body structure");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Basic Outcomes: Invalid Envelope Request");
      }
    });

    it("should reject a basic outcomes request with an incorrect xmlns attribute", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with an incorrect xmlns attribute
      const invalidRequest = JSON.parse(JSON.stringify(basicOutcomesRequest));
      invalidRequest.imsx_poxenveloperequest.$.xmlns = "http://www.invalid-namespace.org/invalid";

      // Call the function to test with an incorrect xmlns attribute
      try {
        await lti10Utils.validateBasicOutcomesRequest({
          body: invalidRequest,
        });
        throw new Error("Expected validateBasicOutcomesRequest to throw an error for incorrect xmlns attribute");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Basic Outcomes: Invalid Envelope Request");
      }
    });

    it("should reject a basic outcomes request with a missing header", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing header
      const invalidRequest = JSON.parse(JSON.stringify(basicOutcomesRequest));
      delete invalidRequest.imsx_poxenveloperequest.imsx_poxheader;

      // Call the function to test with a missing header
      try {
        await lti10Utils.validateBasicOutcomesRequest({
          body: invalidRequest,
        });
        throw new Error("Expected validateBasicOutcomesRequest to throw an error for missing header");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Basic Outcomes: Invalid Envelope Header");
      }
    });

    it("should reject a basic outcomes request with a missing header info", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing header
      const invalidRequest = JSON.parse(JSON.stringify(basicOutcomesRequest));
      delete invalidRequest.imsx_poxenveloperequest.imsx_poxheader.imsx_poxrequestheaderinfo;

      // Call the function to test with a missing header
      try {
        await lti10Utils.validateBasicOutcomesRequest({
          body: invalidRequest,
        });
        throw new Error("Expected validateBasicOutcomesRequest to throw an error for missing header");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Basic Outcomes: Invalid Envelope Header Info");
      }
    });

    it("should reject a basic outcomes request with a missing imsx_version", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing imsx_version
      const invalidRequest = JSON.parse(JSON.stringify(basicOutcomesRequest));
      delete invalidRequest.imsx_poxenveloperequest.imsx_poxheader.imsx_poxrequestheaderinfo.imsx_version;

      // Call the function to test with a missing imsx_version
      try {
        await lti10Utils.validateBasicOutcomesRequest({
          body: invalidRequest,
        });
        throw new Error("Expected validateBasicOutcomesRequest to throw an error for missing imsx_version");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Basic Outcomes: Invalid Envelope Version");
      }
    });

    it("should reject a basic outcomes request with an invalid imsx_version", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with an invalid imsx_version
      const invalidRequest = JSON.parse(JSON.stringify(basicOutcomesRequest));
      invalidRequest.imsx_poxenveloperequest.imsx_poxheader.imsx_poxrequestheaderinfo.imsx_version = "InvalidVersion";

      // Call the function to test with an invalid imsx_version
      try {
        await lti10Utils.validateBasicOutcomesRequest({
          body: invalidRequest,
        });
        throw new Error("Expected validateBasicOutcomesRequest to throw an error for invalid imsx_version");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Basic Outcomes: Invalid Envelope Version");
      }
    });

    it("should reject a basic outcomes request with a missing message identifier", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing message identifier
      const invalidRequest = JSON.parse(JSON.stringify(basicOutcomesRequest));
      delete invalidRequest.imsx_poxenveloperequest.imsx_poxheader.imsx_poxrequestheaderinfo.imsx_messageidentifier;

      // Call the function to test with a missing message identifier
      try {
        await lti10Utils.validateBasicOutcomesRequest({
          body: invalidRequest,
        });
        throw new Error("Expected validateBasicOutcomesRequest to throw an error for missing message identifier");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Basic Outcomes: Invalid Envelope Message Identifier");
      }
    });

    it("should reject a basic outcomes request with an invalid message identifier", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with an invalid message identifier
      const invalidRequest = JSON.parse(JSON.stringify(basicOutcomesRequest));
      invalidRequest.imsx_poxenveloperequest.imsx_poxheader.imsx_poxrequestheaderinfo.imsx_messageidentifier = ""; // Set to empty string which is invalid

      // Call the function to test with an invalid message identifier
      try {
        await lti10Utils.validateBasicOutcomesRequest({
          body: invalidRequest,
        });
        throw new Error("Expected validateBasicOutcomesRequest to throw an error for invalid message identifier");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Basic Outcomes: Invalid Envelope Message Identifier");
      }
    });

    it("should reject a basic outcomes request with a missing body", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing body
      const invalidRequest = JSON.parse(JSON.stringify(basicOutcomesRequest));
      delete invalidRequest.imsx_poxenveloperequest.imsx_poxbody;

      // Call the function to test with a missing body
      try {
        await lti10Utils.validateBasicOutcomesRequest({
          body: invalidRequest,
        });
        throw new Error("Expected validateBasicOutcomesRequest to throw an error for missing body");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Basic Outcomes: Invalid Envelope Body");
      }
    });
  });

  const replaceResultRequest = {
    resultrecord: {
      result: {
        resultscore: {
          textstring: "0.95",
        },
      },
      sourcedguid: {
        sourcedid: "thisisagradeid",
      },
    },
  };

  describe("validateReplaceResultRequest", function () {
    it("should validate a valid replace result request", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test
      const result = await lti10Utils.validateReplaceResultRequest(replaceResultRequest);

      // Assert that the request is valid
      expect(result).to.be.a("object");
      expect(result).to.have.property("score", "0.95");
      expect(result).to.have.property("sourcedIdValue", "thisisagradeid");
    });

    it("should reject a replace result request with a missing score", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing score
      const invalidRequest = JSON.parse(JSON.stringify(replaceResultRequest));
      delete invalidRequest.resultrecord.result.resultscore.textstring;

      // Call the function to test with a missing score
      try {
        await lti10Utils.validateReplaceResultRequest(invalidRequest);
        throw new Error("Expected validateReplaceResultRequest to throw an error for missing score");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Replace Result: Missing Result Score Value");
      }
    });

    it("should reject a replace result request with a missing sourcedId", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing sourcedId
      const invalidRequest = JSON.parse(JSON.stringify(replaceResultRequest));
      delete invalidRequest.resultrecord.sourcedguid.sourcedid;

      // Call the function to test with a missing sourcedId
      try {
        await lti10Utils.validateReplaceResultRequest(invalidRequest);
        throw new Error("Expected validateReplaceResultRequest to throw an error for missing sourcedId");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Replace Result: Missing Result Source ID Value");
      }
    });

    it("should reject a replace result request with an invalid score value", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with an invalid score value
      const invalidRequest = JSON.parse(JSON.stringify(replaceResultRequest));
      invalidRequest.resultrecord.result.resultscore.textstring = "invalidscore";

      // Call the function to test with an invalid score value
      try {
        await lti10Utils.validateReplaceResultRequest(invalidRequest);
        throw new Error("Expected validateReplaceResultRequest to throw an error for invalid score value");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Replace Result: Invalid Result Score Value: invalidscore");
      }
    });

    it("should reject a replace result request with a missing resultrecord", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing resultrecord
      const invalidRequest = JSON.parse(JSON.stringify(replaceResultRequest));
      delete invalidRequest.resultrecord;

      // Call the function to test with a missing resultrecord
      try {
        await lti10Utils.validateReplaceResultRequest(invalidRequest);
        throw new Error("Expected validateReplaceResultRequest to throw an error for missing resultrecord");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Replace Result: Missing Result Record");
      }
    });

    it("should reject a replace result request with a missing result", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing result
      const invalidRequest = JSON.parse(JSON.stringify(replaceResultRequest));
      delete invalidRequest.resultrecord.result;

      // Call the function to test with a missing result
      try {
        await lti10Utils.validateReplaceResultRequest(invalidRequest);
        throw new Error("Expected validateReplaceResultRequest to throw an error for missing result");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Replace Result: Missing Result");
      }
    });

    it("should reject a replace result request with a missing result score", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing result score
      const invalidRequest = JSON.parse(JSON.stringify(replaceResultRequest));
      delete invalidRequest.resultrecord.result.resultscore;

      // Call the function to test with a missing result score
      try {
        await lti10Utils.validateReplaceResultRequest(invalidRequest);
        throw new Error("Expected validateReplaceResultRequest to throw an error for missing result score");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Replace Result: Missing Result Score");
      }
    });

    it("should reject a replace result request with a missing sourcedguid", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {};

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Create a request body with a missing sourcedguid
      const invalidRequest = JSON.parse(JSON.stringify(replaceResultRequest));
      delete invalidRequest.resultrecord.sourcedguid;

      // Call the function to test with a missing sourcedguid
      try {
        await lti10Utils.validateReplaceResultRequest(invalidRequest);
        throw new Error("Expected validateReplaceResultRequest to throw an error for missing sourcedguid");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Replace Result: Missing Result Source ID");
      }
    });
  });

  const validConfigXML = `
  <cartridge_basiclti_link 
  xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0" 
  xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0" 
  xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0" 
  xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imslticc_v1p0 
    http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd 
    http://www.imsglobal.org/xsd/imsbasiclti_v1p0 
    http://www.imsglobal.org/xsd/lti/ltiv1p0/imsbasiclti_v1p0.xsd 
    http://www.imsglobal.org/xsd/imslticm_v1p0 
    http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticm_v1p0.xsd 
    http://www.imsglobal.org/xsd/imslticp_v1p0 
    http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticp_v1p0.xsd"
  >
  <blti:title>LTI Toolkit</blti:title>
  <blti:description>LTI Toolkit for LTI Tool Providers</blti:description>
  <blti:icon>https://placehold.co/64x64.png</blti:icon>
  <blti:launch_url>https://ltidemo.home.russfeld.me/lti/provider/launch10</blti:launch_url>
  <blti:custom>
    <lticm:property name="custom_name">custom_value</lticm:property>
    <lticm:property name="custom_name2">custom_value2</lticm:property>
  </blti:custom>
  <blti:extensions platform="canvas.instructure.com">
    <lticm:property name="tool_id">lti_toolkit</lticm:property>
    <lticm:property name="privacy_level">public</lticm:property>
    <lticm:property name="domain">ltidemo.home.russfeld.me</lticm:property>
  </blti:extensions>
  <cartridge_bundle identifierref="BLTI001_Bundle"/>
  <cartridge_icon identifierref="BLTI001_Icon"/>
</cartridge_basiclti_link>
`;

  describe("validateConfigXML", function () {
    it("should validate a valid config XML", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test
      const result = await lti10Utils.validateConfigXML(validConfigXML);

      // Assert that the config XML is valid and correctly parsed
      expect(result).to.be.a("object");
      expect(result).to.deep.equal({
        title: "LTI Toolkit",
        description: "LTI Toolkit for LTI Tool Providers",
        icon: "https://placehold.co/64x64.png",
        launch_url: "https://ltidemo.home.russfeld.me/lti/provider/launch10",
        custom: {
          custom_name: "custom_value",
          custom_name2: "custom_value2",
        },
        extensions: {
          tool_id: "lti_toolkit",
          privacy_level: "public",
          domain: "ltidemo.home.russfeld.me",
        },
      });
    });

    it("should throw an error if xml and url are not provided", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test without xml or url
      try {
        await lti10Utils.validateConfigXML();
        throw new Error("Expected validateConfigXML to throw an error when xml and url are not provided");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Validation Error: Missing XML Configuration and URL");
      }
    });

    it("should throw an error if the XML is invalid", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with invalid XML
      try {
        await lti10Utils.validateConfigXML("invalidxml");
        throw new Error("Expected validateConfigXML to throw an error for invalid XML");
      } catch (err) {
        expect(err).to.be.an("error");
        // catch assertion error from xml2js if the XML is not well-formed
        expect(err.message).to.match(/Unexpected end|Non-whitespace before first tag|Invalid character/);
      }
    });

    it("should throw an error if the XML is missing the root element", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub xmljs library to return a parsed XML object that is missing required fields
      sinon.stub(xml2js, "Parser").returns({
        parseStringPromise: sinon.stub().resolves({
          // Return an empty object to simulate missing required fields
        }),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with XML missing required fields
      try {
        await lti10Utils.validateConfigXML(validConfigXML);
        throw new Error("Expected validateConfigXML to throw an error for XML missing required fields");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Invalid LTI Configuration: Missing Root Element");
      }

      // Restore the original xml2js behavior for other tests
      xml2js.Parser.restore();
    });

    it("should throw an error if the XML is missing namespace elements", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub xmljs library to return a parsed XML object that is missing required fields
      sinon.stub(xml2js, "Parser").returns({
        parseStringPromise: sinon.stub().resolves({
          cartridge_basiclti_link: {
            $: {
              // Missing xmlns attribute to simulate missing namespace elements
            },
            // Missing other required elements
          },
        }),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with XML missing required fields
      try {
        await lti10Utils.validateConfigXML(validConfigXML);
        throw new Error("Expected validateConfigXML to throw an error for XML missing required fields");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Invalid LTI Configuration: Missing Namespace");
      }

      // Restore the original xml2js behavior for other tests
      xml2js.Parser.restore();
    });

    it("should throw an error if the XML has incorrect namespace", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub xmljs library to return a parsed XML object that is missing required fields
      sinon.stub(xml2js, "Parser").returns({
        parseStringPromise: sinon.stub().resolves({
          cartridge_basiclti_link: {
            $: {
              // Incorrect xmlns attribute to simulate incorrect namespace
              xmlns: "http://www.imsglobal.org/xsd/lti/lti_v1p0",
            },
            // Missing other required elements
          },
        }),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with XML missing required fields
      try {
        await lti10Utils.validateConfigXML(validConfigXML);
        throw new Error("Expected validateConfigXML to throw an error for XML missing required fields");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Invalid LTI Configuration: Invalid Namespace");
      }

      // Restore the original xml2js behavior for other tests
      xml2js.Parser.restore();
    });

    it("should throw an error if the XML is missing title", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub xmljs library to return a parsed XML object that is missing required fields
      sinon.stub(xml2js, "Parser").returns({
        parseStringPromise: sinon.stub().resolves({
          cartridge_basiclti_link: {
            $: {
              xmlns: "http://www.imsglobal.org/xsd/imslticc_v1p0",
            },
            // Missing other required elements
          },
        }),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with XML missing required fields
      try {
        await lti10Utils.validateConfigXML(validConfigXML);
        throw new Error("Expected validateConfigXML to throw an error for XML missing required fields");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Invalid LTI Configuration: Missing Title");
      }

      // Restore the original xml2js behavior for other tests
      xml2js.Parser.restore();
    });

    it("should throw an error if the XML is missing description", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub xmljs library to return a parsed XML object that is missing required fields
      sinon.stub(xml2js, "Parser").returns({
        parseStringPromise: sinon.stub().resolves({
          cartridge_basiclti_link: {
            $: {
              xmlns: "http://www.imsglobal.org/xsd/imslticc_v1p0",
            },
            "blti:title": "LTI Toolkit",
            // Missing other required elements
          },
        }),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with XML missing required fields
      try {
        await lti10Utils.validateConfigXML(validConfigXML);
        throw new Error("Expected validateConfigXML to throw an error for XML missing required fields");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Invalid LTI Configuration: Missing Description");
      }

      // Restore the original xml2js behavior for other tests
      xml2js.Parser.restore();
    });

    it("should throw an error if the XML is missing icon", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub xmljs library to return a parsed XML object that is missing required fields
      sinon.stub(xml2js, "Parser").returns({
        parseStringPromise: sinon.stub().resolves({
          cartridge_basiclti_link: {
            $: {
              xmlns: "http://www.imsglobal.org/xsd/imslticc_v1p0",
            },
            "blti:title": "LTI Toolkit",
            "blti:description": "LTI Toolkit Description",
            // Missing other required elements
          },
        }),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with XML missing required fields
      try {
        await lti10Utils.validateConfigXML(validConfigXML);
        throw new Error("Expected validateConfigXML to throw an error for XML missing required fields");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Invalid LTI Configuration: Missing Icon");
      }

      // Restore the original xml2js behavior for other tests
      xml2js.Parser.restore();
    });

    it("should throw an error if the XML is missing launch url", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub xmljs library to return a parsed XML object that is missing required fields
      sinon.stub(xml2js, "Parser").returns({
        parseStringPromise: sinon.stub().resolves({
          cartridge_basiclti_link: {
            $: {
              xmlns: "http://www.imsglobal.org/xsd/imslticc_v1p0",
            },
            "blti:title": "LTI Toolkit",
            "blti:description": "LTI Toolkit Description",
            "blti:icon": "LTI Toolkit Icon",
            // Missing other required elements
          },
        }),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with XML missing required fields
      try {
        await lti10Utils.validateConfigXML(validConfigXML);
        throw new Error("Expected validateConfigXML to throw an error for XML missing required fields");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Invalid LTI Configuration: Missing Launch URL");
      }

      // Restore the original xml2js behavior for other tests
      xml2js.Parser.restore();
    });

    it("should handle non-arrays of custom properties and extensions", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub xmljs library to return a parsed XML object with arrays for custom properties and extensions
      sinon.stub(xml2js, "Parser").returns({
        parseStringPromise: sinon.stub().resolves({
          cartridge_basiclti_link: {
            $: {
              xmlns: "http://www.imsglobal.org/xsd/imslticc_v1p0",
            },
            "blti:title": "LTI Toolkit",
            "blti:description": "LTI Toolkit Description",
            "blti:icon": "LTI Toolkit Icon",
            "blti:launch_url": "https://example.com/launch",
            "blti:custom": {
              "lticm:property": {
                $: { name: "custom_name1" },
                _: "custom_value1",
              },
            },
            "blti:extensions": {
              $: { platform: "canvas.instructure.com" },
              "lticm:property": {
                $: { name: "tool_id" },
                _: "lti_toolkit",
              },
            },
          },
        }),
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test
      const result = await lti10Utils.validateConfigXML(validConfigXML);

      // Assert that the config XML is valid and correctly parsed with arrays
      expect(result).to.be.a("object");
      expect(result).to.deep.equal({
        title: "LTI Toolkit",
        description: "LTI Toolkit Description",
        icon: "LTI Toolkit Icon",
        launch_url: "https://example.com/launch",
        custom: {
          custom_name1: "custom_value1",
        },
        extensions: {
          tool_id: "lti_toolkit",
        },
      });

      // Restore the original xml2js behavior for other tests
      xml2js.Parser.restore();
    });

    it("should read XML from given URL", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub ky to return the validConfigXML when the URL is requested
      sinon.stub(ky, "get").resolves({
        status: 200,
        text: async () => validConfigXML,
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with a URL instead of XML
      const result = await lti10Utils.validateConfigXML(null, "https://example.com/config.xml");

      // Assert that the config XML is valid and correctly parsed
      expect(ky.get.calledWith("https://example.com/config.xml")).to.be.true;
      expect(result).to.be.a("object");
      expect(result).to.deep.equal({
        title: "LTI Toolkit",
        description: "LTI Toolkit for LTI Tool Providers",
        icon: "https://placehold.co/64x64.png",
        launch_url: "https://ltidemo.home.russfeld.me/lti/provider/launch10",
        custom: {
          custom_name: "custom_value",
          custom_name2: "custom_value2",
        },
        extensions: {
          tool_id: "lti_toolkit",
          privacy_level: "public",
          domain: "ltidemo.home.russfeld.me",
        },
      });

      // Restore the original ky behavior for other tests
      ky.get.restore();
    });

    it("should throw an error if fetching XML from URL fails", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub ky to simulate a failed fetch request
      sinon.stub(ky, "get").rejects(new Error("Network Error"));

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with a URL that fails to fetch
      try {
        await lti10Utils.validateConfigXML(null, "https://example.com/config.xml");
        throw new Error("Expected validateConfigXML to throw an error when fetching XML from URL fails");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Failed to fetch XML from URL: Network Error");
      }

      // Restore the original ky behavior for other tests
      ky.get.restore();
    });

    it("should throw an error if the response is not 200", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        silly: sinon.stub(),
      };

      // Stub ky to return a non-200 status when the URL is requested
      sinon.stub(ky, "get").resolves({
        status: 404,
        statusText: "Not Found",
        text: async () => "Not Found",
      });

      // Instantiate library
      const lti10Utils = new LTI10Utils(models, logger, domain_name);

      // Call the function to test with a URL that returns a non-200 status
      try {
        await lti10Utils.validateConfigXML(null, "https://example.com/config.xml");
        throw new Error("Expected validateConfigXML to throw an error when response status is not 200");
      } catch (err) {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Failed to fetch XML from URL: HTTP 404 - Not Found");
      }

      // Restore the original ky behavior for other tests
      ky.get.restore();
    });
  });
});
