/**
 * @file LTI 1.3 Utility Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { use, should, assert } from "chai";
import chaiShallowDeepEqual from "chai-shallow-deep-equal";
import { nanoid } from "nanoid";
import sinon from "sinon";
import jsonwebtoken from "jsonwebtoken";
import crypto from "crypto";
import { JwksClient } from "jwks-rsa";

// Configure Chai
use(chaiShallowDeepEqual);

// Modify Object.prototype for BDD style assertions
should();

const loginHint = nanoid();
const ltiMessageHint = nanoid();

// Import Library
import LTIToolkit from "../../index.js";
const lti = await LTIToolkit({
  handleLaunch: async function () {},
  postProviderGrade: async function () {},
  vars: {
    domain_name: "http://localhost:3000",
    admin_email: "admin@localhost.local",
    deployment_name: "LTI Toolkit Dev",
    deployment_id: "test-deployment-id",
  },
  test: true, // Indicate that we are in a test environment
});

const authRequestData = {
  iss: "https://canvas.instructure.com/",
  login_hint: loginHint,
  client_id: "10000000000001",
  lti_deployment_id: "thisisatestkey",
  target_link_uri: new URL("/lti/provider/launch13", "http://localhost:3000")
    .href,
  lti_message_hint: ltiMessageHint,
  lti_storage_target: "post_message_forwarding",
};

const authRequestForm = {
  scope: "openid",
  response_type: "id_token",
  client_id: "10000000000001",
  redirect_uri: new URL("/lti/provider/redirect13", "http://localhost:3000")
    .href,
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
  "https://purl.imsglobal.org/spec/lti/claim/message_type":
    "LtiResourceLinkRequest",
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
  "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": new URL(
    "/lti/provider/launch13",
    "http://localhost:3000",
  ).href,
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

const tempJwtSigningKey = crypto.randomBytes(64).toString("hex");

/**
 * Valid Auth Request
 */
const validAuthRquest = (state, key, body) => {
  it("should accept a valid auth request", (done) => {
    const req = {
      body,
    };
    state.lti13
      .authRequest(key, req)
      .then((result) => {
        result.should.be.an("object");
        result.should.have.property("form");
        result.form.should.shallowDeepEqual(authRequestForm);
        result.should.have.property("url");
        result.url.should.equal(
          "https://canvas.instructure.com/api/lti/authorize_redirect",
        );
        result.should.have.property("name");
        done();
      })
      .catch((error) => {
        done(error);
      });
  });
};

/**
 * Fail Auth on Invalid Attribute
 */
const failOnInvalidAttribute = (state, key, body, attribute, bad_value) => {
  it(
    "should fail when attribute " + attribute + " is set to " + bad_value,
    (done) => {
      const updatedBody = { ...body };
      updatedBody[attribute] = bad_value;
      const req = {
        body: updatedBody,
      };
      state.lti13.authRequest(key, req).then((result) => {
        assert.isNotOk(result);
        done();
      });
    },
  );
};

/**
 * Successful redirect request
 */
const validRedirectRequest = (state, body) => {
  it("should accept a valid redirect request", (done) => {
    const req = {
      body: body,
    };
    state.lti13
      .redirectRequest(req)
      .then((result) => {
        result.should.be.an("object");
        result.should.shallowDeepEqual(sampleJwt);
        const jwtWithKey = { key: "thisisatestkey", ...sampleJwt };
        jwtWithKey.should.shallowDeepEqual(result);
        // State should have been destroyed
        sinon.assert.calledOnce(destroyState);
        done();
      })
      .catch((error) => {
        done(error);
      });
  });
};

/**
 * Fail Redirect on Invalid Attribute
 */
const redirectFailOnInvalidAttribute = (state, body, attribute, bad_value) => {
  it(
    "should fail when attribute " + attribute + " is set to " + bad_value,
    (done) => {
      const updatedBody = { ...body };
      updatedBody[attribute] = bad_value;
      const req = {
        body: updatedBody,
      };
      state.lti13.redirectRequest(req).then((result) => {
        assert.isNotOk(result);
        done();
      });
    },
  );
};

/**
 * Fail Redirect on Invalid JWT Attribute
 */
