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
  deployment_id: "thisisatestkey",
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
      expect(
        models.ConsumerLogin.create.calledOnceWith({
          key: testConsumer.key,
          state: sinon.match.string,
          nonce: sinon.match.string,
          iss: authRequestData.iss,
          client_id: testConsumer.client_id,
          keyset_url: testConsumer.keyset_url,
          deployment_id: testConsumer.deployment_id,
        }),
      ).to.be.true;
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

    it("should throw an error if the JWT is missing the deployment_id claim", async function () {
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

      // Create a modified JWT payload with the deployment_id claim removed
      const modifiedJwt = { ...sampleJwt };
      delete modifiedJwt["https://purl.imsglobal.org/spec/lti/claim/deployment_id"];

      try {
        // Call the method under test
        await lti13Utils.launchRequest({ body: signedBody(modifiedJwt) });
        throw new Error("Expected launchRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Launch: Invalid LTI Deployment ID: undefined");
      } finally {
        // Restore stubbed methods
        JwksClient.prototype.getSigningKey.restore();
      }
    });

    it("should throw an error if the deployment_id claim does not match the deployment used during login", async function () {
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

      // Create a modified JWT payload with a mismatched deployment_id
      const modifiedJwt = { ...sampleJwt };
      modifiedJwt["https://purl.imsglobal.org/spec/lti/claim/deployment_id"] = "some-other-deployment";

      try {
        // Call the method under test
        await lti13Utils.launchRequest({ body: signedBody(modifiedJwt) });
        throw new Error("Expected launchRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Launch: Invalid LTI Deployment ID: some-other-deployment");
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

    it("should throw an error if the registration endpoint is on a different origin than the issuer", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Craft a response where registration_endpoint shares the issuer as a string prefix but is a different origin
      const maliciousDetails = {
        ...lmsDetails,
        issuer: "https://canvas.home.russfeld.me",
        registration_endpoint: "https://canvas.home.russfeld.me.attacker.com/register",
      };

      sinon.stub(ky, "get").returns({
        json: sinon.stub().resolves(maliciousDetails),
      });

      try {
        await lti13Utils.getLMSDetails({
          openid_configuration: "http://localhost:3000/lti/.well-known/openid-configuration",
        });
        throw new Error("Expected getLMSDetails to throw an error");
      } catch (err) {
        expect(err.message).to.equal(
          "Dynamic Registration: Registration Endpoint does not match Issuer in OpenID Configuration",
        );
      } finally {
        ky.get.restore();
      }
    });

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

      // Call the method under test with default progress values
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

    it("should post a grade with custom activityProgress and gradingProgress values", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(lti13Utils, "getAccessToken").resolves({ token_type: "Bearer", access_token: "thisisatoken" });
      sinon.stub(ky, "post").resolves({ status: 200 });

      await lti13Utils.postAGSGrade(
        "thisisauserid",
        0.5,
        "thisisaconsumerkey",
        "http://localhost:3000/lti/ags/endpoint",
        "InProgress",
        "Pending",
      );

      expect(ky.post.firstCall.args[1]).to.shallowDeepEqual({
        json: {
          activityProgress: "InProgress",
          gradingProgress: "Pending",
        },
      });

      lti13Utils.getAccessToken.restore();
      ky.post.restore();
    });

    it("should throw an error if activityProgress is invalid", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        await lti13Utils.postAGSGrade("user", 0.5, "key", "http://example.com", "InvalidValue", "FullyGraded");
        throw new Error("Expected postAGSGrade to throw");
      } catch (err) {
        expect(err.message).to.equal("Post AGS Grade: Invalid activityProgress value: InvalidValue");
      }
    });

    it("should throw an error if gradingProgress is invalid", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        await lti13Utils.postAGSGrade("user", 0.5, "key", "http://example.com", "Submitted", "InvalidValue");
        throw new Error("Expected postAGSGrade to throw");
      } catch (err) {
        expect(err.message).to.equal("Post AGS Grade: Invalid gradingProgress value: InvalidValue");
      }
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

  describe("validateAuthRequest", function () {
    // Create a sample authentication request
    const authRequest = {
      scope: "openid",
      response_type: "id_token",
      client_id: "10000000000002",
      redirect_uri: "https://lpp.home.russfeld.me/lti/provider/redirect13",
      login_hint: "login_hint_value",
      state: "state_value",
      response_mode: "form_post",
      nonce: "nonce_value",
      prompt: "prompt_value",
      lti_message_hint: "message_hint_value",
    };

    it("should validate a correct authentication request and return the expected claims", async function () {
      // Mock Library Dependencies
      const destroyStub = sinon.stub().resolves();
      const jsonStub = sinon.stub().returns({
        data: JSON.stringify({
          login_state: "login_state_value",
        }),
      });
      const models = {
        ProviderLogin: {
          findOne: sinon.stub().resolves({
            toJSON: jsonStub,
            destroy: destroyStub,
          }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Call the method under test
      const result = await lti13Utils.validateAuthRequest({ body: authRequest });

      // Assert the expected results
      expect(
        models.ProviderLogin.findOne.calledOnceWith({
          where: {
            client_id: authRequest.client_id,
            login_hint: authRequest.login_hint,
          },
        }),
      ).to.be.true;
      expect(destroyStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        scope: authRequest.scope,
        response_type: authRequest.response_type,
        client_id: authRequest.client_id,
        redirect_uri: authRequest.redirect_uri,
        login_hint: authRequest.login_hint,
        state: authRequest.state,
        response_mode: authRequest.response_mode,
        nonce: authRequest.nonce,
        loginState: {
          data: {
            login_state: "login_state_value",
          },
        },
      });
    });

    it("should throw an error if the authentication request is missing required parameters", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test with missing parameters
        await lti13Utils.validateAuthRequest({ body: {} });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Invalid or missing scope parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({ body: { scope: "openid" } });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Invalid or missing response_type parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({ body: { scope: "wrongscope" } });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Invalid or missing scope parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({ body: { scope: "openid", response_type: "id_token" } });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Missing client_id parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({ body: { scope: "openid", response_type: "wrong_token" } });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Invalid or missing response_type parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({
          body: { scope: "openid", response_type: "id_token", client_id: "10000000000002" },
        });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Missing redirect_uri parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({
          body: {
            scope: "openid",
            response_type: "id_token",
            client_id: "10000000000002",
            redirect_uri: "https://lpp.home.russfeld.me/lti/provider/redirect13",
          },
        });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Missing login_hint parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({
          body: {
            scope: "openid",
            response_type: "id_token",
            client_id: "10000000000002",
            redirect_uri: "https://lpp.home.russfeld.me/lti/provider/redirect13",
            login_hint: "login_hint_value",
          },
        });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Missing state parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({
          body: {
            scope: "openid",
            response_type: "id_token",
            client_id: "10000000000002",
            redirect_uri: "https://lpp.home.russfeld.me/lti/provider/redirect13",
            login_hint: "login_hint_value",
            state: "state_value",
          },
        });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Invalid or missing response_mode parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({
          body: {
            scope: "openid",
            response_type: "id_token",
            client_id: "10000000000002",
            redirect_uri: "https://lpp.home.russfeld.me/lti/provider/redirect13",
            login_hint: "login_hint_value",
            state: "state_value",
            response_mode: "form_post",
          },
        });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Missing nonce parameter");
      }

      try {
        await lti13Utils.validateAuthRequest({
          body: {
            scope: "openid",
            response_type: "id_token",
            client_id: "10000000000002",
            redirect_uri: "https://lpp.home.russfeld.me/lti/provider/redirect13",
            login_hint: "login_hint_value",
            state: "state_value",
            response_mode: "wrong_response_mode",
          },
        });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Auth Request: Invalid or missing response_mode parameter");
      }
    });

    it("should throw an error if the login state cannot be found in the database", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderLogin: {
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
        await lti13Utils.validateAuthRequest({ body: authRequest });
        throw new Error("Expected validateAuthRequest to throw an error");
      } catch (err) {
        expect(
          models.ProviderLogin.findOne.calledOnceWith({
            where: {
              client_id: authRequest.client_id,
              login_hint: authRequest.login_hint,
            },
          }),
        ).to.be.true;
        expect(err.message).to.equal("Auth Request: No matching login state found for client_id and login_hint");
      }
    });
  });

  const launch_data = {
    key: "thisisaconsumerkey",
    url: "http://localhost:3000/lti/provider/launch",
    deployment_id: "thisisadeploymentid",
    ret_url: "http://localhost:3000/lti/provider/launch",
    context: {
      key: "thisisacontextid",
      label: "This is a context label",
      name: "This is a context title",
    },
    resource: {
      key: "thisisaresourceid",
      name: "This is a resource title",
    },
    user: {
      key: "thisisauserid",
      name: "Test User",
      first_name: "Test",
      last_name: "User",
      email: "testuser@localhost.com",
      image: "https://placehold.co/64x64.png",
    },
    manager: false,
    gradebook_key: "gradebook_key",
    custom: {
      custom_id: "thisisacustomid",
      custom_value: "thisisacustomvalue",
    },
  };

  const consumer_config = {
    deployment_id: "thisisadeploymentid",
    deployment_name: "Test Deployment",
    platform_version: "1.0",
    platform_name: "Test LMS",
  };

  describe("buildLaunchJWT", function () {
    it("should build a launch JWT with the correct claims and sign it with the correct private key", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderKey: {
          findOne: sinon.stub().resolves({ private: privateKey }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(crypto, "createPrivateKey").returns(privateKey);

      // Call the method under test
      const result = await lti13Utils.buildLaunchJWT(
        {
          loginState: { data: launch_data },
          client_id: "thisisaconsumerkey",
          nonce: "thisisanonce",
        },
        consumer_config,
      );

      // Assert the expected results
      expect(result).to.be.a("string");
      const decoded = jsonwebtoken.decode(result, { complete: true });

      // check key id in header
      expect(decoded.header).to.have.property("kid", "thisisaconsumerkey");

      expect(decoded.payload).to.include({
        iss: domain_name + "/",
        aud: "thisisaconsumerkey",
        sub: "thisisauserid",
        nonce: "thisisanonce",
      });
      expect(decoded.payload).to.have.property(
        "https://purl.imsglobal.org/spec/lti/claim/message_type",
        "LtiResourceLinkRequest",
      );
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/version", "1.3.0");
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/resource_link");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/resource_link"]).to.deep.include({
        id: "thisisaresourceid",
        title: "This is a resource title",
      });
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti-ags/claim/endpoint");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"]).to.deep.include({
        lineitem: "http://localhost:3000/lti/consumer/ags/thisisacontextid/thisisaresourceid/gradebook_key",
        lineitems: "http://localhost:3000/lti/consumer/ags/thisisacontextid/line_items",
        scope: [
          "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
          "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
          "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        ],
      });
      expect(decoded.payload).to.have.property(
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id",
        "thisisadeploymentid",
      );
      expect(decoded.payload).to.have.property(
        "https://purl.imsglobal.org/spec/lti/claim/target_link_uri",
        "http://localhost:3000/lti/provider/launch",
      );
      expect(decoded.payload).to.include({
        picture: "https://placehold.co/64x64.png",
        email: "testuser@localhost.com",
        name: "Test User",
        given_name: "Test",
        family_name: "User",
      });
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/context");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/context"]).to.deep.include({
        id: "thisisacontextid",
        label: "This is a context label",
        title: "This is a context title",
        type: ["http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"],
      });
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/tool_platform");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/tool_platform"]).to.deep.include({
        name: "Test Deployment",
        version: "1.0",
        product_family_code: "Test LMS",
        guid: "thisisadeploymentid",
      });
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/launch_presentation");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/launch_presentation"]).to.deep.include({
        document_target: "iframe",
        return_url: "http://localhost:3000/lti/provider/launch",
      });
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/roles");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/roles"]).to.deep.include.members([
        "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student",
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
        "http://purl.imsglobal.org/vocab/lis/v2/system/person#User",
      ]);
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/custom");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/custom"]).to.deep.include({
        custom_id: "thisisacustomid",
        custom_value: "thisisacustomvalue",
      });
      expect(crypto.createPrivateKey.calledOnceWith(privateKey)).to.be.true;

      // Restore stubbed methods
      crypto.createPrivateKey.restore();
    });

    it("should throw an error if the private key cannot be retrieved from the database", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderKey: {
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
        await lti13Utils.buildLaunchJWT(
          {
            loginState: { data: launch_data },
            client_id: "thisisaconsumerkey",
            nonce: "thisisanonce",
          },
          consumer_config,
        );
        throw new Error("Expected buildLaunchJWT to throw an error");
      } catch (err) {
        expect(
          models.ProviderKey.findOne.calledOnceWith({ where: { key: "thisisaconsumerkey" }, attributes: ["private"] }),
        ).to.be.true;
        expect(err.message).to.equal("Launch JWT: Provider key not found");
      }
    });

    it("should handle manager roles correctly in the launch JWT", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderKey: {
          findOne: sinon.stub().resolves({ private: privateKey }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(crypto, "createPrivateKey").returns(privateKey);

      // Call the method under test with manager role
      const result = await lti13Utils.buildLaunchJWT(
        {
          loginState: { data: { ...launch_data, manager: true } },
          client_id: "thisisaconsumerkey",
          nonce: "thisisanonce",
        },
        consumer_config,
      );

      // Assert that the manager role is included in the roles claim
      const decoded = jsonwebtoken.decode(result, { complete: true });
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/roles");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/roles"]).to.deep.include.members([
        "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor",
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
        "http://purl.imsglobal.org/vocab/lis/v2/system/person#User",
      ]);

      // Restore stubbed methods
      crypto.createPrivateKey.restore();
    });
  });

  describe("validateTokenRequest", function () {
    it("should validate a correct token request and return the expected claims", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderKey: {
          findOne: sinon.stub().resolves({ private: "thisisaprivatekey" }),
        },
        Provider: {
          findOne: sinon.stub().resolves({
            client_id: "thisisaconsumerkey",
            keyset_url: "thisisakeyseturl",
            key: "thisisapublickey",
          }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      const decodeStub = sinon.stub(jsonwebtoken, "decode").returns({
        payload: {
          iss: "tokenissuer",
        },
        header: {
          kid: "thisisaconsumerkey",
        },
      });
      const verifyStub = sinon.stub(jsonwebtoken, "verify").resolves();
      const signStub = sinon.stub(jsonwebtoken, "sign").returns("thisisatokenjwt");
      const getSigningKeyStub = sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: sinon.stub().returns("thisisapublickey"),
      });
      const createPrivateKeyStub = sinon.stub(crypto, "createPrivateKey").returns("thisisaprivatekey");

      // Call the method under test with a valid token request
      const tokenRequest = {
        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: "thisisajwt",
        grant_type: "client_credentials",
        scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
      };
      const result = await lti13Utils.validateTokenRequest({ body: tokenRequest });

      // Assert the expected results
      expect(result).to.deep.equal({
        access_token: "thisisatokenjwt",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
      });

      // Assert that the expected library methods were called with the correct arguments
      expect(decodeStub.calledOnceWith(tokenRequest.client_assertion, { complete: true })).to.be.true;
      expect(models.Provider.findOne.calledOnceWith({ where: { client_id: "tokenissuer" } })).to.be.true;
      expect(getSigningKeyStub.calledOnceWith("thisisaconsumerkey")).to.be.true;
      expect(
        verifyStub.calledOnceWith(tokenRequest.client_assertion, "thisisapublickey", {
          algorithms: ["RS256"],
          audience: domain_name + "/lti/consumer/token",
          issuer: "thisisaconsumerkey",
          subject: "thisisaconsumerkey",
        }),
      ).to.be.true;
      expect(models.ProviderKey.findOne.calledOnceWith({ where: { key: "thisisapublickey" }, attributes: ["private"] }))
        .to.be.true;
      expect(createPrivateKeyStub.calledOnceWith("thisisaprivatekey")).to.be.true;
      expect(signStub.calledOnce).to.be.true;

      // Restore stubbed methods
      jsonwebtoken.decode.restore();
      jsonwebtoken.verify.restore();
      jsonwebtoken.sign.restore();
      JwksClient.prototype.getSigningKey.restore();
      crypto.createPrivateKey.restore();
    });

    it("should throw an error if the token request is missing required parameters", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test with missing parameters
        await lti13Utils.validateTokenRequest({ body: {} });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Token Request: Invalid or missing grant_type parameter");
      }

      try {
        await lti13Utils.validateTokenRequest({ body: { grant_type: "wrong_type" } });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Token Request: Invalid or missing grant_type parameter");
      }

      try {
        await lti13Utils.validateTokenRequest({ body: { grant_type: "client_credentials" } });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Token Request: Invalid or missing client_assertion_type parameter");
      }

      try {
        await lti13Utils.validateTokenRequest({
          body: { grant_type: "client_credentials", client_assertion_type: "wrong_assertion_type" },
        });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Token Request: Invalid or missing client_assertion_type parameter");
      }

      try {
        await lti13Utils.validateTokenRequest({
          body: {
            grant_type: "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          },
        });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Token Request: Missing client_assertion parameter");
      }

      try {
        await lti13Utils.validateTokenRequest({
          body: {
            grant_type: "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion: "thisisajwt",
          },
        });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Token Request: Missing scope parameter");
      }
    });

    it("should throw an error if the client assertion is invalid", async function () {
      // Mock Library Dependencies
      const models = {
        Provider: {
          findOne: sinon.stub().resolves(null),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(jsonwebtoken, "decode").throws(new Error("Invalid JWT"));

      try {
        // Call the method under test with an invalid client assertion
        await lti13Utils.validateTokenRequest({
          body: {
            grant_type: "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion: "thisisajwt",
            scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
          },
        });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(jsonwebtoken.decode.calledOnceWith("thisisajwt", { complete: true })).to.be.true;
        expect(err.message).to.equal("Token Request: Invalid JWT in client_assertion parameter: Invalid JWT");
      }
    });

    it("should throw an error if no matching provider is found for the client_id in the token request", async function () {
      // Mock Library Dependencies
      const models = {
        Provider: {
          findOne: sinon.stub().resolves(null),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(jsonwebtoken, "decode").returns({
        payload: {
          iss: "tokenissuer",
        },
        header: {
          kid: "thisisaconsumerkey",
        },
      });

      try {
        // Call the method under test with a token request that has no matching provider
        await lti13Utils.validateTokenRequest({
          body: {
            grant_type: "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion: "thisisajwt",
            scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
          },
        });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(jsonwebtoken.decode.calledOnceWith("thisisajwt", { complete: true })).to.be.true;
        expect(models.Provider.findOne.calledOnceWith({ where: { client_id: "tokenissuer" } })).to.be.true;
        expect(err.message).to.equal("Token Request: No matching provider found for JWT kid");
      }
    });

    it("should throw an error if the client assertion signature is invalid", async function () {
      // Mock Library Dependencies
      const models = {
        Provider: {
          findOne: sinon.stub().resolves({
            client_id: "thisisaconsumerkey",
            keyset_url: "thisisakeyseturl",
            key: "thisisapublickey",
          }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(jsonwebtoken, "decode").returns({
        payload: {
          iss: "tokenissuer",
        },
        header: {
          kid: "thisisaconsumerkey",
        },
      });
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: sinon.stub().returns("thisisapublickey"),
      });
      sinon.stub(jsonwebtoken, "verify").throws(new Error("Invalid signature"));

      try {
        // Call the method under test with a token request that has an invalid signature
        await lti13Utils.validateTokenRequest({
          body: {
            grant_type: "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion: "thisisajwt",
            scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
          },
        });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(jsonwebtoken.decode.calledOnceWith("thisisajwt", { complete: true })).to.be.true;
        expect(models.Provider.findOne.calledOnceWith({ where: { client_id: "tokenissuer" } })).to.be.true;
        expect(JwksClient.prototype.getSigningKey.calledOnceWith("thisisaconsumerkey")).to.be.true;
        expect(
          jsonwebtoken.verify.calledOnceWith("thisisajwt", "thisisapublickey", {
            algorithms: ["RS256"],
            audience: domain_name + "/lti/consumer/token",
            issuer: "thisisaconsumerkey",
            subject: "thisisaconsumerkey",
          }),
        ).to.be.true;
        expect(err.message).to.equal("Token Request: Unable to verify JWT: Invalid signature");
      }
    });

    it("should throw an error if the scopes are invalid", async function () {
      // Mock Library Dependencies
      const models = {
        Provider: {
          findOne: sinon.stub().resolves({
            client_id: "thisisaconsumerkey",
            keyset_url: "thisisakeyseturl",
            key: "thisisapublickey",
          }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(jsonwebtoken, "decode").returns({
        payload: {
          iss: "tokenissuer",
        },
        header: {
          kid: "thisisaconsumerkey",
        },
      });
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: sinon.stub().returns("thisisapublickey"),
      });
      sinon.stub(jsonwebtoken, "verify").resolves();

      try {
        // Call the method under test with a token request that has invalid scopes
        await lti13Utils.validateTokenRequest({
          body: {
            grant_type: "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion: "thisisajwt",
            scope: "invalid_scope",
          },
        });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(jsonwebtoken.decode.calledOnceWith("thisisajwt", { complete: true })).to.be.true;
        expect(models.Provider.findOne.calledOnceWith({ where: { client_id: "tokenissuer" } })).to.be.true;
        expect(JwksClient.prototype.getSigningKey.calledOnceWith("thisisaconsumerkey")).to.be.true;
        expect(
          jsonwebtoken.verify.calledOnceWith("thisisajwt", "thisisapublickey", {
            algorithms: ["RS256"],
            audience: domain_name + "/lti/consumer/token",
            issuer: "thisisaconsumerkey",
            subject: "thisisaconsumerkey",
          }),
        ).to.be.true;
        expect(err.message).to.equal("Token Request: Required scope not included in scope parameter");
      }
    });

    it("should throw an error if the provider's private key cannot be retrieved from the database", async function () {
      // Mock Library Dependencies
      const models = {
        Provider: {
          findOne: sinon.stub().resolves({
            client_id: "thisisaconsumerkey",
            keyset_url: "thisisakeyseturl",
            key: "thisisapublickey",
          }),
        },
        ProviderKey: {
          findOne: sinon.stub().resolves(null),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(jsonwebtoken, "decode").returns({
        payload: {
          iss: "tokenissuer",
        },
        header: {
          kid: "thisisaconsumerkey",
        },
      });
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: sinon.stub().returns("thisisapublickey"),
      });
      sinon.stub(jsonwebtoken, "verify").resolves();

      try {
        // Call the method under test with a token request that has a provider whose private key cannot be retrieved
        await lti13Utils.validateTokenRequest({
          body: {
            grant_type: "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion: "thisisajwt",
            scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
          },
        });
        throw new Error("Expected validateTokenRequest to throw an error");
      } catch (err) {
        expect(jsonwebtoken.decode.calledOnceWith("thisisajwt", { complete: true })).to.be.true;
        expect(models.Provider.findOne.calledOnceWith({ where: { client_id: "tokenissuer" } })).to.be.true;
        expect(JwksClient.prototype.getSigningKey.calledOnceWith("thisisaconsumerkey")).to.be.true;
        expect(
          jsonwebtoken.verify.calledOnceWith("thisisajwt", "thisisapublickey", {
            algorithms: ["RS256"],
            audience: domain_name + "/lti/consumer/token",
            issuer: "thisisaconsumerkey",
            subject: "thisisaconsumerkey",
          }),
        ).to.be.true;
        expect(
          models.ProviderKey.findOne.calledOnceWith({ where: { key: "thisisapublickey" }, attributes: ["private"] }),
        ).to.be.true;
        expect(err.message).to.equal("Token Request: No matching key found for JWT kid");
      }
    });

    it("should accept lineitem.readonly scope alone and return it as the granted scope", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderKey: {
          findOne: sinon.stub().resolves({ private: "thisisaprivatekey" }),
        },
        Provider: {
          findOne: sinon.stub().resolves({
            client_id: "thisisaconsumerkey",
            keyset_url: "thisisakeyseturl",
            key: "thisisapublickey",
          }),
        },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(jsonwebtoken, "decode").returns({ payload: { iss: "tokenissuer" }, header: { kid: "thisisaconsumerkey" } });
      sinon.stub(jsonwebtoken, "verify").resolves();
      sinon.stub(jsonwebtoken, "sign").returns("thisisatokenjwt");
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({ getPublicKey: sinon.stub().returns("thisisapublickey") });
      sinon.stub(crypto, "createPrivateKey").returns("thisisaprivatekey");

      const result = await lti13Utils.validateTokenRequest({
        body: {
          grant_type: "client_credentials",
          client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: "thisisajwt",
          scope: "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
        },
      });

      expect(result).to.deep.equal({
        access_token: "thisisatokenjwt",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
      });

      jsonwebtoken.decode.restore();
      jsonwebtoken.verify.restore();
      jsonwebtoken.sign.restore();
      JwksClient.prototype.getSigningKey.restore();
      crypto.createPrivateKey.restore();
    });

    it("should only grant supported scopes when a mix of valid and invalid scopes is requested", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderKey: {
          findOne: sinon.stub().resolves({ private: "thisisaprivatekey" }),
        },
        Provider: {
          findOne: sinon.stub().resolves({
            client_id: "thisisaconsumerkey",
            keyset_url: "thisisakeyseturl",
            key: "thisisapublickey",
          }),
        },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(jsonwebtoken, "decode").returns({ payload: { iss: "tokenissuer" }, header: { kid: "thisisaconsumerkey" } });
      sinon.stub(jsonwebtoken, "verify").resolves();
      sinon.stub(jsonwebtoken, "sign").returns("thisisatokenjwt");
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({ getPublicKey: sinon.stub().returns("thisisapublickey") });
      sinon.stub(crypto, "createPrivateKey").returns("thisisaprivatekey");

      const result = await lti13Utils.validateTokenRequest({
        body: {
          grant_type: "client_credentials",
          client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: "thisisajwt",
          scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly unsupported_scope",
        },
      });

      // Only the three valid scopes should be granted, unsupported_scope should be filtered out
      expect(result.scope).to.equal(
        "https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
      );

      jsonwebtoken.decode.restore();
      jsonwebtoken.verify.restore();
      jsonwebtoken.sign.restore();
      JwksClient.prototype.getSigningKey.restore();
      crypto.createPrivateKey.restore();
    });
  });

  describe("validateAGSGradePassback", function () {
    it("should validate a correct AGS grade passback request and return the expected claims", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Call the method under test with a valid AGS grade passback request
      const gradePassbackRequest = {
        body: {
          timestamp: "2024-06-01T12:00:00Z",
          scoreGiven: 0.85,
          scoreMaximum: 1.0,
          userId: "thisisauserid",
          activityProgress: "Completed",
          gradingProgress: "FullyGraded",
        },
        lti13Token: {
          scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        },
      };
      const result = await lti13Utils.validateAGSGradePassback(gradePassbackRequest);

      // Assert the expected results
      expect(result).to.deep.equal({
        timestamp: "2024-06-01T12:00:00Z",
        scoreGiven: 0.85,
        scoreMaximum: 1.0,
        userId: "thisisauserid",
        activityProgress: "Completed",
        gradingProgress: "FullyGraded",
      });
    });

    it("should throw an error if the AGS grade passback request is missing required parameters", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test with missing parameters
        await lti13Utils.validateAGSGradePassback({
          body: {},
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Missing timestamp parameter");
      }

      try {
        await lti13Utils.validateAGSGradePassback({
          body: { timestamp: "2024-06-01T12:00:00Z" },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Missing scoreGiven parameter");
      }

      try {
        await lti13Utils.validateAGSGradePassback({
          body: { timestamp: "2024-06-01T12:00:00Z", scoreGiven: undefined },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Missing scoreGiven parameter");
      }

      try {
        await lti13Utils.validateAGSGradePassback({
          body: { timestamp: "2024-06-01T12:00:00Z", scoreGiven: 0.85 },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Missing scoreMaximum parameter");
      }

      try {
        await lti13Utils.validateAGSGradePassback({
          body: { timestamp: "2024-06-01T12:00:00Z", scoreGiven: 0.85, scoreMaximum: undefined },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Missing scoreMaximum parameter");
      }

      try {
        await lti13Utils.validateAGSGradePassback({
          body: { timestamp: "2024-06-01T12:00:00Z", scoreGiven: 0.85, scoreMaximum: 1.0 },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Missing userId parameter");
      }

      try {
        await lti13Utils.validateAGSGradePassback({
          body: { timestamp: "2024-06-01T12:00:00Z", scoreGiven: 0.85, scoreMaximum: 1.0, userId: "thisisauserid" },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Missing activityProgress parameter");
      }

      try {
        await lti13Utils.validateAGSGradePassback({
          body: {
            timestamp: "2024-06-01T12:00:00Z",
            scoreGiven: 0.85,
            scoreMaximum: 1.0,
            userId: "thisisauserid",
            activityProgress: "Completed",
          },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Missing gradingProgress parameter");
      }
    });

    it("should throw an error if the AGS grade passback request is missing the required scope", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test with a request that is missing the required scope
        await lti13Utils.validateAGSGradePassback({
          body: {
            timestamp: "2024-06-01T12:00:00Z",
            scoreGiven: 0.85,
            scoreMaximum: 1.0,
            userId: "thisisauserid",
            activityProgress: "Completed",
            gradingProgress: "FullyGraded",
          },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Insufficient permissions for AGS grade post");
      }

      try {
        // Call the method under test with a request that is missing the required scope
        await lti13Utils.validateAGSGradePassback({
          body: {
            timestamp: "2024-06-01T12:00:00Z",
            scoreGiven: 0.85,
            scoreMaximum: 1.0,
            userId: "thisisauserid",
            activityProgress: "Completed",
            gradingProgress: "FullyGraded",
          },
          lti13Token: {},
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Insufficient permissions for AGS grade post");
      }

      try {
        // Call the method under test with a request that is missing the required scope
        await lti13Utils.validateAGSGradePassback({
          body: {
            timestamp: "2024-06-01T12:00:00Z",
            scoreGiven: 0.85,
            scoreMaximum: 1.0,
            userId: "thisisauserid",
            activityProgress: "Completed",
            gradingProgress: "FullyGraded",
          },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: Insufficient permissions for AGS grade post");
      }
    });

    it("should throw an error if the scores are not floats", async function () {
      // Mock Library Dependencies
      const models = {};
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test with non-float scores
        await lti13Utils.validateAGSGradePassback({
          body: {
            timestamp: "2024-06-01T12:00:00Z",
            scoreGiven: "text",
            scoreMaximum: "text",
            userId: "thisisauserid",
            activityProgress: "Completed",
            gradingProgress: "FullyGraded",
          },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: scoreGiven and scoreMaximum must be valid numbers");
      }

      try {
        // Call the method under test with non-float scores
        await lti13Utils.validateAGSGradePassback({
          body: {
            timestamp: "2024-06-01T12:00:00Z",
            scoreGiven: "0.85",
            scoreMaximum: "text",
            userId: "thisisauserid",
            activityProgress: "Completed",
            gradingProgress: "FullyGraded",
          },
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSGradePassback to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Grade Post Request: scoreGiven and scoreMaximum must be valid numbers");
      }
    });
  });

  describe("handleDynamicRegistrationRequest", function () {
    it("should validate a correct dynamic registration request and return the expected claims", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderRegistration: {
          create: sinon.stub().resolves({ registration_token: "thisisaregistrationtoken" }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(ky, "get").resolves({
        ok: true,
        text: async () => "responsetext",
      });

      // Call the method under test with a valid dynamic registration request
      const result = await lti13Utils.handleDynamicRegistrationRequest("thisisaurl", "/lti/consumer");

      // Assert the expected results
      expect(result).to.equal("responsetext");
      expect(models.ProviderRegistration.create.calledOnceWith({ token: sinon.match.string, url: "thisisaurl" })).to.be
        .true;
      const token = models.ProviderRegistration.create.firstCall.args[0].token;
      expect(token).to.match(/^[\w-]{21}$/);
      expect(ky.get.calledOnceWith(sinon.match.string, { method: "GET", headers: { "Content-Type": "text/html" } })).to
        .be.true;
      const url = ky.get.firstCall.args[0];
      expect(url).to.match(
        /^thisisaurl\?registration_token=[\w-]{21}&openid_configuration=http%3A%2F%2Flocalhost%3A3000%2Flti%2Fconsumer%2Fopenid-configuration$/,
      );

      // Restore stubbed methods
      ky.get.restore();
    });

    it("should throw an error if the dynamic registration request fails", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderRegistration: {
          create: sinon.stub().resolves({ registration_token: "thisisaregistrationtoken" }),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub library methods
      sinon.stub(ky, "get").resolves({
        ok: false,
        statusText: "Bad Request",
      });

      try {
        // Call the method under test with a request that results in an error response
        await lti13Utils.handleDynamicRegistrationRequest("thisisaurl", "/lti/consumer");
        throw new Error("Expected handleDynamicRegistrationRequest to throw an error");
      } catch (err) {
        expect(models.ProviderRegistration.create.calledOnceWith({ token: sinon.match.string, url: "thisisaurl" })).to
          .be.true;
        const token = models.ProviderRegistration.create.firstCall.args[0].token;
        expect(token).to.match(/^[\w-]{21}$/);
        expect(ky.get.calledOnceWith(sinon.match.string, { method: "GET", headers: { "Content-Type": "text/html" } }))
          .to.be.true;
        const url = ky.get.firstCall.args[0];
        expect(url).to.match(
          /^thisisaurl\?registration_token=[\w-]{21}&openid_configuration=http%3A%2F%2Flocalhost%3A3000%2Flti%2Fconsumer%2Fopenid-configuration$/,
        );
        expect(err.message).to.equal("Failed to fetch registration configuration from URL: " + "thisisaurl");
      }

      // Restore stubbed methods
      ky.get.restore();
    });

    it("should throw an error if the registration token cannot be created in the database", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderRegistration: {
          create: sinon.stub().resolves(null),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test with a request that results in a database error
        await lti13Utils.handleDynamicRegistrationRequest("thisisaurl", "/lti/consumer");
        throw new Error("Expected handleDynamicRegistrationRequest to throw an error");
      } catch (err) {
        expect(models.ProviderRegistration.create.calledOnceWith({ token: sinon.match.string, url: "thisisaurl" })).to
          .be.true;
        const token = models.ProviderRegistration.create.firstCall.args[0].token;
        expect(token).to.match(/^[\w-]{21}$/);
        expect(err.message).to.equal("Failed to create LTI 1.3 Dynamic Registration Token: Database Error");
      }
    });

    it("should throw an error if the database throws an error creating the token", async function () {
      // Mock Library Dependencies
      const models = {
        ProviderRegistration: {
          create: sinon.stub().rejects(new Error("Database error")),
        },
      };
      const logger = {
        lti: sinon.stub(),
        silly: sinon.stub(),
      };

      // Create instance of LTI13Utils
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        // Call the method under test with a request that results in a database error
        await lti13Utils.handleDynamicRegistrationRequest("thisisaurl", "/lti/consumer");
        throw new Error("Expected handleDynamicRegistrationRequest to throw an error");
      } catch (err) {
        expect(models.ProviderRegistration.create.calledOnceWith({ token: sinon.match.string, url: "thisisaurl" })).to
          .be.true;
        const token = models.ProviderRegistration.create.firstCall.args[0].token;
        expect(token).to.match(/^[\w-]{21}$/);
        expect(err.message).to.equal("Failed to create LTI 1.3 Dynamic Registration Token: Database error");
      }
    });
  });

  describe("validateAGSLineItemRequest", function () {
    it("should pass validation when token has lineitem.readonly scope", function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      lti13Utils.validateAGSLineItemRequest({
        lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly" },
      });
    });

    it("should pass validation when token has lineitem scope", function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      lti13Utils.validateAGSLineItemRequest({
        lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem" },
      });
    });

    it("should throw if lti13Token is missing from the request", function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        lti13Utils.validateAGSLineItemRequest({});
        throw new Error("Expected validateAGSLineItemRequest to throw");
      } catch (err) {
        expect(err.message).to.equal("Line Item Request: Insufficient permissions for AGS line item read");
      }
    });

    it("should throw if lti13Token has no scope property", function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        lti13Utils.validateAGSLineItemRequest({ lti13Token: {} });
        throw new Error("Expected validateAGSLineItemRequest to throw");
      } catch (err) {
        expect(err.message).to.equal("Line Item Request: Insufficient permissions for AGS line item read");
      }
    });

    it("should throw if the token scope does not include a lineitem scope", function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        lti13Utils.validateAGSLineItemRequest({
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSLineItemRequest to throw");
      } catch (err) {
        expect(err.message).to.equal("Line Item Request: Insufficient permissions for AGS line item read");
      }
    });
  });

  describe("validateAGSResultRequest", function () {
    it("should pass validation when token has result.readonly scope", function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      lti13Utils.validateAGSResultRequest({
        lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly" },
      });
    });

    it("should throw if lti13Token is missing from the request", function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        lti13Utils.validateAGSResultRequest({});
        throw new Error("Expected validateAGSResultRequest to throw");
      } catch (err) {
        expect(err.message).to.equal("Result Request: Insufficient permissions for AGS result read");
      }
    });

    it("should throw if the token scope does not include result.readonly", function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        lti13Utils.validateAGSResultRequest({
          lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
        });
        throw new Error("Expected validateAGSResultRequest to throw");
      } catch (err) {
        expect(err.message).to.equal("Result Request: Insufficient permissions for AGS result read");
      }
    });
  });

  describe("getAGSLineItem", function () {
    it("should fetch a line item with the correct token and headers", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      const lineItemData = {
        id: "http://example.com/lineitems/1",
        scoreMaximum: 100,
        label: "Assignment 1",
        resourceLinkId: "resource1",
      };
      sinon.stub(ky, "get").returns({ json: sinon.stub().resolves(lineItemData) });

      const result = await lti13Utils.getAGSLineItem("thisisaconsumerkey", "http://example.com/lineitems/1");

      expect(result).to.deep.equal(lineItemData);
      expect(
        lti13Utils.getAccessToken.calledOnceWith(
          "thisisaconsumerkey",
          "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
        ),
      ).to.be.true;
      expect(ky.get.firstCall.args[0]).to.equal("http://example.com/lineitems/1");
      expect(ky.get.firstCall.args[1]).to.shallowDeepEqual({
        headers: {
          Authorization: "Bearer thisisatoken",
          Accept: "application/vnd.ims.lis.v2.lineitem+json",
        },
      });

      lti13Utils.getAccessToken.restore();
      ky.get.restore();
    });

    it("should throw a wrapped error if the HTTP request fails", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      sinon.stub(ky, "get").returns({ json: sinon.stub().rejects(new Error("Connection refused")) });

      try {
        await lti13Utils.getAGSLineItem("thisisaconsumerkey", "http://example.com/lineitems/1");
        throw new Error("Expected getAGSLineItem to throw");
      } catch (err) {
        expect(err.message).to.equal("Get AGS Line Item: Failed to fetch line item: Connection refused");
      } finally {
        lti13Utils.getAccessToken.restore();
        ky.get.restore();
      }
    });
  });

  describe("getAGSLineItems", function () {
    it("should fetch line items without a resource_link_id filter", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      const lineItemsData = [
        { id: "http://example.com/lineitems/1", scoreMaximum: 100, label: "Assignment 1", resourceLinkId: "resource1" },
      ];
      sinon.stub(ky, "get").returns({ json: sinon.stub().resolves(lineItemsData) });

      const result = await lti13Utils.getAGSLineItems("thisisaconsumerkey", "http://example.com/lineitems");

      expect(result).to.deep.equal(lineItemsData);
      expect(
        lti13Utils.getAccessToken.calledOnceWith(
          "thisisaconsumerkey",
          "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
        ),
      ).to.be.true;
      expect(ky.get.firstCall.args[0]).to.equal("http://example.com/lineitems");
      expect(ky.get.firstCall.args[1]).to.shallowDeepEqual({
        headers: {
          Authorization: "Bearer thisisatoken",
          Accept: "application/vnd.ims.lis.v2.lineitemcontainer+json",
        },
      });

      lti13Utils.getAccessToken.restore();
      ky.get.restore();
    });

    it("should append resource_link_id as a query parameter when provided", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      sinon.stub(ky, "get").returns({ json: sinon.stub().resolves([]) });

      await lti13Utils.getAGSLineItems("thisisaconsumerkey", "http://example.com/lineitems", "resource1");

      expect(ky.get.firstCall.args[0]).to.equal("http://example.com/lineitems?resource_link_id=resource1");

      lti13Utils.getAccessToken.restore();
      ky.get.restore();
    });

    it("should throw a wrapped error if the HTTP request fails", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      sinon.stub(ky, "get").returns({ json: sinon.stub().rejects(new Error("Connection refused")) });

      try {
        await lti13Utils.getAGSLineItems("thisisaconsumerkey", "http://example.com/lineitems");
        throw new Error("Expected getAGSLineItems to throw");
      } catch (err) {
        expect(err.message).to.equal("Get AGS Line Items: Failed to fetch line items: Connection refused");
      } finally {
        lti13Utils.getAccessToken.restore();
        ky.get.restore();
      }
    });
  });

  describe("getAGSResults", function () {
    it("should fetch results without a user_id filter", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      const resultsData = [
        { id: "http://example.com/results/user1", scoreOf: "http://example.com/lineitems/1", userId: "user1", resultScore: 85, resultMaximum: 100 },
      ];
      sinon.stub(ky, "get").returns({ json: sinon.stub().resolves(resultsData) });

      const result = await lti13Utils.getAGSResults("thisisaconsumerkey", "http://example.com/results");

      expect(result).to.deep.equal(resultsData);
      expect(
        lti13Utils.getAccessToken.calledOnceWith(
          "thisisaconsumerkey",
          "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
        ),
      ).to.be.true;
      expect(ky.get.firstCall.args[0]).to.equal("http://example.com/results");
      expect(ky.get.firstCall.args[1]).to.shallowDeepEqual({
        headers: {
          Authorization: "Bearer thisisatoken",
          Accept: "application/vnd.ims.lis.v2.resultcontainer+json",
        },
      });

      lti13Utils.getAccessToken.restore();
      ky.get.restore();
    });

    it("should append user_id as a query parameter when provided", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      sinon.stub(ky, "get").returns({ json: sinon.stub().resolves([]) });

      await lti13Utils.getAGSResults("thisisaconsumerkey", "http://example.com/results", "user1");

      expect(ky.get.firstCall.args[0]).to.equal("http://example.com/results?user_id=user1");

      lti13Utils.getAccessToken.restore();
      ky.get.restore();
    });

    it("should throw a wrapped error if the HTTP request fails", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(lti13Utils, "getAccessToken").resolves({
        token_type: "Bearer",
        access_token: "thisisatoken",
      });

      sinon.stub(ky, "get").returns({ json: sinon.stub().rejects(new Error("Connection refused")) });

      try {
        await lti13Utils.getAGSResults("thisisaconsumerkey", "http://example.com/results");
        throw new Error("Expected getAGSResults to throw");
      } catch (err) {
        expect(err.message).to.equal("Get AGS Results: Failed to fetch results: Connection refused");
      } finally {
        lti13Utils.getAccessToken.restore();
        ky.get.restore();
      }
    });
  });

  const deep_link_data = {
    key: "thisisaconsumerkey",
    url: "http://localhost:3000/lti/provider/launch",
    deployment_id: "thisisadeploymentid",
    ret_url: "http://localhost:3000/return",
    context: {
      key: "thisisacontextid",
      label: "This is a context label",
      name: "This is a context title",
    },
    user: {
      key: "thisisauserid",
      name: "Test User",
      first_name: "Test",
      last_name: "User",
      email: "testuser@localhost.com",
      image: "https://placehold.co/64x64.png",
    },
    deep_link_token: "thisisadeeplinktoken",
    settings: {},
  };

  describe("buildDeepLinkJWT", function () {
    it("should build a deep link JWT with the correct claims and sign it with the correct private key", async function () {
      const models = {
        ProviderKey: {
          findOne: sinon.stub().resolves({ private: privateKey }),
        },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(crypto, "createPrivateKey").returns(privateKey);

      const result = await lti13Utils.buildDeepLinkJWT(
        {
          loginState: { data: deep_link_data },
          client_id: "thisisaconsumerkey",
          nonce: "thisisanonce",
        },
        consumer_config,
      );

      expect(result).to.be.a("string");
      const decoded = jsonwebtoken.decode(result, { complete: true });

      expect(decoded.header).to.have.property("kid", "thisisaconsumerkey");
      expect(decoded.payload).to.include({
        iss: domain_name + "/",
        aud: "thisisaconsumerkey",
        sub: "thisisauserid",
        nonce: "thisisanonce",
      });
      expect(decoded.payload).to.have.property(
        "https://purl.imsglobal.org/spec/lti/claim/message_type",
        "LtiDeepLinkingRequest",
      );
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/version", "1.3.0");
      expect(decoded.payload).to.not.have.property("https://purl.imsglobal.org/spec/lti/claim/resource_link");
      expect(decoded.payload).to.not.have.property("https://purl.imsglobal.org/spec/lti-ags/claim/endpoint");
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings");
      const dlSettings = decoded.payload["https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings"];
      expect(dlSettings.deep_link_return_url).to.include("/lti/consumer/deeplink/thisisadeeplinktoken");
      expect(dlSettings.accept_types).to.deep.equal(["ltiResourceLink"]);
      expect(dlSettings.accept_presentation_document_targets).to.deep.equal(["iframe", "window"]);
      expect(dlSettings.accept_multiple).to.be.false;
      expect(decoded.payload).to.have.property(
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id",
        "thisisadeploymentid",
      );
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/context");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/context"]).to.deep.include({
        id: "thisisacontextid",
        label: "This is a context label",
        title: "This is a context title",
      });
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/tool_platform");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/launch_presentation"]).to.deep.include({
        document_target: "iframe",
        return_url: "http://localhost:3000/return",
      });

      crypto.createPrivateKey.restore();
    });

    it("should honour custom deep linking settings when building a deep link JWT", async function () {
      const models = {
        ProviderKey: {
          findOne: sinon.stub().resolves({ private: privateKey }),
        },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);
      sinon.stub(crypto, "createPrivateKey").returns(privateKey);

      const result = await lti13Utils.buildDeepLinkJWT(
        {
          loginState: {
            data: {
              ...deep_link_data,
              settings: {
                accept_types: ["link", "html"],
                accept_presentation_document_targets: ["window"],
                accept_multiple: true,
              },
            },
          },
          client_id: "thisisaconsumerkey",
          nonce: "thisisanonce",
        },
        consumer_config,
      );

      const decoded = jsonwebtoken.decode(result, { complete: true });
      const dlSettings = decoded.payload["https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings"];
      expect(dlSettings.accept_types).to.deep.equal(["link", "html"]);
      expect(dlSettings.accept_presentation_document_targets).to.deep.equal(["window"]);
      expect(dlSettings.accept_multiple).to.be.true;

      crypto.createPrivateKey.restore();
    });

    it("should use default deep linking settings when no settings are provided", async function () {
      const models = {
        ProviderKey: { findOne: sinon.stub().resolves({ private: privateKey }) },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);
      sinon.stub(crypto, "createPrivateKey").returns(privateKey);

      // Omit settings entirely from data
      const { settings: _unused, ...dataWithoutSettings } = deep_link_data;
      const result = await lti13Utils.buildDeepLinkJWT(
        { loginState: { data: dataWithoutSettings }, client_id: "thisisaconsumerkey", nonce: "thisisanonce" },
        consumer_config,
      );

      const decoded = jsonwebtoken.decode(result, { complete: true });
      const dlSettings = decoded.payload["https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings"];
      expect(dlSettings.accept_types).to.deep.equal(["ltiResourceLink"]);
      expect(dlSettings.accept_multiple).to.be.false;

      crypto.createPrivateKey.restore();
    });

    it("should include the custom claim in the deep link JWT when custom data is provided", async function () {
      const models = {
        ProviderKey: {
          findOne: sinon.stub().resolves({ private: privateKey }),
        },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);
      sinon.stub(crypto, "createPrivateKey").returns(privateKey);

      const result = await lti13Utils.buildDeepLinkJWT(
        {
          loginState: {
            data: {
              ...deep_link_data,
              custom: { custom_id: "thisisacustomid", custom_value: "thisisacustomvalue" },
            },
          },
          client_id: "thisisaconsumerkey",
          nonce: "thisisanonce",
        },
        consumer_config,
      );

      const decoded = jsonwebtoken.decode(result, { complete: true });
      expect(decoded.payload).to.have.property("https://purl.imsglobal.org/spec/lti/claim/custom");
      expect(decoded.payload["https://purl.imsglobal.org/spec/lti/claim/custom"]).to.deep.include({
        custom_id: "thisisacustomid",
        custom_value: "thisisacustomvalue",
      });

      crypto.createPrivateKey.restore();
    });

    it("should throw an error if the private key cannot be retrieved for buildDeepLinkJWT", async function () {
      const models = {
        ProviderKey: {
          findOne: sinon.stub().resolves(null),
        },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        await lti13Utils.buildDeepLinkJWT(
          {
            loginState: { data: deep_link_data },
            client_id: "thisisaconsumerkey",
            nonce: "thisisanonce",
          },
          consumer_config,
        );
        throw new Error("Expected buildDeepLinkJWT to throw an error");
      } catch (err) {
        expect(err.message).to.equal("Deep Link JWT: Provider key not found");
      }
    });
  });

  describe("verifyDeepLinkResponse", function () {
    it("should verify a valid deep link response JWT and return content items and context", async function () {
      const destroy = sinon.stub().resolves();
      const deepLinkRecord = {
        provider_key: "thisisakey",
        context: { ret_url: "http://example.com/return" },
        destroy,
      };
      const providerRecord = {
        client_id: "provider-client-id",
        keyset_url: "https://example.com/jwks",
      };

      // Sign a valid deep link response JWT with the test private key
      const contentItems = [{ type: "ltiResourceLink", url: "http://example.com/resource" }];
      const jwtPayload = {
        "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": contentItems,
        iss: "provider-client-id",
        aud: "http://localhost:3000/",
      };
      const signedJwt = jsonwebtoken.sign(jwtPayload, privateKey, {
        algorithm: "RS256",
        keyid: "test-kid",
        expiresIn: "1h",
      });

      const models = {
        ProviderDeepLink: {
          findOne: sinon.stub().resolves(deepLinkRecord),
        },
        Provider: {
          findOne: sinon.stub().resolves(providerRecord),
        },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Stub the JWKS client
      const getPublicKeyStub = sinon.stub().returns(publicKey);
      const getSigningKeyStub = sinon.stub().resolves({ getPublicKey: getPublicKeyStub });
      sinon.stub(JwksClient.prototype, "getSigningKey").callsFake(getSigningKeyStub);

      const result = await lti13Utils.verifyDeepLinkResponse({
        params: { token: "test_token" },
        body: { JWT: signedJwt },
      });

      expect(result.content_items).to.deep.equal(contentItems);
      expect(result.context).to.deep.include({ ret_url: "http://example.com/return" });
      expect(destroy.calledOnce).to.be.true;

      JwksClient.prototype.getSigningKey.restore();
    });

    it("should default content_items to an empty array if the claim is absent", async function () {
      const destroy = sinon.stub().resolves();
      const deepLinkRecord = { provider_key: "thisisakey", context: {}, destroy };
      const providerRecord = { client_id: "provider-client-id", keyset_url: "https://example.com/jwks" };

      const signedJwt = jsonwebtoken.sign(
        { iss: "provider-client-id", aud: "http://localhost:3000/" },
        privateKey,
        { algorithm: "RS256", keyid: "test-kid", expiresIn: "1h" },
      );

      const models = {
        ProviderDeepLink: { findOne: sinon.stub().resolves(deepLinkRecord) },
        Provider: { findOne: sinon.stub().resolves(providerRecord) },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({ getPublicKey: () => publicKey });

      const result = await lti13Utils.verifyDeepLinkResponse({
        params: { token: "test_token" },
        body: { JWT: signedJwt },
      });

      expect(result.content_items).to.deep.equal([]);

      JwksClient.prototype.getSigningKey.restore();
    });

    it("should throw if no token is provided in verifyDeepLinkResponse", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        await lti13Utils.verifyDeepLinkResponse({ params: {}, body: { JWT: "test" } });
        throw new Error("Expected verifyDeepLinkResponse to throw");
      } catch (err) {
        expect(err.message).to.equal("Deep Link Response: No token provided");
      }
    });

    it("should throw if no JWT body is provided in verifyDeepLinkResponse", async function () {
      const models = {};
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        await lti13Utils.verifyDeepLinkResponse({ params: { token: "t" }, body: {} });
        throw new Error("Expected verifyDeepLinkResponse to throw");
      } catch (err) {
        expect(err.message).to.equal("Deep Link Response: No JWT provided");
      }
    });

    it("should throw if the deep link token is not found in the database", async function () {
      const models = {
        ProviderDeepLink: { findOne: sinon.stub().resolves(null) },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        await lti13Utils.verifyDeepLinkResponse({ params: { token: "t" }, body: { JWT: "j" } });
        throw new Error("Expected verifyDeepLinkResponse to throw");
      } catch (err) {
        expect(err.message).to.equal("Deep Link Response: Invalid or expired token");
      }
    });

    it("should throw if the provider is not found during verifyDeepLinkResponse", async function () {
      const models = {
        ProviderDeepLink: {
          findOne: sinon.stub().resolves({ provider_key: "k", context: {}, destroy: sinon.stub() }),
        },
        Provider: { findOne: sinon.stub().resolves(null) },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        await lti13Utils.verifyDeepLinkResponse({ params: { token: "t" }, body: { JWT: "j" } });
        throw new Error("Expected verifyDeepLinkResponse to throw");
      } catch (err) {
        expect(err.message).to.equal("Deep Link Response: Provider not found");
      }
    });

    it("should throw if the JWT cannot be decoded in verifyDeepLinkResponse", async function () {
      const models = {
        ProviderDeepLink: {
          findOne: sinon.stub().resolves({ provider_key: "k", context: {}, destroy: sinon.stub() }),
        },
        Provider: { findOne: sinon.stub().resolves({ client_id: "cid", keyset_url: "http://ex.com/jwks" }) },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      try {
        await lti13Utils.verifyDeepLinkResponse({ params: { token: "t" }, body: { JWT: "not.a.valid.jwt" } });
        throw new Error("Expected verifyDeepLinkResponse to throw");
      } catch (err) {
        expect(err.message).to.equal("Deep Link Response: Unable to decode JWT");
      }
    });

    it("should throw if JWT signature verification fails in verifyDeepLinkResponse", async function () {
      const deepLinkRecord = { provider_key: "k", context: {}, destroy: sinon.stub() };
      const providerRecord = { client_id: "provider-client-id", keyset_url: "https://example.com/jwks" };

      // Sign with a different key so verification fails
      const { privateKey: wrongKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs1", format: "pem" },
      });
      const signedJwt = jsonwebtoken.sign(
        { iss: "provider-client-id", aud: "http://localhost:3000/" },
        wrongKey,
        { algorithm: "RS256", keyid: "test-kid", expiresIn: "1h" },
      );

      const models = {
        ProviderDeepLink: { findOne: sinon.stub().resolves(deepLinkRecord) },
        Provider: { findOne: sinon.stub().resolves(providerRecord) },
      };
      const logger = { lti: sinon.stub(), silly: sinon.stub() };
      const lti13Utils = new LTI13Utils(models, logger, domain_name);

      // Return the correct public key (won't match wrongKey)
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({ getPublicKey: () => publicKey });

      try {
        await lti13Utils.verifyDeepLinkResponse({ params: { token: "t" }, body: { JWT: signedJwt } });
        throw new Error("Expected verifyDeepLinkResponse to throw");
      } catch (err) {
        expect(err.message).to.include("Deep Link Response: Unable to verify JWT");
      } finally {
        JwksClient.prototype.getSigningKey.restore();
      }
    });
  });
});
