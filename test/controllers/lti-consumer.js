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
import LTI13Utils from "../../src/lib/lti13.js";

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

  it("should generate LTI 1.3 launch form data correctly", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    // Create Provider Model
    const models = {
      Provider: {
        findOne: sinon.stub().resolves({
          name: "Test Provider",
          auth_url: "http://example.com/auth",
        }),
      },
      ProviderLogin: {
        create: sinon.stub().resolvesArg(0), // Echo back the created login
      },
    };

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);
    const formData = await controller.generateLTI13LoginFormData(
      "test_consumer_key",
      "test_client_id",
      "test_deployment_id",
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
      action: "http://example.com/auth",
      fields: {
        iss: "http://localhost:3000/",
        client_id: "test_client_id",
        lti_deployment_id: "test_deployment_id",
        target_link_uri: "http://example.com/launch",
        lti_storage_target: "post_message_forwarding",
      },
    });
    const login_hint = formData.fields.login_hint;
    expect(models.Provider.findOne.calledOnce).to.be.true;
    expect(models.Provider.findOne.firstCall.args[0]).to.deep.equal({ where: { key: "test_consumer_key" } });
    expect(models.ProviderLogin.create.calledOnce).to.be.true;
    const createdLoginArgs = models.ProviderLogin.create.firstCall.args[0];
    expect(createdLoginArgs).to.include({
      client_id: "test_client_id",
      login_hint: login_hint,
    });
    const data = JSON.parse(createdLoginArgs.data);
    expect(data).to.deep.equal({
      key: "test_consumer_key",
      url: "http://example.com/launch",
      deployment_id: "test_deployment_id",
      ret_url: "http://example.com/return",
      context: testContext,
      resource: testResource,
      user: testUser,
      manager: true,
      gradebook_key: "test_gradebook_key",
      custom: testCustomParams,
    });
  });

  it("should throw errors when LTI 1.3 login form required parameters are missing", async () => {
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
      await controller.generateLTI13LoginFormData(
        null,
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for missing consumer key");
    } catch (err) {
      expect(err.message).to.equal("Consumer Key is required to generate LTI 1.3 Login Data");
    }

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        null,
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for missing client ID");
    } catch (err) {
      expect(err.message).to.equal("Client ID is required to generate LTI 1.3 Login Data");
    }

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        null,
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for missing launch URL");
    } catch (err) {
      expect(err.message).to.equal("Launch URL is required to generate LTI 1.3 Login Data");
    }

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        null,
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for missing return URL");
    } catch (err) {
      expect(err.message).to.equal("Return URL is required to generate LTI 1.3 Login Data");
    }

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        null,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for missing context");
    } catch (err) {
      expect(err.message).to.equal("Context with key, label, and name is required to generate LTI 1.3 Login Data");
    }

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        null,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for missing resource");
    } catch (err) {
      expect(err.message).to.equal("Resource with key and name is required to generate LTI 1.3 Login Data");
    }

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        null,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for missing user");
    } catch (err) {
      expect(err.message).to.equal("User with key and email is required to generate LTI 1.3 Login Data");
    }

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        "false",
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for missing manager status");
    } catch (err) {
      expect(err.message).to.equal("Manager status is required to generate LTI 1.3 Login Data");
    }

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        null,
        testCustomParams,
      );
      throw new Error("Expected error for missing gradebook key");
    } catch (err) {
      expect(err.message).to.equal("Gradebook Key is required to generate LTI 1.3 Login Data");
    }

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        null,
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for missing deployment ID");
    } catch (err) {
      expect(err.message).to.equal("Deployment ID is required to generate LTI 1.3 Login Data");
    }
  });

  it("should throw an error if the Provider is not found in the database when generating LTI 1.3 login form data", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const models = {
      Provider: {
        findOne: sinon.stub().resolves(null), // Simulate provider not found
      },
    };

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for provider not found");
    } catch (err) {
      expect(err.message).to.equal("No provider found with key " + "test_consumer_key");
    }
  });

  it("should throw an error if the provider doe snot have a valid auth_url when generating LTI 1.3 login form data", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const models = {
      Provider: {
        findOne: sinon.stub().resolves({
          name: "Test Provider",
          auth_url: null, // Simulate missing auth_url
        }),
      },
    };

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for provider with invalid auth_url");
    } catch (err) {
      expect(err.message).to.equal("No auth URL found for provider Test Provider");
    }
  });

  it("should throw an error if there is a database error when creating the ProviderLogin record while generating LTI 1.3 login form data", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const models = {
      Provider: {
        findOne: sinon.stub().resolves({
          name: "Test Provider",
          auth_url: "http://example.com/auth",
        }),
      },
      ProviderLogin: {
        create: sinon.stub().rejects(new Error("Database error")), // Simulate database error
      },
    };

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);

    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for database error when creating ProviderLogin");
    } catch (err) {
      expect(err.message).to.equal("Database error");
    }
  });

  it("should throw an error if there is an unexpected error when generating LTI 1.3 login form data", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const models = {
      Provider: {
        findOne: sinon.stub().resolves({
          name: "Test Provider",
          auth_url: "http://example.com/auth",
        }),
      },
      ProviderLogin: {
        create: sinon.stub().resolves(null), // Simulate database error
      },
    };

    // Call the function under test
    const controller = new LTIConsumerController(consumer, models, logger, domain_name, admin_email);
    try {
      await controller.generateLTI13LoginFormData(
        "test_consumer_key",
        "test_client_id",
        "test_deployment_id",
        "http://example.com/launch",
        "http://example.com/return",
        testContext,
        testResource,
        testUser,
        true,
        "test_gradebook_key",
        testCustomParams,
      );
      throw new Error("Expected error for unexpected error when generating LTI 1.3 login form data");
    } catch (err) {
      expect(err.message).to.equal("Validation Error: Unable to save LTI 1.3 Login - Aborting!");
    }
  });

  it("should register a new LTI provider using LTI 1.0 xml configuration", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null), // Simulate provider not found
      createProvider: sinon.stub().resolvesArg(0), // Echo back the created provider
    };
    const models = {};

    // Stub LTI10Utils.validateConfigXML to return a known value
    const validateConfigXMLStub = sinon.stub(LTI10Utils.prototype, "validateConfigXML").returns({
      title: "Test Provider",
      launch_url: "http://example.com/launch",
      extensions: {
        domain: "example.com",
      },
      custom: {
        param1: "value1",
        param2: "value2",
      },
    });

    // Call the function under test
    const controller = new LTIConsumerController(
      consumer,
      models,
      logger,
      domain_name,
      admin_email,
      provider_controller,
    );
    const result = await controller.lti10configxml({
      xml: "<xml>Test LTI 1.0 Config</xml>",
      url: null,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    });

    // Assertions
    expect(validateConfigXMLStub.calledOnce).to.be.true;
    expect(validateConfigXMLStub.firstCall.args[0]).to.equal("<xml>Test LTI 1.0 Config</xml>");
    expect(provider_controller.getByName.calledOnce).to.be.true;
    expect(provider_controller.getByName.firstCall.args[0]).to.equal("Test Provider");
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    const createdProviderArgs = provider_controller.createProvider.firstCall.args[0];
    expect(createdProviderArgs).to.include({
      name: "Test Provider",
      lti13: false,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
      launch_url: "http://example.com/launch",
      domain: "example.com",
      custom: JSON.stringify({
        param1: "value1",
        param2: "value2",
      }),
      use_section: false,
    });
    expect(result).to.deep.equal({
      name: "Test Provider",
      lti13: false,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
      launch_url: "http://example.com/launch",
      domain: "example.com",
      custom: JSON.stringify({
        param1: "value1",
        param2: "value2",
      }),
      use_section: false,
    });

    // Restore stubbed method
    validateConfigXMLStub.restore();
  });

  it("should rename when the same name already exists when registering using LTI 1.0 xml configuration", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const existingProvider = {
      name: "Test Provider",
      launch_url: "http://example.com/launch",
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(existingProvider), // Simulate provider found
      createProvider: sinon.stub(), // Should not be called
    };
    const models = {};

    // Stub LTI10Utils.validateConfigXML to return a known value
    const validateConfigXMLStub = sinon.stub(LTI10Utils.prototype, "validateConfigXML").returns({
      title: "Test Provider",
      launch_url: "http://example.com/launch",
      extensions: {
        domain: "example.com",
      },
      custom: {
        param1: "value1",
        param2: "value2",
      },
    });

    // Call the function under test
    const controller = new LTIConsumerController(
      consumer,
      models,
      logger,
      domain_name,
      admin_email,
      provider_controller,
    );
    await controller.lti10configxml({
      xml: "<xml>Test LTI 1.0 Config</xml>",
      url: null,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    });

    // Assertions
    expect(validateConfigXMLStub.calledOnce).to.be.true;
    expect(validateConfigXMLStub.firstCall.args[0]).to.equal("<xml>Test LTI 1.0 Config</xml>");
    expect(provider_controller.getByName.calledOnce).to.be.true;
    expect(provider_controller.getByName.firstCall.args[0]).to.equal("Test Provider");
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    const createdProviderArgs = provider_controller.createProvider.firstCall.args[0];
    expect(createdProviderArgs.name).to.match(/^Test Provider \(\w+\)$/); // Name should be renamed with a suffix

    // Restore stubbed method
    validateConfigXMLStub.restore();
  });

  it("should throw an error if the LTI 1.0 xml configuration is invalid when registering a new provider", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const provider_controller = {
      getByName: sinon.stub(), // Should not be called
      createProvider: sinon.stub(), // Should not be called
    };
    const models = {};

    // Stub LTI10Utils.validateConfigXML to throw an error
    const validateConfigXMLStub = sinon
      .stub(LTI10Utils.prototype, "validateConfigXML")
      .throws(new Error("Invalid XML"));

    // Call the function under test
    const controller = new LTIConsumerController(
      consumer,
      models,
      logger,
      domain_name,
      admin_email,
      provider_controller,
    );
    try {
      await controller.lti10configxml({
        xml: "<xml>Invalid LTI 1.0 Config</xml>",
        url: null,
        key: "test_consumer_key",
        secret: "test_consumer_secret",
      });
      throw new Error("Expected error for invalid LTI 1.0 XML configuration");
    } catch (err) {
      expect(err.message).to.equal("Invalid XML");
    }
    expect(validateConfigXMLStub.calledOnce).to.be.true;
    expect(validateConfigXMLStub.firstCall.args[0]).to.equal("<xml>Invalid LTI 1.0 Config</xml>");
    expect(provider_controller.getByName.notCalled).to.be.true;
    expect(provider_controller.createProvider.notCalled).to.be.true;

    // Restore stubbed method
    validateConfigXMLStub.restore();
  });

  it("should throw an error if there is a database error when creating the provider while registering using LTI 1.0 xml configuration", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null), // Simulate provider not found
      createProvider: sinon.stub().rejects(new Error("Database error")), // Simulate database error
    };
    const models = {};

    // Stub LTI10Utils.validateConfigXML to return a known value
    const validateConfigXMLStub = sinon.stub(LTI10Utils.prototype, "validateConfigXML").returns({
      title: "Test Provider",
      launch_url: "http://example.com/launch",
      extensions: {
        domain: "example.com",
      },
      custom: {
        param1: "value1",
        param2: "value2",
      },
    });

    // Call the function under test
    const controller = new LTIConsumerController(
      consumer,
      models,
      logger,
      domain_name,
      admin_email,
      provider_controller,
    );
    try {
      await controller.lti10configxml({
        xml: "<xml>Test LTI 1.0 Config</xml>",
        url: null,
        key: "test_consumer_key",
        secret: "test_consumer_secret",
      });
      throw new Error("Expected error for database error when creating provider");
    } catch (err) {
      expect(err.message).to.equal("Database error");
    }
    expect(validateConfigXMLStub.calledOnce).to.be.true;
    expect(validateConfigXMLStub.firstCall.args[0]).to.equal("<xml>Test LTI 1.0 Config</xml>");
    expect(provider_controller.getByName.calledOnce).to.be.true;
    expect(provider_controller.getByName.firstCall.args[0]).to.equal("Test Provider");
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    const createdProviderArgs = provider_controller.createProvider.firstCall.args[0];
    expect(createdProviderArgs).to.include({
      name: "Test Provider",
      lti13: false,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
      launch_url: "http://example.com/launch",
      domain: "example.com",
      custom: JSON.stringify({
        param1: "value1",
        param2: "value2",
      }),
      use_section: false,
    });

    // Restore stubbed method
    validateConfigXMLStub.restore();
  });

  it("should throw an error if the key or secret is missing when registering using LTI 1.0 xml configuration", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const provider_controller = {
      getByName: sinon.stub(), // Should not be called
      createProvider: sinon.stub(), // Should not be called
    };
    const models = {};

    // Call the function under test
    const controller = new LTIConsumerController(
      consumer,
      models,
      logger,
      domain_name,
      admin_email,
      provider_controller,
    );
    try {
      await controller.lti10configxml({
        xml: "<xml>Test LTI 1.0 Config</xml>",
        url: null,
        key: null,
        secret: "test_consumer_secret",
      });
      throw new Error("Expected error for missing key");
    } catch (err) {
      expect(err.message).to.equal("Invalid LTI 1.0 Configuration: Missing Key");
    }

    try {
      await controller.lti10configxml({
        xml: "<xml>Test LTI 1.0 Config</xml>",
        url: null,
        key: "test_consumer_key",
        secret: null,
      });
      throw new Error("Expected error for missing secret");
    } catch (err) {
      expect(err.message).to.equal("Invalid LTI 1.0 Configuration: Missing Secret");
    }
  });

  it("should handle missing domain in LTI 1.0 xml configuration by using the launch URL domain as fallback", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null), // Simulate provider not found
      createProvider: sinon.stub().resolvesArg(0), // Echo back the created provider
    };
    const models = {};

    // Stub LTI10Utils.validateConfigXML to return a known value without domain
    const validateConfigXMLStub = sinon.stub(LTI10Utils.prototype, "validateConfigXML").returns({
      title: "Test Provider",
      launch_url: "http://example.com/launch",
      extensions: {
        // No domain provided
      },
      custom: {
        param1: "value1",
        param2: "value2",
      },
    });

    // Call the function under test
    const controller = new LTIConsumerController(
      consumer,
      models,
      logger,
      domain_name,
      admin_email,
      provider_controller,
    );
    const result = await controller.lti10configxml({
      xml: "<xml>Test LTI 1.0 Config</xml>",
      url: null,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    });

    // Assertions
    expect(validateConfigXMLStub.calledOnce).to.be.true;
    expect(validateConfigXMLStub.firstCall.args[0]).to.equal("<xml>Test LTI 1.0 Config</xml>");
    expect(provider_controller.getByName.calledOnce).to.be.true;
    expect(provider_controller.getByName.firstCall.args[0]).to.equal("Test Provider");
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    const createdProviderArgs = provider_controller.createProvider.firstCall.args[0];
    expect(createdProviderArgs).to.include({
      name: "Test Provider",
      lti13: false,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
      launch_url: "http://example.com/launch",
      domain: "example.com", // Domain should be extracted from launch URL
      custom: JSON.stringify({
        param1: "value1",
        param2: "value2",
      }),
      use_section: false,
    });
    expect(result).to.deep.equal({
      name: "Test Provider",
      lti13: false,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
      launch_url: "http://example.com/launch",
      domain: "example.com", // Domain should be extracted from launch URL
      custom: JSON.stringify({
        param1: "value1",
        param2: "value2",
      }),
      use_section: false,
    });

    // Restore stubbed method
    validateConfigXMLStub.restore();
  });

  it("should handle empty custom parameters in LTI 1.0 xml configuration", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null), // Simulate provider not found
      createProvider: sinon.stub().resolvesArg(0), // Echo back the created provider
    };
    const models = {};

    // Stub LTI10Utils.validateConfigXML to return a known value with empty custom parameters
    const validateConfigXMLStub = sinon.stub(LTI10Utils.prototype, "validateConfigXML").returns({
      title: "Test Provider",
      launch_url: "http://example.com/launch",
      extensions: {
        domain: "example.com",
      },
      custom: {
        // No custom parameters
      },
    });

    // Call the function under test
    const controller = new LTIConsumerController(
      consumer,
      models,
      logger,
      domain_name,
      admin_email,
      provider_controller,
    );
    const result = await controller.lti10configxml({
      xml: "<xml>Test LTI 1.0 Config</xml>",
      url: null,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    });

    // Assertions
    expect(validateConfigXMLStub.calledOnce).to.be.true;
    expect(validateConfigXMLStub.firstCall.args[0]).to.equal("<xml>Test LTI 1.0 Config</xml>");
    expect(provider_controller.getByName.calledOnce).to.be.true;
    expect(provider_controller.getByName.firstCall.args[0]).to.equal("Test Provider");
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    const createdProviderArgs = provider_controller.createProvider.firstCall.args[0];
    expect(createdProviderArgs).to.include({
      name: "Test Provider",
      lti13: false,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
      launch_url: "http://example.com/launch",
      domain: "example.com", // Domain should be extracted from launch URL
      custom: JSON.stringify({}), // Custom should be an empty object
      use_section: false,
    });
    expect(result).to.deep.equal({
      name: "Test Provider",
      lti13: false,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
      launch_url: "http://example.com/launch",
      domain: "example.com", // Domain should be extracted from launch URL
      custom: JSON.stringify({}), // Custom should be an empty object
      use_section: false,
    });

    // Restore stubbed method
    validateConfigXMLStub.restore();
  });

  it("should handle missing custom parameters in LTI 1.0 xml configuration", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null), // Simulate provider not found
      createProvider: sinon.stub().resolvesArg(0), // Echo back the created provider
    };
    const models = {};

    // Stub LTI10Utils.validateConfigXML to return a known value with empty custom parameters
    const validateConfigXMLStub = sinon.stub(LTI10Utils.prototype, "validateConfigXML").returns({
      title: "Test Provider",
      launch_url: "http://example.com/launch",
      extensions: {
        domain: "example.com",
      },
      // No custom parameters provided
    });

    // Call the function under test
    const controller = new LTIConsumerController(
      consumer,
      models,
      logger,
      domain_name,
      admin_email,
      provider_controller,
    );
    const result = await controller.lti10configxml({
      xml: "<xml>Test LTI 1.0 Config</xml>",
      url: null,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
    });

    // Assertions
    expect(validateConfigXMLStub.calledOnce).to.be.true;
    expect(validateConfigXMLStub.firstCall.args[0]).to.equal("<xml>Test LTI 1.0 Config</xml>");
    expect(provider_controller.getByName.calledOnce).to.be.true;
    expect(provider_controller.getByName.firstCall.args[0]).to.equal("Test Provider");
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    const createdProviderArgs = provider_controller.createProvider.firstCall.args[0];
    expect(createdProviderArgs).to.include({
      name: "Test Provider",
      lti13: false,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
      launch_url: "http://example.com/launch",
      domain: "example.com", // Domain should be extracted from launch URL
      custom: null, // Custom should be null when not provided
      use_section: false,
    });
    expect(result).to.deep.equal({
      name: "Test Provider",
      lti13: false,
      key: "test_consumer_key",
      secret: "test_consumer_secret",
      launch_url: "http://example.com/launch",
      domain: "example.com", // Domain should be extracted from launch URL
      custom: null, // Custom should be null when not provided
      use_section: false,
    });

    // Restore stubbed method
    validateConfigXMLStub.restore();
  });

  it("should handle an LTI 1.3 dynamic registration URL", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test LTI Consumer",
      product_version: "1.0",
      deployment_id: "test-deployment",
      deployment_name: "Test Deployment",
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null), // Simulate provider not found
      createProvider: sinon.stub().resolvesArg(0), // Echo back the created provider
    };
    const models = {};

    // Stub LTI13Utils.handleDynamicRegistrationRequest to return a known value
    const handleDynamicRegistrationRequestStub = sinon
      .stub(LTI13Utils.prototype, "handleDynamicRegistrationRequest")
      .resolves("<html>Dynamic Registration Form</html>");

    // Call the function under test
    const controller = new LTIConsumerController(
      consumer,
      models,
      logger,
      domain_name,
      admin_email,
      provider_controller,
    );
    const result = await controller.lti13dynamicregistration("https://example.com/registration");

    // Assertions
    expect(handleDynamicRegistrationRequestStub.calledOnce).to.be.true;
    expect(handleDynamicRegistrationRequestStub.firstCall.args[0]).to.equal("https://example.com/registration");
    expect(handleDynamicRegistrationRequestStub.firstCall.args[1]).to.equal("/lti/consumer");
    expect(result).to.equal("<html>Dynamic Registration Form</html>");
  });
});