const redirectFailOnInvalidJWTAttribute = (
  state,
  jwt,
  attribute,
  bad_value,
) => {
  it(
    "should fail when JWT attribute " + attribute + " is set to " + bad_value,
    (done) => {
      const updatedJwt = { ...jwt };
      updatedJwt[attribute] = bad_value;
      const body = signedBody(updatedJwt);
      const req = {
        body: body,
      };
      state.lti13
        .redirectRequest(req)
        .then((result) => {
          assert.isNotOk(result);
          done();
        })
        .catch((error) => {
          done(error);
        });
    },
  );
};

/**
 * Sign a JWT Body
 */
const signedBody = (jwt) => {
  const signedRedirect = { ...redirectBody };
  signedRedirect.id_token = jsonwebtoken.sign(jwt, tempJwtSigningKey);
  return signedRedirect;
};

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

/**
 * Test LTI 1.3 Utility
 */
describe("LTI 1.3 Utility", () => {
  const state = {};

  beforeEach(() => {
    state.stub0 = sinon
      .stub(lti.models.Consumer, "findOne")
      .withArgs({ where: { key: "thisisatestkey" } })
      .resolves(testConsumer)
      .withArgs({ where: { key: "a" + "thisisatestkey" } })
      .resolves(null);
    state.stub2 = sinon
      .stub(lti.models.Consumer, "findByPk")
      .resolves(testConsumer);
    state.stub1 = sinon.stub(lti.models.ConsumerKey, "findOne").resolves({
      key: "thisisatestkey",
      secret: "thisisatestsecret",
      public: publicKey,
      private: privateKey,
    });
    state.lti13 = lti.test.lti13;
  });

  describe("authRequest", () => {
    const key = "thisisatestkey";
    validAuthRquest(state, key, authRequestData);
    failOnInvalidAttribute(
      state,
      "a" + key,
      authRequestData,
      "consumer_key",
      "a" + key,
    );
    failOnInvalidAttribute(state, key, authRequestData, "iss", null);
    failOnInvalidAttribute(state, key, authRequestData, "login_hint", null);
    failOnInvalidAttribute(
      state,
      key,
      authRequestData,
      "client_id",
      "10000000000001" + "a",
    );
    failOnInvalidAttribute(
      state,
      key,
      authRequestData,
      "lti_deployment_id",
      "thisisatestkey" + "a",
    );
    failOnInvalidAttribute(
      state,
      key,
      authRequestData,
      "target_link_uri",
      new URL("/lti/provider/invalid13", "http://localhost:3000").href,
    );
  });

  describe("redirectRequest", () => {
    beforeEach(async () => {
      sinon
        .stub(lti.models.ConsumerLogin, "findOne")
        .withArgs({ where: { state: stateId } })
        .resolves(loginState);
      const publicKey = sinon.stub().returns(tempJwtSigningKey);
      sinon.stub(JwksClient.prototype, "getSigningKey").resolves({
        getPublicKey: publicKey,
      });
    });

    validRedirectRequest(state, signedBody(sampleJwt));
    redirectFailOnInvalidAttribute(state, redirectBody, "state", null);
    redirectFailOnInvalidAttribute(
      state,
      redirectBody,
      "state",
      "thisisbadstate",
    );
    redirectFailOnInvalidAttribute(state, redirectBody, "id_token", null);
    redirectFailOnInvalidJWTAttribute(
      state,
      sampleJwt,
      "aud",
      "10000000000001" + "a",
    );
    redirectFailOnInvalidJWTAttribute(
      state,
      sampleJwt,
      "iss",
      "https://notcanvas.instructure.com/",
    );
    redirectFailOnInvalidJWTAttribute(state, sampleJwt, "nonce", nanoid());
    // Token Expired 10 seconds ago
    redirectFailOnInvalidJWTAttribute(
      state,
      sampleJwt,
      "exp",
      Math.floor(Date.now() / 1000) - 10,
    );
    // Check LTI Claims
    const baseUrl = "https://purl.imsglobal.org/spec/lti/claim/";
    redirectFailOnInvalidJWTAttribute(
      state,
      sampleJwt,
      baseUrl + "message_type",
      "LtiOtherLinkRequest",
    );
    redirectFailOnInvalidJWTAttribute(
      state,
      sampleJwt,
      baseUrl + "version",
      "1.0.0",
    );
  });
});
