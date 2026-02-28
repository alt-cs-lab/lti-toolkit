/**
 * @file LTI 1.3 Utility Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { use, should, expect } from "chai";
import chaiShallowDeepEqual from "chai-shallow-deep-equal";
import { nanoid } from "nanoid";
import sinon from "sinon";
import jsonwebtoken from "jsonwebtoken";
import crypto from "crypto";
import { JwksClient } from "jwks-rsa";
import ky from "ky";

// Configure Chai
use(chaiShallowDeepEqual);

// Modify Object.prototype for BDD style assertions
should();

// Load unit under test
import LTI13Utils from "../../src/lib/lti13.js";

const loginHint = nanoid();
const ltiMessageHint = nanoid();

const authRequestData = {
  iss: "https://canvas.instructure.com/",
  login_hint: loginHint,
  client_id: "10000000000001",
  lti_deployment_id: "thisisatestkey",
  target_link_uri: new URL("/lti/provider/launch", "http://localhost:3000").href,
  lti_message_hint: ltiMessageHint,
  lti_storage_target: "post_message_forwarding",
};

const authRequestForm = {
  scope: "openid",
  response_type: "id_token",
  client_id: "10000000000001",
  redirect_uri: new URL("/lti/provider/launch", "http://localhost:3000").href,
  login_hint: loginHint,
  response_mode: "form_post",
  prompt: "none",
  lti_message_hint: ltiMessageHint,
};

const stateId = nanoid();
const nonce = nanoid();

const destroyState = sinon.stub().resolves();

const loginState = {
  key: "thisisatestkey",
  state: stateId,
  nonce: nonce,
  iss: "https://canvas.instructure.com/",
  client_id: "10000000000001",
  keyset_url: "https://canvas.instructure.com/api/lti/security/jwks",
  destroy: destroyState,
};

const userId = nanoid();

const redirectBody = {
  id_token: "abc123",
  state: stateId,
  lti_storage_target: "post_message_forwarding",
};

const sampleJwt = {
  "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
  "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
  "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
    id: nanoid(),
    title: "Test Assignment",
  },
  "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {
    lineitem: "https://canvas.instructure.com/api/lti/courses/1/line_items/1",
    scope: [
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/score",
      "https://canvas.instructure.com/lti-ags/progress/scope/show",
    ],
    lineitems: "http://canvas.instructure.com/api/lti/courses/1/line_items",
  },
  aud: "10000000000001",
  azp: "10000000000001",
  "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "thisisatestkey",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  iss: "https://canvas.instructure.com/",
  nonce: nonce,
  sub: nanoid(),
  "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": new URL("/lti/provider/launch", "http://localhost:3000")
    .href,
  picture: "https://placehold.co/64x64",
  email: "canvasstudent@russfeld.me",
  name: "Test Student",
  given_name: "Test",
  family_name: "Student",
  "https://purl.imsglobal.org/spec/lti/claim/context": {
    id: nanoid(),
    label: "TESTLABEL",
    title: "Test COurse",
    type: ["http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"],
  },
  "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
    guid: nanoid() + ":canvas-lms",
    name: "ALT+CS Lab",
    version: "cloud",
    product_family_code: "canvas",
  },
  "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
    document_target: "iframe",
    return_url: "https://canvas.instructure.com//courses/1/assignments",
    locale: "en",
  },
  locale: "en",
  "https://purl.imsglobal.org/spec/lti/claim/roles": [
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#User",
  ],
  "https://purl.imsglobal.org/spec/lti/claim/lti11_legacy_user_id": userId,
  "https://purl.imsglobal.org/spec/lti/claim/lti1p1": {
    resource_link_id: nanoid(),
    user_id: userId,
    oauth_consumer_key: "thisisatestkey",
    oauth_consumer_key_sign: "invalidsignature",
  },
  "https://www.instructure.com/placement": null,
};

// const tempJwtSigningKey = crypto.randomBytes(64).toString("hex");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs1",
    format: "pem",
  },
});

/**
 * Sign a JWT Body
 */
const signedBody = (jwt) => {
  const signedRedirect = { ...redirectBody };
  signedRedirect.id_token = jsonwebtoken.sign(jwt, privateKey, { algorithm: "RS256", keyid: "testkeyid" });
  return signedRedirect;
};

const testConsumer = {
  key: "thisisatestkey",
  client_id: "10000000000001",
  deployment_id: "thisisatestkey",
  keyset_url: "https://canvas.instructure.com/api/lti/security/jwks",
  auth_url: "https://canvas.instructure.com/api/lti/authorize_redirect",
  token_url: "https://canvas.instructure.com/login/oauth2/token",
  platform_id: "https://canvas.instructure.com/",
  name: "Test Consumer",
  lti13: true,
};

const domain_name = "http://localhost:3000";

