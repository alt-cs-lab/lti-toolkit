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
});
