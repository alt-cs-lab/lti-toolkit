/**
 * @file LTI 1.0 Utility Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { use, should, assert } from "chai";
import chaiShallowDeepEqual from "chai-shallow-deep-equal";
import { nanoid } from "nanoid";
import sinon from "sinon";

// NOTE: This uses https://www.npmjs.com/package/oauth-sign
// as a sanity check against my own signing code based on that library
import { hmacsign } from "oauth-sign";

// Configure Chai
use(chaiShallowDeepEqual);

// Modify Object.prototype for BDD style assertions
should();

// Import Library
import LTIToolkit from "../../index.js";
const lti = await LTIToolkit({
  domain_name: "http://localhost:3000",
  provider: {
    handleLaunch: async function () {},
  },
  consumer: {
    postProviderGrade: async function () {},
    admin_email: "admin@localhost.local",
    deployment_name: "LTI Toolkit Dev",
    deployment_id: "test-deployment-id",
  },
  test: true, // Indicate that we are in a test environment
});

const ltiLaunch = {
  oauth_consumer_key: "thisisatestkey",
  oauth_signature_method: "HMAC-SHA1",
  oauth_timestamp: Math.floor(Date.now() / 1000),
  oauth_nonce: nanoid(),
  oauth_version: "1.0",
  context_id: nanoid(),
  context_label: "TESTLABEL",
  context_title: "Test Course",
  ext_lti_assignment_id: nanoid(),
  launch_presentation_return_url:
    "https://canvas.instructure.com/courses/1/assignments",
  lis_outcome_service_url:
    "https://canvas.instructure.com//api/lti/v1/tools/6/grade_passback",
  lis_person_contact_email_primary: "canvasstudent@russfeld.me",
  lis_person_name_family: "Student",
  lis_person_name_full: "Test Student",
  lis_person_name_given: "Test",
  lti_message_type: "basic-lti-launch-request",
  lti_version: "LTI-1p0",
  oauth_callback: "about:blank",
  resource_link_id: nanoid(),
  resource_link_title: "Test Assignment",
  roles: "Learner",
  tool_consumer_info_product_family_code: "canvas",
  tool_consumer_info_version: "cloud",
  tool_consumer_instance_contact_email: "canvasadmin@russfeld.me",
  tool_consumer_instance_guid: nanoid() + ":canvas-lms",
  tool_consumer_instance_name: "ALT+CS Lab",
  user_id: nanoid(),
  user_image: "https://placehold.co/64x64",
  oauth_signature: "thisisaninvalidsignature",
};

/**
 * Succeed on valid signature
 */
const succeedOnValidSignature = (state, body) => {
  it("should succeed on valid signature", (done) => {
    const req = {
      body: body,
      method: "POST",
      originalUrl: "/lti/provider/launch10",
    };
    state.lti10
      .validate10(req)
      .then((result) => {
        const launchNoSignature = { ...body };
        delete launchNoSignature.oauth_signature;
        result.should.shallowDeepEqual(launchNoSignature);
        done();
      })
      .catch((error) => {
        done(error);
      });
  });
};

/**
 * Require Body
 */
const requireBody = (state) => {
  it("should require request body", (done) => {
    const req = {
      body: null,
      method: "POST",
    };
    state.lti10.validate10(req).then((result) => {
      assert.isNotOk(result);
      done();
    });
  });
};

/**
 * Fail on Invalid Attribute
 */
const failOnInvalidAttribute = (state, body, attribute, bad_value) => {
  it(
    "should fail when attribute " + attribute + " is set to " + bad_value,
    (done) => {
      const updatedBody = { ...body };
      updatedBody[attribute] = bad_value;
      const req = {
        body: updatedBody,
        method: "POST",
      };
      state.lti10.validate10(req).then((result) => {
        assert.isNotOk(result);
        done();
      });
    },
  );
};

/**
 * Fail on Invalid Signature
 */
const failOnInvalidSignature = (state, body) => {
  it("should fail on invalid signature", (done) => {
    const newBody = { ...body };
    const newNonce = nanoid();
    newBody.oauth_nonce = newNonce;
    const req = {
      body: newBody,
      method: "POST",
      originalUrl: "/lti/provider/launch10",
    };
    state.lti10
      .validate10(req)
      .then((result) => {
        assert.isNotOk(result);
        done();
      })
      .catch((error) => {
        done(error);
      });
  });
};

