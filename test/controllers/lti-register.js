/**
 * @file /controllers/lti-register.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should, expect, assert } from "chai";
import sinon from "sinon";

// Load module under test
import LTIRegistrationController from "../../src/controllers/lti-register.js";

// Utilities to stub
import LTI13Utils from "../../src/lib/lti13.js";

// Load logger
import configureLogger from "../../src/config/logger.js";

// Modify Object.prototype for BDD style assertions
should();

describe("/controllers/lti-register.js", () => {
  const logger = configureLogger("error");
  const domain_name = "http://localhost:3000";
  const admin_email = "admin@localhost.tld";

  it("should create an LTIRegistrationController instance with the correct properties", async () => {
    // Create mock dependencies
    const provider_config = { };
    const models = { };
    const consumer_controller = {};

    // Create instance
    const controller = new LTIRegistrationController(
      provider_config,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Assert properties
    expect(controller).to.be.an.instanceOf(LTIRegistrationController);
  });

  it("should generate correct LTI 1.0 configuration XML", async () => {
    const provider_config = {
      title: "Test LTI Tool",
      description: "A test LTI tool for unit testing",
      icon_url: "http://localhost:3000/icon.png",
      custom_params: {
        custom_key1: "custom_value1",
        custom_key2: "custom_value2",
      },
      navigation: true,
      route_prefix: "/lti/provider",
      tool_id: "test-lti-tool",
      privacy_level: "public",
    };

    const controller = new LTIRegistrationController(
      provider_config,
      {},
      logger,
      domain_name,
      admin_email,
      {},
    );

    const configXML = await controller.getLTI10Config();

    // Assert XML contains required elements
    expect(configXML).to.include("<blti:title>Test LTI Tool</blti:title>");
    expect(configXML).to.include("<blti:description>A test LTI tool for unit testing</blti:description>");
    expect(configXML).to.include("<blti:icon>http://localhost:3000/icon.png</blti:icon>");
    expect(configXML).to.include('<lticm:property name="custom_key1">custom_value1</lticm:property>');
    expect(configXML).to.include('<lticm:property name="custom_key2">custom_value2</lticm:property>');
    // Launch URL
    expect(configXML).to.include(`<blti:launch_url>${domain_name}/lti/provider/launch</blti:launch_url>`);
    // Navigation options
    expect(configXML).to.include('<lticm:options name="course_navigation">');
    expect(configXML).to.include('<lticm:property name="default">disabled</lticm:property>');
    expect(configXML).to.include('<lticm:property name="enabled">true</lticm:property>');
    expect(configXML).to.include('<lticm:property name="windowTarget">_blank</lticm:property>');
    // Canvas extensions
    expect(configXML).to.include('<lticm:property name="tool_id">test-lti-tool</lticm:property>');
    expect(configXML).to.include('<lticm:property name="privacy_level">public</lticm:property>');
    expect(configXML).to.include(`<lticm:property name="domain">${domain_name.replace(/^https?:\/\//, "")}</lticm:property>`);
    
  });

  // LMS Details Fixture
  const confURL = "https://purl.imsglobal.org/spec/lti-platform-configuration";
  const canvasURL = "https://canvas.instructure.com/lti/";

  const createdConsumer = {
    id: "3",
    key: "test-key",
    name: "Test Account",
  };

  const registrationConfig = { 
    privacy_level: "anonymous", 
    handleDeeplink: null, 
    navigation: false,
    route_prefix: "/lti/provider",
    title: "Test LTI Tool",
    icon_url: "http://localhost:3000/icon.png",
    description: "A test LTI tool for unit testing",
    custom_params: {
      custom_key1: "custom_value1",
      custom_key2: "custom_value2",
    }, 
  };

  const lmsDetails = {
    [confURL]: {
      product_family_code: "test-lms",
      [canvasURL + "account_name"]: "Test Account",
    },
    issuer: "https://lms.example.com",
    jwks_uri: "https://lms.example.com/jwks",
    token_endpoint: "https://lms.example.com/token",
    authorization_endpoint: "https://lms.example.com/authorize",
    registration_endpoint: "https://lms.example.com/register",
  };

  const expectedConfig = {
    application_type: "web",
    response_types: ["id_token"],
    grant_types: ["implicit", "client_credentials"],
    initiate_login_uri:
      "http://localhost:3000/lti/provider/login",
    redirect_uris: [
      "http://localhost:3000/lti/provider/launch",
    ],
    client_name: "Test LTI Tool",
    logo_uri: "http://localhost:3000/icon.png",
    token_endpoint_auth_method: "private_key_jwt",
    jwks_uri: "http://localhost:3000/lti/provider/jwks",
    contacts: [admin_email],
    scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score ",
    "https://purl.imsglobal.org/spec/lti-tool-configuration": {
      domain: "localhost:3000",
      description: "A test LTI tool for unit testing",
      target_link_uri:
        "http://localhost:3000/lti/provider/launch",
      custom_parameters: {
        custom_key1: "custom_value1",
        custom_key2: "custom_value2",
      },
      claims: [
        "iss",
        "sub",
      ],
      messages: [],
    },
  };


  it("should handle a successful LTI 1.3 dynamic registration", async () => {
    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(createdConsumer)};

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").resolves(lmsDetails);

    // Spy the LTI 1.3 utility function to send registration to the LMS
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").resolves();
    
    // Create instance
    const controller = new LTIRegistrationController(
      registrationConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    await controller.dynamicRegistration({ registration_token: "abcd1234" });

    // Assert that the registration response was sent to the LMS with the expected configuration
    expect(registrationSpy.calledOnce).to.be.true;
    const [config, registrationEndpoint, consumer, registrationToken] = registrationSpy.firstCall.args;
    expect(config).to.deep.equal(expectedConfig);
    expect(registrationEndpoint).to.equal(lmsDetails.registration_endpoint);
    expect(consumer).to.deep.equal(createdConsumer);
    expect(registrationToken).to.equal("abcd1234");
  });

  it("should handle a successful LTI 1.3 dynamic registration - email privacy level", async () => {
    // Update registration config for email privacy level
    const updatedConfig = { ...registrationConfig, privacy_level: "email_only" };

    // Expected claims for email privacy level
    const claims = [
      "iss",
      "sub",
      "email",
    ];
    const updatedExpectedConfig = structuredClone(expectedConfig);
    updatedExpectedConfig["https://purl.imsglobal.org/spec/lti-tool-configuration"].claims = claims;

    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(createdConsumer)};

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").resolves(lmsDetails);

    // Spy the LTI 1.3 utility function to send registration to the LMS
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").resolves();
    
    // Create instance
    const controller = new LTIRegistrationController(
      updatedConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    await controller.dynamicRegistration({ registration_token: "abcd1234" });

    // Assert that the registration response was sent to the LMS with the expected configuration
    expect(registrationSpy.calledOnce).to.be.true;
    const [config, registrationEndpoint, consumer, registrationToken] = registrationSpy.firstCall.args;
    expect(config).to.deep.equal(updatedExpectedConfig);
    expect(registrationEndpoint).to.equal(lmsDetails.registration_endpoint);
    expect(consumer).to.deep.equal(createdConsumer);
    expect(registrationToken).to.equal("abcd1234");
  });

  it("should handle a successful LTI 1.3 dynamic registration - name privacy level", async () => {
    // Update registration config for name privacy level
    const updatedConfig = { ...registrationConfig, privacy_level: "name_only" };

    // Expected claims for name privacy level
    const claims = [
      "iss",
      "sub",
      "name",
    ];
    const updatedExpectedConfig = structuredClone(expectedConfig);
    updatedExpectedConfig["https://purl.imsglobal.org/spec/lti-tool-configuration"].claims = claims;

    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(createdConsumer)};

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").resolves(lmsDetails);

    // Spy the LTI 1.3 utility function to send registration to the LMS
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").resolves();
    
    // Create instance
    const controller = new LTIRegistrationController(
      updatedConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    await controller.dynamicRegistration({ registration_token: "abcd1234" });

    // Assert that the registration response was sent to the LMS with the expected configuration
    expect(registrationSpy.calledOnce).to.be.true;
    const [config, registrationEndpoint, consumer, registrationToken] = registrationSpy.firstCall.args;
    expect(config).to.deep.equal(updatedExpectedConfig);
    expect(registrationEndpoint).to.equal(lmsDetails.registration_endpoint);
    expect(consumer).to.deep.equal(createdConsumer);
    expect(registrationToken).to.equal("abcd1234");
  });

  it("should handle a successful LTI 1.3 dynamic registration - public privacy level", async () => {
    // Update registration config for public privacy level
    const updatedConfig = { ...registrationConfig, privacy_level: "public" };

    // Expected claims for public privacy level
    const claims = [
      "iss",
      "sub",
      "name",
      "given_name",
      "family_name",
      "email",
      "picture",
    ];
    const updatedExpectedConfig = structuredClone(expectedConfig);
    updatedExpectedConfig["https://purl.imsglobal.org/spec/lti-tool-configuration"].claims = claims;

    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(createdConsumer)};

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").resolves(lmsDetails);

    // Spy the LTI 1.3 utility function to send registration to the LMS
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").resolves();
    
    // Create instance
    const controller = new LTIRegistrationController(
      updatedConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    await controller.dynamicRegistration({ registration_token: "abcd1234" });

    // Assert that the registration response was sent to the LMS with the expected configuration
    expect(registrationSpy.calledOnce).to.be.true;
    const [config, registrationEndpoint, consumer, registrationToken] = registrationSpy.firstCall.args;
    expect(config).to.deep.equal(updatedExpectedConfig);
    expect(registrationEndpoint).to.equal(lmsDetails.registration_endpoint);
    expect(consumer).to.deep.equal(createdConsumer);
    expect(registrationToken).to.equal("abcd1234");
  });

  it("should handle a successful LTI 1.3 dynamic registration - deeplink enabled", async () => {
    // Update registration config for deeplink enabled
    const updatedConfig = { ...registrationConfig, handleDeeplink: () => {} };

    // Expected messages for deeplink enabled
    const messages = [{
      type: "LtiDeepLinkingRequest",
      target_link_url: "http://localhost:3000/lti/provider/launch",
      label: "Test LTI Tool",
      icon_uri: "http://localhost:3000/icon.png",
      // custom_parameters
      placements: ["https://canvas.instructure.com/lti/assignment_selection"],
      // roles
      supported_types: ["ltiResourceLink"],
      "https://canvas.instructure.com/lti/visibility": "admins",
      "https://canvas.instructure.com/lti/display_type": "new_window",
    }];
    const updatedExpectedConfig = structuredClone(expectedConfig);
    updatedExpectedConfig["https://purl.imsglobal.org/spec/lti-tool-configuration"].messages = messages;

    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(createdConsumer)};

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").resolves(lmsDetails);

    // Spy the LTI 1.3 utility function to send registration to the LMS
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").resolves();
    
    // Create instance
    const controller = new LTIRegistrationController(
      updatedConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    await controller.dynamicRegistration({ registration_token: "abcd1234" });

    // Assert that the registration response was sent to the LMS with the expected configuration
    expect(registrationSpy.calledOnce).to.be.true;
    const [config, registrationEndpoint, consumer, registrationToken] = registrationSpy.firstCall.args;
    expect(config).to.deep.equal(updatedExpectedConfig);
    expect(registrationEndpoint).to.equal(lmsDetails.registration_endpoint);
    expect(consumer).to.deep.equal(createdConsumer);
    expect(registrationToken).to.equal("abcd1234");
  });

  it("should handle a successful LTI 1.3 dynamic registration - navigation enabled", async () => {
    // Update registration config for navigation enabled
    const updatedConfig = { ...registrationConfig, navigation: true };

    // Expected messages for nagivation enabled
    const messages = [{
      type: "LtiResourceLinkRequest",
      target_link_url:"http://localhost:3000/lti/provider/launch",
      label: "Test LTI Tool",
      icon_uri: "http://localhost:3000/icon.png",
      // custom_parameters
      placements: ["https://canvas.instructure.com/lti/course_navigation"],
      // roles
      supported_types: ["ltiResourceLink"],
      "https://canvas.instructure.com/lti/course_navigation/default_enabled": false,
      "https://canvas.instructure.com/lti/visibility": "members",
      "https://canvas.instructure.com/lti/display_type": "new_window",
    }];
    const updatedExpectedConfig = structuredClone(expectedConfig);
    updatedExpectedConfig["https://purl.imsglobal.org/spec/lti-tool-configuration"].messages = messages;

    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(createdConsumer)};

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").resolves(lmsDetails);

    // Spy the LTI 1.3 utility function to send registration to the LMS
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").resolves();
    
    // Create instance
    const controller = new LTIRegistrationController(
      updatedConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    await controller.dynamicRegistration({ registration_token: "abcd1234" });

    // Assert that the registration response was sent to the LMS with the expected configuration
    expect(registrationSpy.calledOnce).to.be.true;
    const [config, registrationEndpoint, consumer, registrationToken] = registrationSpy.firstCall.args;
    expect(config).to.deep.equal(updatedExpectedConfig);
    expect(registrationEndpoint).to.equal(lmsDetails.registration_endpoint);
    expect(consumer).to.deep.equal(createdConsumer);
    expect(registrationToken).to.equal("abcd1234");
  });

  it("should fail when getting LMS details fails", async () => {
    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(createdConsumer)};

    // Stub the LTI 1.3 utility function to return a failed launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").rejects(new Error("Failed to get LMS details"));

    // Spy the LTI 1.3 utility function to send registration to the LMS
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").resolves();
    
    // Create instance
    const controller = new LTIRegistrationController(
      registrationConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    try {
      await controller.dynamicRegistration({ registration_token: "abcd1234" });
      assert.fail("Expected error was not thrown");
    } catch (error) {
      expect(error.message).to.equal("Failed to get LMS details");
    }

    // Assert that the registration response was not sent to the LMS and error was logged
    expect(registrationSpy.notCalled).to.be.true;
  });

  it("should fail when creating consumer fails", async () => {
    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(null)};

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").resolves(lmsDetails);

    // Spy the LTI 1.3 utility function to send registration to the LMS
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").resolves();
    
    // Create instance
    const controller = new LTIRegistrationController(
      registrationConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    try {
      await controller.dynamicRegistration({ registration_token: "abcd1234" });
      assert.fail("Expected error was not thrown");
    } catch (error) {
      expect(error.message).to.equal("Dynamic Registration: Failed to create consumer");
    }

    // Assert that the registration response was not sent to the LMS and error was logged
    expect(registrationSpy.notCalled).to.be.true;
  });

  it("should fail when sending registration response fails", async () => {
    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(createdConsumer)};

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").resolves(lmsDetails);

    // Spy the LTI 1.3 utility function to send registration to the LMS and return an error
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").rejects(new Error("Failed to send registration response"));
    
    // Create instance
    const controller = new LTIRegistrationController(
      registrationConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    try {
      await controller.dynamicRegistration({ registration_token: "abcd1234" });
      assert.fail("Expected error was not thrown");
    } catch (error) {
      expect(error.message).to.equal("Dynamic Registration: Failed to register LTI 1.3 configuration with LMS");
    }

    // Assert that the registration response was sent to the LMS and error was logged
    expect(registrationSpy.calledOnce).to.be.true;
  });

  it("should fail when sending registration response fails and log error json", async () => {
    // Create mock dependencies
    const models = { };
    const consumer_controller = { createConsumer: sinon.stub().resolves(createdConsumer)};

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "getLMSDetails").resolves(lmsDetails);

    // Spy the LTI 1.3 utility function to send registration to the LMS and return an error
    const err = new Error("Failed to send registration response");
    err.response = {
      json: sinon.stub().resolves({ error: "Invalid registration data" }),
    };
    const registrationSpy = sinon.stub(LTI13Utils.prototype, "sendRegistrationResponse").rejects(err);
    
    // Create instance
    const controller = new LTIRegistrationController(
      registrationConfig,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Call dynamic registration method
    try {
      await controller.dynamicRegistration({ registration_token: "abcd1234" });
      assert.fail("Expected error was not thrown");
    } catch (error) {
      expect(error.message).to.equal("Dynamic Registration: Failed to register LTI 1.3 configuration with LMS");
    }

    // Assert that the registration response was sent to the LMS and error was logged
    expect(registrationSpy.calledOnce).to.be.true;
  });

});