describe("/lib/lti13.js", function () {
  describe("authRequest", function () {
    it("should handle a valid LTI 1.3 authentication request", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(testConsumer),
        },
        ConsumerLogin: {
          create: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Call the method under test
      const result = await lti13Utils.authRequest({
        body: authRequestData,
      });

      // Assert the expected results
      expect(result).to.shallowDeepEqual({
        url: testConsumer.auth_url,
        name: testConsumer.name,
        form: authRequestForm,
      });

      // Assert that the database methods were called with the expected arguments
      expect(
        models.Consumer.findOne.calledOnceWith({
          where: { client_id: testConsumer.client_id, deployment_id: testConsumer.deployment_id },
        }),
      ).to.be.true;
      expect(models.ConsumerLogin.create.calledOnce).to.be.true;
    });

    async function authRequestMissingFields(field, error) {
      it("should throw an error if required field " + field + " is missing", async function () {
        // Mock Library Dependencies
        const models = {
          Consumer: {
            findOne: sinon.stub().resolves(testConsumer),
          },
          ConsumerLogin: {
            create: sinon.stub().resolves(loginState),
          },
        };
        const logger = {};

        // Create instance of LTI13Utils
        const lti13Utils = new LTI13Utils(models, logger, domain_name);

        // Remove the specified field from the auth request data
        const modifiedAuthRequestData = { ...authRequestData };
        delete modifiedAuthRequestData[field];

        try {
          // Call the method under test
          await lti13Utils.authRequest({
            body: modifiedAuthRequestData,
          });
          throw new Error("Expected authRequest to throw an error");
        } catch (err) {
          expect(err.message).to.equal(error);
        }
      });
    }

    authRequestMissingFields("iss", "Login: No LTI Issuer Provided");
    authRequestMissingFields("login_hint", "Login: No LTI Login Hint Provided");
    authRequestMissingFields("target_link_uri", "Login: Invalid LTI Target Link URI: undefined");
    authRequestMissingFields("client_id", "Login: No LTI Client ID Provided");
    authRequestMissingFields("lti_deployment_id", "Login: No LTI Deployment ID Provided");

    it("should throw an error if the target_link_uri is not a valid URL", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(testConsumer),
        },
        ConsumerLogin: {
          create: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Create a modified auth request with an invalid target_link_uri
      const modifiedAuthRequestData = { ...authRequestData, target_link_uri: "not-a-valid-url" };

      try {
        // Call the method under test
        await lti13Utils.authRequest({
          body: modifiedAuthRequestData,
        });
        throw new Error("Expected authRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Login: Invalid LTI Target Link URI: not-a-valid-url");
      }
    });

    it("should throw an error if the consumer is not found in the database", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(null),
        },
        ConsumerLogin: {
          create: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test
        await lti13Utils.authRequest({
          body: authRequestData,
        });
        throw new Error("Expected authRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal(
          "Login: Consumer not found for client_id: 10000000000001 and deployment_id: thisisatestkey",
        );
      }
    });

    it("should throw an error if there is an error creating the login state", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(testConsumer),
        },
        ConsumerLogin: {
          create: sinon.stub().rejects(new Error("Database error")),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test
        await lti13Utils.authRequest({
          body: authRequestData,
        });
        throw new Error("Expected authRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Database error");
      }
    });

    it("should handle a valid LTI 1.3 authentication request with a missing lti_message_hint", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(testConsumer),
        },
        ConsumerLogin: {
          create: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      //Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Create a modified auth request without the lti_message_hint
      const modifiedAuthRequestData = { ...authRequestData };
      delete modifiedAuthRequestData.lti_message_hint;

      // Call the method under test
      const result = await lti13Utils.authRequest({
        body: modifiedAuthRequestData,
      });

      // Assert the expected results
      expect(result).to.shallowDeepEqual({
        url: testConsumer.auth_url,
        name: testConsumer.name,
        form: {
          ...authRequestForm,
          lti_message_hint: undefined,
        },
      });

      // Assert that the database methods were called with the expected arguments
      expect(
        models.Consumer.findOne.calledOnceWith({
          where: { client_id: testConsumer.client_id, deployment_id: testConsumer.deployment_id },
        }),
      ).to.be.true;
      expect(models.ConsumerLogin.create.calledOnce).to.be.true;
    });

    it("should throw an error if the returned login state is null", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(testConsumer),
        },
        ConsumerLogin: {
          create: sinon.stub().resolves(null),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test
        await lti13Utils.authRequest({
          body: authRequestData,
        });
        throw new Error("Expected authRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Login: Unable to save Login State");
      }
    });
  });

  describe("launchRequest", function () {
    it("should handle a valid LTI 1.3 launch request", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerLogin: {
          findOne: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: () => publicKey,
      });

      // Call the method under test
      const result = await lti13Utils.launchRequest({ body: signedBody(sampleJwt) });

      // Assert the expected results
      expect(result).to.shallowDeepEqual(sampleJwt);

      // Assert that the database methods were called with the expected arguments
      expect(models.ConsumerLogin.findOne.calledOnceWith({ where: { state: stateId } })).to.be.true;
      expect(destroyState.calledOnce).to.be.true;

      // Restore stubbed methods
      JwksClient.prototype.getSigningKey.restore();
    });

    async function launchRequestMissingFields(field, error) {
      it("should throw an error if required field " + field + " is missing", async function () {
        // Mock Library Dependencies
        const models = {
          ConsumerLogin: {
            findOne: sinon.stub().resolves(loginState),
          },
        };
        const logger = {};

        // Create instance of LTI13Utils
        const lti13Utils = new LTI13Utils(models, logger, domain_name);

        // Create a modified launch request body with the specified field removed
        const modifiedLaunchRequestBody = { ...signedBody(sampleJwt) };
        delete modifiedLaunchRequestBody[field];

        try {
          // Call the method under test
          await lti13Utils.launchRequest({ body: modifiedLaunchRequestBody });
          throw new Error("Expected launchRequest to throw an error");
        } catch (err) {
          expect(err.message).to.equal(error);
        }
      });
    }

    launchRequestMissingFields("id_token", "Launch: JWT Not Found in Launch Request");
    launchRequestMissingFields("state", "Launch: State Not Found in Launch Request");

    it("should throw an error if the login state is not found in the database", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerLogin: {
          findOne: sinon.stub().resolves(null),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test
        await lti13Utils.launchRequest({ body: signedBody(sampleJwt) });
        throw new Error("Expected launchRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Launch: Invalid State in Launch Request");
      }
    });

    it("should throw an error if there is an error retrieving the signing key", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerLogin: {
          findOne: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(JwksClient.prototype, "getSigningKey").rejects(new Error("JWKS error"));

      try {
        // Call the method under test
        await lti13Utils.launchRequest({ body: signedBody(sampleJwt) });
        throw new Error("Expected launchRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("JWKS error");
      } finally {
        // Restore stubbed methods
        JwksClient.prototype.getSigningKey.restore();
      }
    });

    it("should throw an error if the JWT signature is invalid", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerLogin: {
          findOne: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Simulate a bad key
      const keys = crypto.generateKeyPairSync("rsa", {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs1",
          format: "pem",
        },
      });

      // Stub library methods
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: () => keys.publicKey, // Return the bad public key instead of the good one to cause signature verification to fail
      });

      try {
        // Call the method under test
        await lti13Utils.launchRequest({ body: signedBody(sampleJwt) });
        throw new Error("Expected launchRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Launch: Unable to Verify JWT: invalid signature");
      } finally {
        // Restore stubbed methods
        JwksClient.prototype.getSigningKey.restore();
      }
    });

    it("should throw an error if the JWT is missing required LTI claims", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerLogin: {
          findOne: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: () => publicKey,
      });

      // Create a modified JWT payload with the message_type claim removed
      const modifiedJwt = { ...sampleJwt };
      delete modifiedJwt["https://purl.imsglobal.org/spec/lti/claim/message_type"];

      try {
        // Call the method under test
        await lti13Utils.launchRequest({ body: signedBody(modifiedJwt) });
        throw new Error("Expected launchRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Launch: Invalid LTI Message Type: undefined");
      } finally {
        // Restore stubbed methods
        JwksClient.prototype.getSigningKey.restore();
      }
    });

    it("should throw an error if the message_type claim is not a valid LTI message type", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerLogin: {
          findOne: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: () => publicKey,
      });

      // Create a modified JWT payload with an invalid message_type
      const modifiedJwt = { ...sampleJwt };
      modifiedJwt["https://purl.imsglobal.org/spec/lti/claim/message_type"] = "InvalidMessageType";

      try {
        // Call the method under test
        await lti13Utils.launchRequest({ body: signedBody(modifiedJwt) });
        throw new Error("Expected launchRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Launch: Invalid LTI Message Type: InvalidMessageType");
      } finally {
        // Restore stubbed methods
        JwksClient.prototype.getSigningKey.restore();
      }
    });

    it("should throw an error if the JWT is missing LTI version", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerLogin: {
          findOne: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: () => publicKey,
      });

      // Create a modified JWT payload with the version claim removed
      const modifiedJwt = { ...sampleJwt };
      delete modifiedJwt["https://purl.imsglobal.org/spec/lti/claim/version"];

      try {
        // Call the method under test
        await lti13Utils.launchRequest({ body: signedBody(modifiedJwt) });
        throw new Error("Expected launchRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Launch: Invalid LTI Version: undefined");
      } finally {
        // Restore stubbed methods
        JwksClient.prototype.getSigningKey.restore();
      }
    });

    it("should throw an error if the LTI version is not supported", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerLogin: {
          findOne: sinon.stub().resolves(loginState),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: () => publicKey,
      });

      // Create a modified JWT payload with an unsupported LTI version
      const modifiedJwt = { ...sampleJwt };
      modifiedJwt["https://purl.imsglobal.org/spec/lti/claim/version"] = "2.0";

      try {
        // Call the method under test
        await lti13Utils.launchRequest({ body: signedBody(modifiedJwt) });
        throw new Error("Expected launchRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Launch: Invalid LTI Version: 2.0");
      } finally {
        // Restore stubbed methods
        JwksClient.prototype.getSigningKey.restore();
      }
    });
  });

  describe("getAccessToken", function () {
    it("should retrieve an access token for a valid consumer", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(testConsumer),
        },
        ConsumerKey: {
          findOne: sinon.stub().resolves({ public: publicKey, private: privateKey }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate token request
      sinon.stub(ky, "post").returns({
        json: sinon.stub().resolves({ access_token: "test_access_token" }),
      });

      // Call the method under test
      const result = await lti13Utils.getAccessToken(
        testConsumer.key,
        "https://canvas.instructure.com/api/lti/courses/1/line_items",
      );

      // Assert the expected results
      expect(result).to.deep.equal({ access_token: "test_access_token" });

      // Assert that the database methods were called with the expected arguments
      expect(models.Consumer.findOne.calledOnceWith({ where: { key: testConsumer.key } })).to.be.true;
      expect(models.ConsumerKey.findOne.calledOnceWith({ where: { key: testConsumer.key } })).to.be.true;

      // Restore stubbed methods
      ky.post.restore();
    });

    async function getAccessTokenMissingConsumerFields(field, error) {
      it("should throw an error if required consumer field " + field + " is missing", async function () {
        // Mock Library Dependencies
        const modifiedConsumer = { ...testConsumer };
        delete modifiedConsumer[field];

        const models = {
          Consumer: {
            findOne: sinon.stub().resolves(modifiedConsumer),
          },
          ConsumerKey: {
            findOne: sinon.stub().resolves({ public: publicKey, private: privateKey }),
          },
        };
        const logger = {
          lti: sinon.stub(),
          silly: sinon.stub(),
        };

        // Create instance of LTI13Utils
        const lti13Utils = new LTI13Utils(models, logger, domain_name);

        try {
          // Call the method under test
          await lti13Utils.getAccessToken(
            modifiedConsumer.key,
            "https://canvas.instructure.com/api/lti/courses/1/line_items",
          );
          throw new Error("Expected getAccessToken to throw an error");
        } catch (err) {
          expect(err.message).to.equal(error);
        }
      });
    }

    getAccessTokenMissingConsumerFields("client_id", "Access Token: Consumer client ID not set");
    getAccessTokenMissingConsumerFields("token_url", "Access Token: Consumer token URL not set");
    getAccessTokenMissingConsumerFields("platform_id", "Access Token: Consumer platform ID not set");
    getAccessTokenMissingConsumerFields("lti13", "Access Token: Consumer does not support LTI 1.3");

    it("should throw an error if the consumer key is not found in the database", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(testConsumer),
        },
        ConsumerKey: {
          findOne: sinon.stub().resolves(null),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test
        await lti13Utils.getAccessToken(
          testConsumer.key,
          "https://canvas.instructure.com/api/lti/courses/1/line_items",
        );
        throw new Error("Expected getAccessToken to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Access Token: Consumer key not found");
      }
    });

    it("should throw an error if the consumer does not support LTI 1.3", async function () {
      // Mock Library Dependencies
      const modifiedConsumer = { ...testConsumer, lti13: false };

      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(modifiedConsumer),
        },
        ConsumerKey: {
          findOne: sinon.stub().resolves({ public: publicKey, private: privateKey }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test
        await lti13Utils.getAccessToken(
          modifiedConsumer.key,
          "https://canvas.instructure.com/api/lti/courses/1/line_items",
        );
        throw new Error("Expected getAccessToken to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Access Token: Consumer does not support LTI 1.3");
      }
    });

    it("should throw an error if the consumer is not found in the database", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(null),
        },
        ConsumerKey: {
          findOne: sinon.stub().resolves({ public: publicKey, private: privateKey }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test
        await lti13Utils.getAccessToken(
          testConsumer.key,
          "https://canvas.instructure.com/api/lti/courses/1/line_items",
        );
        throw new Error("Expected getAccessToken to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Access Token: Consumer not found");
      }
    });

    it("should throw an error if there is an error requesting the access token", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(testConsumer),
        },
        ConsumerKey: {
          findOne: sinon.stub().resolves({ public: publicKey, private: privateKey }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate token request failure
      sinon.stub(ky, "post").returns({
        json: sinon.stub().rejects(new Error("Token request failed")),
      });

      try {
        // Call the method under test
        await lti13Utils.getAccessToken(
          testConsumer.key,
          "https://canvas.instructure.com/api/lti/courses/1/line_items",
        );
        throw new Error("Expected getAccessToken to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Error requesting access token: Token request failed");
      } finally {
        // Restore stubbed methods
        ky.post.restore();
      }
    });

    it("should throw an error if the token response does not contain an access token", async function () {
      // Mock Library Dependencies
      const models = {
        Consumer: {
          findOne: sinon.stub().resolves(testConsumer),
        },
        ConsumerKey: {
          findOne: sinon.stub().resolves({ public: publicKey, private: privateKey }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate token request with invalid response
      sinon.stub(ky, "post").returns({
        json: sinon.stub().resolves({ invalid_field: "no access token" }),
      });

      try {
        // Call the method under test
        await lti13Utils.getAccessToken(
          testConsumer.key,
          "https://canvas.instructure.com/api/lti/courses/1/line_items",
        );
        throw new Error("Expected getAccessToken to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Access Token: Unable to get access token from " + testConsumer.token_url);
      } finally {
        // Restore stubbed methods
        ky.post.restore();
      }
    });
  });

  const lmsDetails = {
    issuer: "https://canvas.home.russfeld.me",
    authorization_endpoint: "https://canvas.home.russfeld.me/api/lti/authorize_redirect",
    registration_endpoint: "https://canvas.home.russfeld.me/api/lti/registrations",
    jwks_uri: "https://canvas.home.russfeld.me/api/lti/security/jwks",
    token_endpoint: "https://canvas.home.russfeld.me/login/oauth2/token",
    token_endpoint_auth_methods_supported: ["private_key_jwt"],
    token_endpoint_auth_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "https://purl.imsglobal.org/spec/lti-ags/scope/score"],
    response_types_supported: ["id_token"],
    id_token_signing_alg_values_supported: ["RS256"],
    claims_supported: ["sub", "picture", "email", "name", "given_name", "family_name", "locale"],
    subject_types_supported: ["public"],
    authorization_server: "canvas.home.russfeld.me",
    "https://purl.imsglobal.org/spec/lti-platform-configuration": {
      product_family_code: "canvas",
      version: "OpenSource",
      messages_supported: [
        {
          type: "LtiResourceLinkRequest",
          placements: ["ContentArea"],
        },
        {
          type: "LtiDeepLinkingRequest",
          placements: ["ContentArea", "RichTextEditor"],
        },
        {
          type: "LtiEulaRequest",
        },
      ],
      notice_types_supported: ["LtiHelloWorldNotice"],
      variables: ["ResourceLink.id"],
      "https://canvas.instructure.com/lti/account_name": "ALT+CS Dev Canvas",
      "https://canvas.instructure.com/lti/account_lti_guid": "aUiNs1PwAjfVJ29mX5po2mGGUd1FjvpxfBxX8gHl:canvas-lms",
      "https://canvas.instructure.com/lti/account_domain": "canvas.home.russfeld.me",
    },
  };

  describe("getLMSDetails", function () {
    it("should retrieve LMS details for a valid query", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate LMS details request
      sinon.stub(ky, "get").returns({
        json: sinon.stub().resolves(lmsDetails),
      });

      // Call the method under test
      const result = await lti13Utils.getLMSDetails({
        openid_configuration: "http://localhost:3000/lti/.well-known/openid-configuration",
      });

      // Assert the expected results
      expect(result).to.deep.equal(lmsDetails);

      // Expect that ky was called with the expected arguments
      expect(ky.get.calledOnceWith("http://localhost:3000/lti/.well-known/openid-configuration")).to.be.true;

      // Restore stubbed methods
      ky.get.restore();
    });

    async function getLMSDetailsMissingFields(field, error) {
      it(
        "should throw an error if required field " + field + " is missing from the LMS details response",
        async function () {
          // Mock Library Dependencies
          const models = {};
          const logger = {
            lti: sinon.stub(),
            silly: sinon.stub(),
          };

          // Create instance of LTI13Utils
          const lti13Utils = new LTI13Utils(models, logger, domain_name);

          // Create a modified LMS details response with the specified field removed
          const modifiedLmsDetails = { ...lmsDetails };
          delete modifiedLmsDetails[field];

          // Stub ky to simulate LMS details request
          sinon.stub(ky, "get").returns({
            json: sinon.stub().resolves(modifiedLmsDetails),
          });

          try {
            // Call the method under test
            await lti13Utils.getLMSDetails({
              openid_configuration: "http://localhost:3000/lti/.well-known/openid-configuration",
            });
            throw new Error("Expected getLMSDetails to throw an error");
          } catch (err) {
            expect(err.message).to.equal(error);
          } finally {
            // Restore stubbed methods
            ky.get.restore();
          }
        },
      );
    }

    getLMSDetailsMissingFields(
      "registration_endpoint",
      "Dynamic Registration: No Registration Endpoint found in OpenID Configuration",
    );
    getLMSDetailsMissingFields("issuer", "Dynamic Registration: No Issuer found in OpenID Configuration");
    getLMSDetailsMissingFields(
      "authorization_endpoint",
      "Dynamic Registration: No Authorization Endpoint found in OpenID Configuration",
    );
    getLMSDetailsMissingFields(
      "token_endpoint",
      "Dynamic Registration: No Token Endpoint found in OpenID Configuration",
    );
    getLMSDetailsMissingFields("jwks_uri", "Dynamic Registration: No JWKS URI found in OpenID Configuration");
    getLMSDetailsMissingFields(
      "https://purl.imsglobal.org/spec/lti-platform-configuration",
      "Dynamic Registration: No LTI Platform Configuration found in OpenID Configuration",
    );

    it("should throw an error if there is an error requesting the LMS details", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate LMS details request failure
      sinon.stub(ky, "get").returns({
        json: sinon.stub().rejects(new Error("LMS details request failed")),
      });

      try {
        // Call the method under test
        await lti13Utils.getLMSDetails({
          openid_configuration: "http://localhost:3000/lti/.well-known/openid-configuration",
        });
        throw new Error("Expected getLMSDetails to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Dynamic Registration: Failed to fetch OpenID Configuration from LMS");
      } finally {
        // Restore stubbed methods
        ky.get.restore();
      }
    });

    it("should throw an error if the LMS platform configuration is missing product family code", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Create a modified LMS details response with the platform configuration missing required fields
      const modifiedLmsDetails = JSON.parse(JSON.stringify(lmsDetails)); // Deep copy
      delete modifiedLmsDetails["https://purl.imsglobal.org/spec/lti-platform-configuration"].product_family_code;

      // Stub ky to simulate LMS details request with invalid response
      sinon.stub(ky, "get").returns({
        json: sinon.stub().resolves(modifiedLmsDetails),
      });

      try {
        // Call the method under test
        await lti13Utils.getLMSDetails({
          openid_configuration: "http://localhost:3000/lti/.well-known/openid-configuration",
        });
        throw new Error("Expected getLMSDetails to throw an error");
      } catch (err) {
        expect(err.message).to.equal(
          "Dynamic Registration: No Product Family Code found in LTI Platform Configuration",
        );
      } finally {
        // Restore stubbed methods
        ky.get.restore();
      }
    });

    it("should throw an error if the LMS platform configuration is missing version", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Create a modified LMS details response with the platform configuration missing required fields
      const modifiedLmsDetails = JSON.parse(JSON.stringify(lmsDetails)); // Deep copy
      delete modifiedLmsDetails["https://purl.imsglobal.org/spec/lti-platform-configuration"].version;

      // Stub ky to simulate LMS details request with invalid response
      sinon.stub(ky, "get").returns({
        json: sinon.stub().resolves(modifiedLmsDetails),
      });

      try {
        // Call the method under test
        await lti13Utils.getLMSDetails({
          openid_configuration: "http://localhost:3000/lti/.well-known/openid-configuration",
        });
        throw new Error("Expected getLMSDetails to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Dynamic Registration: No Version found in LTI Platform Configuration");
      } finally {
        // Restore stubbed methods
        ky.get.restore();
      }
    });

    it("should throw an error if the query does not contain an openid_configuration", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test without openid_configuration
        await lti13Utils.getLMSDetails({});
        throw new Error("Expected getLMSDetails to throw an error");
      } catch (err) {
        expect(err.message).to.equal(
          "Dynamic Registration: No OpenID Configuration URL provided in registration request",
        );
      }
    });

    it("should throw an error if the endpoint does not match issuer in the LMS details response", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Create a modified LMS details response with a mismatched issuer
      const modifiedLmsDetails = { ...lmsDetails, issuer: "https://mismatched-issuer.com" };

      // Stub ky to simulate LMS details request
      sinon.stub(ky, "get").returns({
        json: sinon.stub().resolves(modifiedLmsDetails),
      });

      try {
        // Call the method under test
        await lti13Utils.getLMSDetails({
          openid_configuration: "http://localhost:3000/lti/.well-known/openid-configuration",
        });
        throw new Error("Expected getLMSDetails to throw an error");
      } catch (err) {
        expect(err.message).to.equal(
          "Dynamic Registration: Registration Endpoint does not match Issuer in OpenID Configuration",
        );
      } finally {
        // Restore stubbed methods
        ky.get.restore();
      }
    });
  });

  const sampleDlResponse = {
    iss: testConsumer.client_id,
    aud: testConsumer.platform_id,
    nonce: nanoid(),
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": testConsumer.deployment_id,
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": [
      {
        type: "ltiResourceLink",
        title: "Content Title",
        url: new URL(`http://localhost:3000/lti/provider/launch`, domain_name).href,
        window: {
          targetName: "_blank",
        },
        custom: {
          custom_id: "thisisacustomid",
        },
      },
    ],
  };

  describe("createToolToken", function () {
    it("should create a signed JWT tool token with the correct claims", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerKey: {
          findOne: sinon.stub().resolves({ private: privateKey }),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(crypto, "createPrivateKey").returns(privateKey);

      // Call the method under test
      const result = await lti13Utils.createToolToken(testConsumer.key, sampleDlResponse);

      // Assert the expected results
      const decoded = jsonwebtoken.verify(result, publicKey, { algorithms: ["RS256"] });
      expect(decoded).to.shallowDeepEqual(sampleDlResponse);
      expect(models.ConsumerKey.findOne.calledOnceWith({ where: { key: testConsumer.key }, attributes: ["private"] }))
        .to.be.true;

      // Restore stubbed methods
      crypto.createPrivateKey.restore();
    });

    it("should throw an error if there is an error retrieving the consumer key from the database", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerKey: {
          findOne: sinon.stub().rejects(new Error("Database Error")),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test
        await lti13Utils.createToolToken(testConsumer.key, sampleDlResponse);
        throw new Error("Expected createToolToken to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Database Error");
      }
    });

    it("should throw an error if there is an error creating the private key", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerKey: {
          findOne: sinon.stub().resolves({ private: privateKey }),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(crypto, "createPrivateKey").throws(new Error("Invalid private key"));

      try {
        // Call the method under test
        await lti13Utils.createToolToken(testConsumer.key, sampleDlResponse);
        throw new Error("Expected createToolToken to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Invalid private key");
      } finally {
        // Restore stubbed methods
        crypto.createPrivateKey.restore();
      }
    });

    it("should throw an error if there is an error signing the JWT", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerKey: {
          findOne: sinon.stub().resolves({ private: privateKey }),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(crypto, "createPrivateKey").returns(privateKey);
      sinon.stub(jsonwebtoken, "sign").throws(new Error("JWT signing error"));

      try {
        // Call the method under test
        await lti13Utils.createToolToken(testConsumer.key, sampleDlResponse);
        throw new Error("Expected createToolToken to throw an error");
      } catch (err) {
        expect(err.message).to.equal("JWT signing error");
      } finally {
        // Restore stubbed methods
        crypto.createPrivateKey.restore();
        jsonwebtoken.sign.restore();
      }
    });

    it("should throw an error if the database returns a null value for the consumer key", async function () {
      // Mock Library Dependencies
      const models = {
        ConsumerKey: {
          findOne: sinon.stub().resolves(null),
        },
      };
      const logger = {};

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test
        await lti13Utils.createToolToken(testConsumer.key, sampleDlResponse);
        throw new Error("Expected createToolToken to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Tool Token: Consumer key not found");
      }
    });
  });

  const sampleConfig = {
    application_type: "web",
    response_types: ["id_token"],
    grant_types: ["implicit", "client_credentials"],
    initiate_login_uri: "https://example.com/lti/provider/login13",
    redirect_uris: ["https://example.com/lti/provider/redirect13"],
    client_name: "LTI Toolkit",
    logo_uri: "https://example.com/icon.png",
    token_endpoint_auth_method: "private_key_jwt",
    jwks_uri: "https://example.com/lti/provider/key13",
    contacts: ["admin@example.com"],
    scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
    "https://purl.imsglobal.org/spec/lti-tool-configuration": {
      domain: "ltidemo.home.russfeld.me",
      description: "LTI Demo Tool Description",
      target_link_uri: "https://example.com/lti/provider//launch13",
      custom_parameters: {
        custom_name: "custom_value",
      },
      claims: ["iss", "sub", "name", "given_name", "family_name", "email", "picture"],
      messages: [],
    },
  };

  const sampleConfigResponse = {
    client_id: "10000000000005",
    application_type: "web",
    grant_types: ["client_credentials", "implicit"],
    initiate_login_uri: "https://ltidemo.home.russfeld.me/lti/provider/login13",
    redirect_uris: ["https://ltidemo.home.russfeld.me/lti/provider/redirect13"],
    response_types: ["id_token"],
    client_name: "LTI Toolkit",
    jwks_uri: "https://ltidemo.home.russfeld.me/lti/provider/key13",
    logo_uri: "https://placehold.co/64x64.png",
    token_endpoint_auth_method: "private_key_jwt",
    scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
    "https://purl.imsglobal.org/spec/lti-tool-configuration": {
      domain: "ltidemo.home.russfeld.me",
      messages: [],
      claims: ["iss", "sub", "name", "given_name", "family_name", "email", "picture"],
      target_link_uri: "https://ltidemo.home.russfeld.me/lti/provider/launch13",
      custom_parameters: {},
      description: "LTI Toolkit for LTI Tool Providers",
      "https://canvas.instructure.com/lti/registration_config_url":
        "https://canvas.home.russfeld.me/api/lti/registrations/10000000000001/view",
    },
    deployment_id: "9:8865aa05b4b79b64a91a86042e43af5ea8ae79eb",
  };

  describe("sendRegistrationResponse", function () {
    it("should send a registration response to the correct endpoint with the correct data", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };
      const consumer = {
        save: sinon.stub().resolves(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate registration response request
      sinon.stub(ky, "post").resolves({
        status: 200,
        json: sinon.stub().resolves(sampleConfigResponse),
      });

      // Call the method under test
      const result = await lti13Utils.sendRegistrationResponse(
        sampleConfig,
        "http://localhost:3000/lti/.well-known/openid-configuration",
        consumer,
        "thisisatoken",
      );

      // Assert the expected results
      expect(result).to.deep.equal(sampleConfig);
      expect(
        ky.post.calledOnceWith("http://localhost:3000/lti/.well-known/openid-configuration", {
          json: sampleConfig,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer thisisatoken",
          },
        }),
      ).to.be.true;
      expect(consumer.save.calledOnce).to.be.true;
      expect(consumer.client_id).to.equal(sampleConfigResponse.client_id);
      expect(consumer.deployment_id).to.equal(sampleConfigResponse.deployment_id);

      // Restore stubbed methods
      ky.post.restore();
    });

    it("should send a registration response to the correct endpoint with the correct data and different deployment_id", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };
      const consumer = {
        save: sinon.stub().resolves(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate registration response request
      const modifiedConfigResponse = JSON.parse(JSON.stringify(sampleConfigResponse)); // Deep copy
      delete modifiedConfigResponse.deployment_id;
      modifiedConfigResponse["https://purl.imsglobal.org/spec/lti-tool-configuration"].deployment_id =
        "thisisanotherdeploymentid";
      sinon.stub(ky, "post").resolves({
        status: 200,
        json: sinon.stub().resolves(modifiedConfigResponse),
      });

      // Call the method under test
      const result = await lti13Utils.sendRegistrationResponse(
        sampleConfig,
        "http://localhost:3000/lti/.well-known/openid-configuration",
        consumer,
        "thisisatoken",
      );

      // Assert the expected results
      expect(result).to.deep.equal(sampleConfig);
      expect(
        ky.post.calledOnceWith("http://localhost:3000/lti/.well-known/openid-configuration", {
          json: sampleConfig,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer thisisatoken",
          },
        }),
      ).to.be.true;
      expect(consumer.save.calledOnce).to.be.true;
      expect(consumer.client_id).to.equal(sampleConfigResponse.client_id);
      expect(consumer.deployment_id).to.equal("thisisanotherdeploymentid");

      // Restore stubbed methods
      ky.post.restore();
    });

    it("should throw an error if there is an error sending the registration response", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };
      const consumer = {
        save: sinon.stub().resolves(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate registration response request failure
      sinon.stub(ky, "post").rejects(new Error("Registration response request failed"));

      try {
        // Call the method under test
        await lti13Utils.sendRegistrationResponse(
          sampleConfig,
          "http://localhost:3000/lti/.well-known/openid-configuration",
          consumer,
          "thisisatoken",
        );
        throw new Error("Expected sendRegistrationResponse to throw an error");
      } catch (err) {
        expect(err.message).to.equal(
          "Dynamic Registration: Failed to register LTI 1.3 configuration with LMS: Registration response request failed",
        );
      } finally {
        // Restore stubbed methods
        ky.post.restore();
      }
    });

    it("should throw an error if the registration response does not contain a client_id", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };
      const consumer = {
        save: sinon.stub().resolves(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate registration response request with invalid response
      const modifiedConfigResponse = { ...sampleConfigResponse };
      delete modifiedConfigResponse.client_id;

      sinon.stub(ky, "post").resolves({
        status: 200,
        json: sinon.stub().resolves(modifiedConfigResponse),
      });

      try {
        // Call the method under test
        await lti13Utils.sendRegistrationResponse(
          sampleConfig,
          "http://localhost:3000/lti/.well-known/openid-configuration",
          consumer,
          "thisisatoken",
        );
        throw new Error("Expected sendRegistrationResponse to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Dynamic Registration: No client_id returned in registration response");
      } finally {
        // Restore stubbed methods
        ky.post.restore();
      }
    });

    it("should throw an error if the registration response does not contain a deployment_id", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };
      const consumer = {
        save: sinon.stub().resolves(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate registration response request with invalid response
      const modifiedConfigResponse = { ...sampleConfigResponse };
      delete modifiedConfigResponse.deployment_id;

      sinon.stub(ky, "post").resolves({
        status: 200,
        json: sinon.stub().resolves(modifiedConfigResponse),
      });

      try {
        // Call the method under test
        await lti13Utils.sendRegistrationResponse(
          sampleConfig,
          "http://localhost:3000/lti/.well-known/openid-configuration",
          consumer,
          "thisisatoken",
        );
        throw new Error("Expected sendRegistrationResponse to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Dynamic Registration: No deployment_id returned in registration response");
      } finally {
        // Restore stubbed methods
        ky.post.restore();
      }
    });

    it("should send a registration response with no token if the token parameter is null", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };
      const consumer = {
        save: sinon.stub().resolves(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate registration response request
      sinon.stub(ky, "post").resolves({
        status: 200,
        json: sinon.stub().resolves(sampleConfigResponse),
      });

      // Call the method under test with null token
      const result = await lti13Utils.sendRegistrationResponse(
        sampleConfig,
        "http://localhost:3000/lti/.well-known/openid-configuration",
        consumer,
        null,
      );

      // Assert the expected results
      expect(result).to.deep.equal(sampleConfig);
      expect(
        ky.post.calledOnceWith("http://localhost:3000/lti/.well-known/openid-configuration", {
          json: sampleConfig,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ).to.be.true;
      expect(consumer.save.calledOnce).to.be.true;
      expect(consumer.client_id).to.equal(sampleConfigResponse.client_id);
      expect(consumer.deployment_id).to.equal(sampleConfigResponse.deployment_id);

      // Restore stubbed methods
      ky.post.restore();
    });

    it("should thrown an error if the response status is not 200", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };
      const consumer = {
        save: sinon.stub().resolves(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate registration response request with non-200 status
      sinon.stub(ky, "post").resolves({
        status: 400,
        json: sinon.stub().resolves(sampleConfigResponse),
      });

      try {
        // Call the method under test
        await lti13Utils.sendRegistrationResponse(
          sampleConfig,
          "http://localhost:3000/lti/.well-known/openid-configuration",
          consumer,
          "thisisatoken",
        );
        throw new Error("Expected sendRegistrationResponse to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Dynamic Registration: Failed to register LTI 1.3 configuration with LMS");
      } finally {
        // Restore stubbed methods
        ky.post.restore();
      }
    });

    it("should log an error response from the LMS if the registration response request fails", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };
      const consumer = {
        save: sinon.stub().resolves(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub ky to simulate registration response request failure with error response
      sinon.stub(ky, "post").rejects({
        response: {
          status: 500,
          json: sinon.stub().resolves("Bad Request"),
        },
        message: "Bad Request",
      });

      try {
        // Call the method under test
        await lti13Utils.sendRegistrationResponse(
          sampleConfig,
          "http://localhost:3000/lti/.well-known/openid-configuration",
          consumer,
          "thisisatoken",
        );
        throw new Error("Expected sendRegistrationResponse to throw an error");
      } catch (err) {
        expect(logger.lti.calledWith("Response Status: 500")).to.be.true;
        expect(err.message).to.equal(
          "Dynamic Registration: Failed to register LTI 1.3 configuration with LMS: Bad Request",
        );
      } finally {
        // Restore stubbed methods
        ky.post.restore();
      }
    });
  });

  describe("postAGSGrade", function () {
    it("should post a grade to the specified endpoint with the correct data and access token", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub access token retrieval
      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      // Stub ky to simulate grade post request
      sinon.stub(ky, "post").resolves({
        status: 200,
      });

      // Call the method under test
      const result = await lti13Utils.postAGSGrade(
        "thisisauserid",
        0.95,
        "thisisaconsumerkey",
        "http://localhost:3000/lti/ags/endpoint",
      );

      // Assert the expected results
      expect(result).to.be.true;
      expect(
        lti13Utils.getAccessToken.calledOnceWith(
          "thisisaconsumerkey",
          "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        ),
      ).to.be.true;
      expect(ky.post.firstCall.args[0]).to.equal("http://localhost:3000/lti/ags/endpoint/scores");
      expect(ky.post.firstCall.args[1]).to.shallowDeepEqual({
        json: {
          scoreGiven: 0.95,
          scoreMaximum: 1.0,
          activityProgress: "Submitted",
          gradingProgress: "FullyGraded",
          userId: "thisisauserid",
        },
        headers: {
          "Content-Type": "application/vnd.ims.lis.v1.score+json",
          Authorization: "Bearer thisisatoken",
        },
      });

      // Restore stubbed methods
      lti13Utils.getAccessToken.restore();
      ky.post.restore();
    });

    it("should throw an error if the response is not 200 OK", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub access token retrieval
      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      // Stub ky to simulate grade post request with non-200 response
      sinon.stub(ky, "post").resolves({
        status: 500,
        json: sinon.stub().resolves("Internal Server Error"),
      });

      try {
        // Call the method under test
        await lti13Utils.postAGSGrade(
          "thisisauserid",
          0.95,
          "thisisaconsumerkey",
          "http://localhost:3000/lti/ags/endpoint",
        );
        throw new Error("Expected postAGSGrade to throw an error");
      } catch (err) {
        expect(err.message).to.equal('Failed to post grade: "Internal Server Error"');
      } finally {
        // Restore stubbed methods
        lti13Utils.getAccessToken.restore();
        ky.post.restore();
      }
    });
  });

  describe("sendDeepLinkResponse", function () {
    it("should send a deep linking response to the correct endpoint with the correct data and access token", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub access token retrieval
      sinon.stub(lti13Utils, "createToolToken").resolves("thisisatooltoken");

      // Stub express response object
      const res = {
        header: sinon.stub().returnsThis(),
        status: sinon.stub().returnsThis(),
        send: sinon.stub().returnsThis(),
      };

      // Call the method under test
      await lti13Utils.sendDeepLinkResponse(
        res,
        "thisissomedata",
        "http://localhost:3000/lti/deep/link/endpoint",
        "thisisaconsumerkey",
      );

      // Assert the expected results
      expect(lti13Utils.createToolToken.calledOnceWith("thisisaconsumerkey", "thisissomedata")).to.be.true;
      expect(res.header.firstCall.args[0]).to.equal("Content-Type");
      expect(res.header.firstCall.args[1]).to.equal("text/html");
      expect(res.header.secondCall.args[0]).to.equal("Content-Security-Policy");
      expect(res.header.secondCall.args[1]).to.equal("form-action http://localhost:3000/lti/deep/link/endpoint");
      expect(res.status.calledOnceWith(200)).to.be.true;
      expect(res.send.firstCall.args[0]).to.contain(
        '<form method="POST" action="http://localhost:3000/lti/deep/link/endpoint">',
      );
      expect(res.send.firstCall.args[0]).to.contain(
        '<input type="hidden" id="JWT" name="JWT" value="thisisatooltoken" />',
      );
    });
  });
});