/**
 * Fail on a duplicate nonce
 */
const failOnDuplicateNonce = (state, body) => {
  it("should fail on a duplicated nonce", (done) => {
    const ltiLaunchNew = { ...body };
    const ltiLaunchOld = { ...body };
    const newNonce = nanoid();
    ltiLaunchNew.oauth_nonce = newNonce;
    ltiLaunchOld.oauth_timestamp = Math.floor(Date.now() / 1000) - 10;
    ltiLaunchOld.oauth_nonce = newNonce;
    const req1 = {
      body: signedBody(ltiLaunchOld),
      method: "POST",
      originalUrl: "/lti/provider/launch10",
    };
    state.lti10
      .validate10(req1)
      .then((result) => {
        const launchNoSignature = { ...ltiLaunchOld };
        delete launchNoSignature.oauth_signature;
        result.should.shallowDeepEqual(launchNoSignature);
        // First item validated, replay with same nonce but different timestamp
        const req2 = {
          body: signedBody(ltiLaunchNew),
          method: "POST",
          originalUrl: "/lti/provider/launch10",
        };
        state.lti10
          .validate10(req2)
          .then((result) => {
            assert.isNotOk(result);
            done();
          })
          .catch((error) => {
            done(error);
          });
      })
      .catch((error) => {
        done(error);
      });
  });
};

/**
 * Sign an LTI Launch Request
 *
 * @param {Object} body - the LTI launch request to sign
 * @returns the signed LTI launch request
 */
const signedBody = (body) => {
  const newBody = { ...body };
  delete newBody.oauth_signature;
  const signature = hmacsign(
    "POST",
    new URL("/lti/provider/launch10", "http://localhost:3000").href,
    newBody,
    "thisisatestsecret",
  );
  newBody.oauth_signature = signature;
  return newBody;
};

/**
 * Test LTI 1.0 Utility
 */
describe("LTI 1.0 Utility", () => {
  const state = {};

  beforeEach(() => {
    state.stub = sinon.stub(lti.models.ConsumerKey, "findByPk").resolves({
      key: "thisisatestkey",
      secret: "thisisatestsecret",
    });
    state.lti10 = lti.test.lti10;
  });

  describe("validate10", () => {
    succeedOnValidSignature(state, signedBody(ltiLaunch));
    requireBody(state);
    failOnInvalidAttribute(
      state,
      ltiLaunch,
      "lti_message_type",
      "other-lti-launch-request",
    );
    failOnInvalidAttribute(state, ltiLaunch, "lti_version", "LTI-1p3");
    failOnInvalidAttribute(state, ltiLaunch, "oauth_version", "2.0");
    failOnInvalidAttribute(
      state,
      ltiLaunch,
      "oauth_signature_method",
      "HMAC-SHA256",
    );
    failOnInvalidAttribute(state, ltiLaunch, "oauth_consumer_key", null);
    failOnInvalidAttribute(state, ltiLaunch, "oauth_signature", null);
    failOnInvalidAttribute(
      state,
      ltiLaunch,
      "oauth_callback",
      "https://localhost",
    );
    failOnInvalidAttribute(state, ltiLaunch, "oauth_timestamp", null);
    // Future Timestamp
    failOnInvalidAttribute(
      state,
      ltiLaunch,
      "oauth_timestamp",
      Math.floor(Date.now() / 1000) + 70,
    );
    // Past Timestamp
    failOnInvalidAttribute(
      state,
      ltiLaunch,
      "oauth_timestamp",
      Math.floor(Date.now() / 1000) - 610,
    );
    failOnInvalidAttribute(state, ltiLaunch, "oauth_nonce", null);
    failOnInvalidAttribute(
      state,
      ltiLaunch,
      "oauth_consumer_key",
      "thisisatestkey" + "a",
    );
    failOnInvalidSignature(state, ltiLaunch);
    failOnDuplicateNonce(state, ltiLaunch);
  });
});
