/**
 * @file /controllers/lti-consumer.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { use, should, expect } from "chai";
import chaiShallowDeepEqual from "chai-shallow-deep-equal";
import sinon from "sinon";

// Load module under test
import LTIConsumerController from "../../src/controllers/lti-consumer.js";

// Utilities to stub
import LTI10Utils from "../../src/lib/lti10.js";

// Load logger
import configureLogger from "../../src/config/logger.js";

// Modify Object.prototype for BDD style assertions
should();
use(chaiShallowDeepEqual);

describe("/controllers/lti-consumer.js", () => {
  const logger = configureLogger("error");
  const domain_name = "http://localhost:3000";
  const admin_email = "admin@localhost.tld";

  it("should create an LTIConsumerController instance with the correct properties", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {};

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Assertions
    expect(controller).to.be.an.instanceOf(LTIConsumerController);
  });

  const testContext = {
    key: "test_context_key",
    label: "Test Context",
    name: "Test Context Name",
  };

  const testResource = {
    key: "test_resource_key",
    name: "Test Resource",
  };

  const testUser = {
    key: "test_user_key",
    email: "user@localhost.tld",
    family_name: "Test",
    given_name: "User",
    name: "Test User",
    image: "http://example.com/image.png",
  };

  const testCustomParams = {
    custom_param1: "value1",
    param2: "value2",
  };

  const expectedLaunchData = {
    oauth_consumer_key: "test_consumer_key",
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
    context_id: "test_context_key",
    context_label: "Test Context",
    context_title: "Test Context Name",
    launch_presentation_document_target: "iframe",
    launch_presentation_locale: "en",
    launch_presentation_return_url: "http://example.com/return",
    lis_outcome_service_url: "http://localhost:3000/lti/consumer/grade",
    lis_result_sourcedid: `test_context_key:test_resource_key:test_user_key:test_gradebook_key`,
    lis_person_contact_email_primary: "user@localhost.tld",
    lis_person_name_family: "Test",
    lis_person_name_full: "Test User",
    lis_person_name_given: "User",
    lti_message_type: "basic-lti-launch-request",
    lti_version: "LTI-1p0",
    oauth_callback: "about:blank",
    resource_link_id: "test_resource_key",
    resource_link_title: "Test Resource",
    roles: "Instructor",
    tool_consumer_info_product_family_code: "Test LTI Consumer",
    tool_consumer_info_version: "1.0",
    tool_consumer_instance_contact_email: "admin@localhost.tld",
    tool_consumer_instance_guid: "test-deployment",
    tool_consumer_instance_name: "Test Deployment",
    user_id: "test_user_key",
    user_image: "http://example.com/image.png",
  };

  it("should generate LTI 1.0 launch form data correctly", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const models = {};

    // Stub LTI10Utils.oauth_sign to return a known value
    const oauthSignStub = sinon.stub(LTI10Utils.prototype, "oauth_sign").returns("test_signature");

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);
    const formData = await controller.generateLTI10LaunchFormData(
      "test_consumer_key",
      "test_consumer_secret",
      "http://example.com/launch",
      "http://example.com/return",
      testContext,
      testResource,
      testUser,
      true,
      "test_gradebook_key",
    );

    // Assertions
    expect(formData).to.shallowDeepEqual({
      action: "http://example.com/launch",
      fields: {
        ...expectedLaunchData,
        oauth_signature: "test_signature",
      },
    });
    expect(oauthSignStub.calledOnce).to.be.true;
    expect(oauthSignStub.firstCall.args[0]).to.equal("HMAC-SHA1");
    expect(oauthSignStub.firstCall.args[1]).to.equal("POST");
    expect(oauthSignStub.firstCall.args[2]).to.equal("http://example.com/launch");
    expect(oauthSignStub.firstCall.args[3]).to.shallowDeepEqual(expectedLaunchData);
    expect(oauthSignStub.firstCall.args[4]).to.equal("test_consumer_secret");

    // Restore stubbed method
    oauthSignStub.restore();
  });

  it("should generate LTI 1.0 launch form data correctly with custom params", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const models = {};

    // Stub LTI10Utils.oauth_sign to return a known value
    const oauthSignStub = sinon.stub(LTI10Utils.prototype, "oauth_sign").returns("test_signature");

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);
    const formData = await controller.generateLTI10LaunchFormData(
      "test_consumer_key",
      "test_consumer_secret",
      "http://example.com/launch",
      "http://example.com/return",
      testContext,
      testResource,
      testUser,
      true,
      "test_gradebook_key",
      testCustomParams,
    );

    // Assertions
    expect(formData).to.shallowDeepEqual({
      action: "http://example.com/launch",
      fields: {
        ...expectedLaunchData,
        oauth_signature: "test_signature",
        custom_param1: "value1",
        custom_param2: "value2",
      },
    });
    expect(oauthSignStub.calledOnce).to.be.true;
    expect(oauthSignStub.firstCall.args[0]).to.equal("HMAC-SHA1");
    expect(oauthSignStub.firstCall.args[1]).to.equal("POST");
    expect(oauthSignStub.firstCall.args[2]).to.equal("http://example.com/launch");
    expect(oauthSignStub.firstCall.args[3]).to.shallowDeepEqual({
      ...expectedLaunchData,
      custom_param1: "value1",
      custom_param2: "value2",
    });
    expect(oauthSignStub.firstCall.args[4]).to.equal("test_consumer_secret");

    // Restore stubbed method
    oauthSignStub.restore();
  });

  it("should generate LTI 1.0 launch form data correctly with learner", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const models = {};

    // Stub LTI10Utils.oauth_sign to return a known value
    const oauthSignStub = sinon.stub(LTI10Utils.prototype, "oauth_sign").returns("test_signature");

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);
    const formData = await controller.generateLTI10LaunchFormData(
      "test_consumer_key",
      "test_consumer_secret",
      "http://example.com/launch",
      "http://example.com/return",
      testContext,
      testResource,
      testUser,
      false,
      "test_gradebook_key",
      testCustomParams,
    );

    // Assertions
    expect(formData).to.shallowDeepEqual({
      action: "http://example.com/launch",
      fields: {
        ...expectedLaunchData,
        roles: "Learner",
        oauth_signature: "test_signature",
        custom_param1: "value1",
        custom_param2: "value2",
      },
    });
    expect(oauthSignStub.calledOnce).to.be.true;
    expect(oauthSignStub.firstCall.args[0]).to.equal("HMAC-SHA1");
    expect(oauthSignStub.firstCall.args[1]).to.equal("POST");
    expect(oauthSignStub.firstCall.args[2]).to.equal("http://example.com/launch");
    expect(oauthSignStub.firstCall.args[3]).to.shallowDeepEqual({
      ...expectedLaunchData,
      roles: "Learner",
      custom_param1: "value1",
      custom_param2: "value2",
    });
    expect(oauthSignStub.firstCall.args[4]).to.equal("test_consumer_secret");

    // Restore stubbed method
    oauthSignStub.restore();
  });

  it("should throw errors when LTI 1.0 launch form required parameters are missing", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const models = {};

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Assertions for missing parameters
    try {
      await controller.generateLTI10LaunchFormData(
        null,
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing consumer key");
    } catch (err) {
      expect(err.message).to.equal("Consumer Key is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        null,
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing consumer secret");
    } catch (err) {
      expect(err.message).to.equal("Consumer Secret is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        null,
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing launch URL");
    } catch (err) {
      expect(err.message).to.equal("Launch URL is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        null,
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing return URL");
    } catch (err) {
      expect(err.message).to.equal("Return URL is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        null,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing context");
    } catch (err) {
      expect(err.message).to.equal("Context with key, label, and name is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        {
          label: "Test Context",
          name: "Test Context Name",
        },
        testResource,
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing context");
    } catch (err) {
      expect(err.message).to.equal("Context with key, label, and name is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        {
          key: "test_context_key",
          name: "Test Context Name",
        },
        testResource,
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing context");
    } catch (err) {
      expect(err.message).to.equal("Context with key, label, and name is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        {
          key: "test_context_key",
          label: "Test Context",
        },
        testResource,
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing context");
    } catch (err) {
      expect(err.message).to.equal("Context with key, label, and name is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        null,
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing resource");
    } catch (err) {
      expect(err.message).to.equal("Resource with key and name is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        {
          name: "Test Resource",
        },
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing resource");
    } catch (err) {
      expect(err.message).to.equal("Resource with key and name is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        {
          key: "test_resource_key",
        },
        testUser,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing resource");
    } catch (err) {
      expect(err.message).to.equal("Resource with key and name is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        null,
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing user");
    } catch (err) {
      expect(err.message).to.equal("User with key and email is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        {
          key: "test_user_key",
        },
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing user");
    } catch (err) {
      expect(err.message).to.equal("User with key and email is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        {
          email: "user@localhost.tld",
        },
        true,
        "test_gradebook_key",
      );
      throw new Error("Expected error for missing user");
    } catch (err) {
      expect(err.message).to.equal("User with key and email is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        "false",
        null,
      );
      throw new Error("Expected error for missing manager status");
    } catch (err) {
      expect(err.message).to.equal("Manager status is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        null,
        null,
      );
      throw new Error("Expected error for missing manager status");
    } catch (err) {
      expect(err.message).to.equal("Manager status is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        undefined,
        null,
      );
      throw new Error("Expected error for missing manager status");
    } catch (err) {
      expect(err.message).to.equal("Manager status is required to generate LTI 1.0 Launch Data");
    }

    try {
      await controller.generateLTI10LaunchFormData(
        "test_consumer_key",
        "test_consumer_secret",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        null,
      );
      throw new Error("Expected error for missing gradebook key");
    } catch (err) {
      expect(err.message).to.equal("Gradebook Key is required to generate LTI 1.0 Launch Data");
    }
  });

  it("should properly handle a basic outomes grade passback request", async () => {
    // Create mock dependencies
    const consumer = {
      postProviderGrade: sinon.stub().resolves({ success: true, message: "Grade posted successfully" }),
    };
    const models = {};

    // Stub LTI10Utils.parseOAuthRequest to return a known value
    const mockKeys = sinon.mock({
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    });
    const validateOauthStub = sinon.stub(LTI10Utils.prototype, "validateOauthBody").resolves(mockKeys);
    const mockRequest = sinon.mock({
      sourcedid: "test_sourcedid",
    });
    const validateBasicOutcomesStub = sinon.stub(LTI10Utils.prototype, "validateBasicOutcomesRequest").returns({
      message_id: "test_message_id",
      body: {
        replaceresultrequest: mockRequest,
      },
    });

    // Construct controller with stubbed dependencies
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Stub interal function for other tests
    const mockResult = sinon.mock({
      content: "<xml>Grade Passback Response</xml>",
      headers: "OAuth header",
    });
    controller.replaceResultRequest = sinon.stub().resolves(mockResult);

    // Call the function under test
    const mockReq = {
      body: {
        imsx_POXEnvelopeRequest: "some request body",
      },
      originalUrl: "http://localhost:3000/lti/consumer/grade",
    };
    const result = await controller.basicOutcomesHandler(mockReq);

    // Assertions
    expect(validateOauthStub.calledOnce).to.be.true;
    expect(validateBasicOutcomesStub.calledOnce).to.be.true;
    expect(controller.replaceResultRequest.calledOnce).to.be.true;
    expect(controller.replaceResultRequest.firstCall.args[0]).to.deep.equal(mockRequest);
    expect(controller.replaceResultRequest.firstCall.args[1]).to.deep.equal(mockKeys);
    expect(controller.replaceResultRequest.firstCall.args[2]).to.equal("http://localhost:3000/lti/consumer/grade");
    expect(controller.replaceResultRequest.firstCall.args[3]).to.equal("test_message_id");
    expect(controller.replaceResultRequest.firstCall.args[4]).to.deep.equal(mockReq);
    expect(result).to.deep.equal(mockResult);

    // Restore stubbed methods
    validateOauthStub.restore();
    validateBasicOutcomesStub.restore();
  });

  it("should return an error response when basic outcomes request oauth validation fails", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {};

    // Stub LTI10Utils.validateOauthBody to throw an error
    const validateOauthStub = sinon
      .stub(LTI10Utils.prototype, "validateOauthBody")
      .throws(new Error("Invalid OAuth Request"));

    // Stub result builder to return a known value
    const mockResult = sinon.mock({
      content: "<xml>Grade Passback Response</xml>",
      headers: "OAuth header",
    });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").returns(mockResult);

    // Construct controller with stubbed dependencies
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Call the function under test and assert that it throws the expected error
    const result = await controller.basicOutcomesHandler({
      body: {
        imsx_POXEnvelopeRequest: "some request body",
      },
      originalUrl: "http://localhost:3000/lti/consumer/grade",
    });

    expect(validateOauthStub.calledOnce).to.be.true;
    expect(buildResponseStub.calledOnce).to.be.true;
    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("invalidtargetdatafail");
    expect(buildResponseStub.firstCall.args[2]).to.equal("Invalid OAuth Request");
    expect(buildResponseStub.firstCall.args[3]).to.equal(null);
    expect(buildResponseStub.firstCall.args[4]).to.equal("http://localhost:3000/lti/consumer/grade");
    expect(buildResponseStub.firstCall.args[5]).to.equal(null);
    expect(result).to.deep.equal(mockResult);

    // Restore stubbed method
    validateOauthStub.restore();
    buildResponseStub.restore();
  });

  it("should return an error response when basic outcomes request validation fails", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {};

    // Stub LTI10Utils.validateOauthBody to throw an error
    // Stub LTI10Utils.parseOAuthRequest to return a known value
    const mockKeys = sinon.mock({
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    });
    const validateOauthStub = sinon.stub(LTI10Utils.prototype, "validateOauthBody").resolves(mockKeys);
    const validateBasicOutcomesStub = sinon
      .stub(LTI10Utils.prototype, "validateBasicOutcomesRequest")
      .throws(new Error("Invalid Basic Outcomes Request"));

    // Stub result builder to return a known value
    const mockResult = sinon.mock({
      content: "<xml>Grade Passback Response</xml>",
      headers: "OAuth header",
    });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").returns(mockResult);

    // Construct controller with stubbed dependencies
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Call the function under test and assert that it throws the expected error
    const result = await controller.basicOutcomesHandler({
      body: {
        imsx_POXEnvelopeRequest: "some request body",
      },
      originalUrl: "http://localhost:3000/lti/consumer/grade",
    });

    expect(validateOauthStub.calledOnce).to.be.true;
    expect(buildResponseStub.calledOnce).to.be.true;
    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("invalidtargetdatafail");
    expect(buildResponseStub.firstCall.args[2]).to.equal("Invalid Basic Outcomes Request");
    expect(buildResponseStub.firstCall.args[3]).to.deep.equal(mockKeys);
    expect(buildResponseStub.firstCall.args[4]).to.equal("http://localhost:3000/lti/consumer/grade");
    expect(buildResponseStub.firstCall.args[5]).to.equal(null);
    expect(result).to.deep.equal(mockResult);

    // Restore stubbed method
    validateOauthStub.restore();
    validateBasicOutcomesStub.restore();
    buildResponseStub.restore();
  });

  it("should return an error response when an unrecognized request is received", async () => {
    // Create mock dependencies
    const consumer = {
      postProviderGrade: sinon.stub().resolves({ success: true, message: "Grade posted successfully" }),
    };
    const models = {};

    // Stub LTI10Utils.parseOAuthRequest to return a known value
    const mockKeys = sinon.mock({
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    });
    const validateOauthStub = sinon.stub(LTI10Utils.prototype, "validateOauthBody").resolves(mockKeys);
    const mockRequest = sinon.mock({
      sourcedid: "test_sourcedid",
    });
    const validateBasicOutcomesStub = sinon.stub(LTI10Utils.prototype, "validateBasicOutcomesRequest").returns({
      message_id: "test_message_id",
      body: {
        deleteresultrequest: mockRequest,
      },
    });

    // Stub result builder to return a known value
    const mockResult = sinon.mock({
      content: "<xml>Grade Passback Response</xml>",
      headers: "OAuth header",
    });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").returns(mockResult);

    // Construct controller with stubbed dependencies
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Call the function under test
    const mockReq = {
      body: {
        imsx_POXEnvelopeRequest: "some request body",
      },
      originalUrl: "http://localhost:3000/lti/consumer/grade",
    };
    const result = await controller.basicOutcomesHandler(mockReq);

    expect(validateOauthStub.calledOnce).to.be.true;
    expect(buildResponseStub.calledOnce).to.be.true;
    expect(buildResponseStub.firstCall.args[0]).to.equal("unsupported");
    expect(buildResponseStub.firstCall.args[1]).to.equal("status");
    expect(buildResponseStub.firstCall.args[2]).to.equal(
      "The operation deleteresult is not supported by this LTI Tool Consumer",
    );
    expect(buildResponseStub.firstCall.args[3]).to.deep.equal(mockKeys);
    expect(buildResponseStub.firstCall.args[4]).to.equal("http://localhost:3000/lti/consumer/grade");
    expect(buildResponseStub.firstCall.args[5]).to.equal("test_message_id");
    expect(buildResponseStub.firstCall.args[6]).to.equal("deleteresultrequest");
    expect(result).to.deep.equal(mockResult);

    // Restore stubbed method
    validateOauthStub.restore();
    validateBasicOutcomesStub.restore();
    buildResponseStub.restore();
  });

  it("should handle a replace result request properly and return the result", async () => {
    // Create mock dependencies
    const consumer = {
      postProviderGrade: sinon.stub().resolves({ success: true, message: "Grade posted successfully" }),
    };
    const models = {};

    // Stub LTI10Utils.validateReplaceResultRequest to return a known value
    const mockGrade = {
      score: 0.95,
      sourcedIdValue: "context_key:resource_key:user_key:gradebook_key",
    };
    const validateReplaceResultStub = sinon
      .stub(LTI10Utils.prototype, "validateReplaceResultRequest")
      .returns(mockGrade);

    // Stub result builder to return a known value
    const mockResult = {
      content: "<xml>Grade Passback Response</xml>",
      headers: "OAuth header",
    };
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").returns(mockResult);

    // Construct controller with stubbed dependencies
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Call the function under test
    const mockRequest = {
      sourcedid: "context_key:resource_key:user_key:gradebook_key",
    };
    const mockKeys = {
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    };
    const mockReq = {
      originalUrl: "http://localhost:3000/lti/consumer/grade",
    };
    const result = await controller.replaceResultRequest(
      mockRequest,
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "test_message_id",
      mockReq,
    );

    // Assertions
    expect(validateReplaceResultStub.calledOnce).to.be.true;
    expect(validateReplaceResultStub.firstCall.args[0]).to.deep.equal(mockRequest);
    expect(consumer.postProviderGrade.calledOnce).to.be.true;
    expect(consumer.postProviderGrade.firstCall.args[0]).to.equal("test_consumer_key");
    expect(consumer.postProviderGrade.firstCall.args[1]).to.equal("context_key");
    expect(consumer.postProviderGrade.firstCall.args[2]).to.equal("resource_key");
    expect(consumer.postProviderGrade.firstCall.args[3]).to.equal("user_key");
    expect(consumer.postProviderGrade.firstCall.args[4]).to.equal("gradebook_key");
    expect(consumer.postProviderGrade.firstCall.args[5]).to.equal(0.95);
    expect(consumer.postProviderGrade.firstCall.args[6]).to.deep.equal(mockReq);
    expect(buildResponseStub.calledOnce).to.be.true;
    expect(buildResponseStub.firstCall.args[0]).to.equal("success");
    expect(buildResponseStub.firstCall.args[1]).to.equal("status");
    expect(buildResponseStub.firstCall.args[2]).to.equal(
      "Score for context_key:resource_key:user_key:gradebook_key is now 0.95",
    );
    expect(buildResponseStub.firstCall.args[3]).to.deep.equal(mockKeys);
    expect(buildResponseStub.firstCall.args[4]).to.equal("http://localhost:3000/lti/consumer/grade");
    expect(buildResponseStub.firstCall.args[5]).to.equal("test_message_id");
    expect(buildResponseStub.firstCall.args[6]).to.equal("replaceResult");
    expect(buildResponseStub.firstCall.args[7]).to.deep.equal({
      replaceResultResponse: {},
    });
    expect(result).to.deep.equal(mockResult);

    // Restore stubbed method
    validateReplaceResultStub.restore();
    buildResponseStub.restore();
  });

  it("should handle errors thrown during replace result processing and return an appropriate error response", async () => {
    // Create mock dependencies
    const consumer = {
      postProviderGrade: sinon.stub().resolves({ success: true, message: "Grade posted successfully" }),
    };
    const models = {};

    // Stub LTI10Utils.validateReplaceResultRequest to throw an error
    const validateReplaceResultStub = sinon
      .stub(LTI10Utils.prototype, "validateReplaceResultRequest")
      .throws(new Error("Invalid Replace Result Request"));

    // Stub result builder to return a known value
    const mockResult = {
      content: "<xml>Grade Passback Response</xml>",
      headers: "OAuth header",
    };
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").returns(mockResult);

    // Construct controller with stubbed dependencies
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Call the function under test and assert that it returns the expected error response
    const mockRequest = {
      sourcedid: "context_key:resource_key:user_key:gradebook_key",
    };
    const mockKeys = {
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    };
    const mockReq = {
      originalUrl: "http://localhost:3000/lti/consumer/grade",
    };
    const result = await controller.replaceResultRequest(
      mockRequest,
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "test_message_id",
      mockReq,
    );

    // Assertions
    expect(validateReplaceResultStub.calledOnce).to.be.true;
    expect(validateReplaceResultStub.firstCall.args[0]).to.deep.equal(mockRequest);
    expect(consumer.postProviderGrade.notCalled).to.be.true;
    expect(buildResponseStub.calledOnce).to.be.true;
    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("invalidtargetdatafail");
    expect(buildResponseStub.firstCall.args[2]).to.equal("Invalid Replace Result Request");
    expect(buildResponseStub.firstCall.args[3]).to.deep.equal(mockKeys);
    expect(buildResponseStub.firstCall.args[4]).to.equal("http://localhost:3000/lti/consumer/grade");
    expect(buildResponseStub.firstCall.args[5]).to.equal("test_message_id");
    expect(buildResponseStub.firstCall.args[6]).to.equal("replaceResult");
    expect(result).to.deep.equal(mockResult);

    // Restore stubbed method
    validateReplaceResultStub.restore();
    buildResponseStub.restore();
  });

  it("should handle errors thrown during replace result processing due to bad sourcedid and return an appropriate error response", async () => {
    // Create mock dependencies
    const consumer = {
      postProviderGrade: sinon.stub().resolves({ success: true, message: "Grade posted successfully" }),
    };
    const models = {};

    // Stub LTI10Utils.validateReplaceResultRequest to return a known value
    const mockGrade = {
      score: 0.95,
      sourcedIdValue: "context_key:resource_key:user_key",
    };
    const validateReplaceResultStub = sinon
      .stub(LTI10Utils.prototype, "validateReplaceResultRequest")
      .returns(mockGrade);

    // Stub result builder to return a known value
    const mockResult = {
      content: "<xml>Grade Passback Response</xml>",
      headers: "OAuth header",
    };
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").returns(mockResult);

    // Construct controller with stubbed dependencies
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Call the function under test and assert that it returns the expected error response
    const mockRequest = {
      sourcedid: "context_key:resource_key:user_key",
    };
    const mockKeys = {
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    };
    const mockReq = {
      originalUrl: "http://localhost:3000/lti/consumer/grade",
    };
    const result = await controller.replaceResultRequest(
      mockRequest,
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "test_message_id",
      mockReq,
    );

    // Assertions
    expect(validateReplaceResultStub.calledOnce).to.be.true;
    expect(validateReplaceResultStub.firstCall.args[0]).to.deep.equal(mockRequest);
    expect(consumer.postProviderGrade.notCalled).to.be.true;
    expect(buildResponseStub.calledOnce).to.be.true;
    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("invalididfail");
    expect(buildResponseStub.firstCall.args[2]).to.equal(
      "Invalid Source ID context_key:resource_key:user_key - expected 4 parts",
    );
    expect(buildResponseStub.firstCall.args[3]).to.deep.equal(mockKeys);
    expect(buildResponseStub.firstCall.args[4]).to.equal("http://localhost:3000/lti/consumer/grade");
    expect(buildResponseStub.firstCall.args[5]).to.equal("test_message_id");
    expect(buildResponseStub.firstCall.args[6]).to.equal("replaceResult");
    expect(result).to.deep.equal(mockResult);

    // Restore stubbed method
    validateReplaceResultStub.restore();
    buildResponseStub.restore();
  });

  it("should handle unsuccessful grade posting to the provider", async () => {
    // Create mock dependencies
    const consumer = {
      postProviderGrade: sinon.stub().resolves({ success: false, message: "Grade posting failed" }),
    };
    const models = {};

    // Stub LTI10Utils.validateReplaceResultRequest to return a known value
    const mockGrade = {
      score: 0.95,
      sourcedIdValue: "context_key:resource_key:user_key:gradebook_key",
    };
    const validateReplaceResultStub = sinon
      .stub(LTI10Utils.prototype, "validateReplaceResultRequest")
      .returns(mockGrade);

    // Stub result builder to return a known value
    const mockResult = {
      content: "<xml>Grade Passback Response</xml>",
      headers: "OAuth header",
    };
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").returns(mockResult);

    // Construct controller with stubbed dependencies
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    // Call the function under test and assert that it returns the expected error response
    const mockRequest = {
      sourcedid: "context_key:resource_key:user_key:gradebook_key",
    };
    const mockKeys = {
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    };
    const mockReq = {
      originalUrl: "http://localhost:3000/lti/consumer/grade",
    };
    const result = await controller.replaceResultRequest(
      mockRequest,
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "test_message_id",
      mockReq,
    );

    // Assertions
    expect(validateReplaceResultStub.calledOnce).to.be.true;
    expect(validateReplaceResultStub.firstCall.args[0]).to.deep.equal(mockRequest);
    expect(consumer.postProviderGrade.calledOnce).to.be.true;
    expect(buildResponseStub.calledOnce).to.be.true;
    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("processingfail");
    expect(buildResponseStub.firstCall.args[2]).to.equal("Failed to Post Grade: Grade posting failed");
    expect(buildResponseStub.firstCall.args[3]).to.deep.equal(mockKeys);
    expect(buildResponseStub.firstCall.args[4]).to.equal("http://localhost:3000/lti/consumer/grade");
    expect(buildResponseStub.firstCall.args[5]).to.equal("test_message_id");
    expect(buildResponseStub.firstCall.args[6]).to.equal("replaceResult");
    expect(result).to.deep.equal(mockResult);

    // Restore stubbed method
    validateReplaceResultStub.restore();
    buildResponseStub.restore();
  });
});
