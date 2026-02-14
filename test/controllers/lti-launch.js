/**
 * @file /controllers/lti-launch.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should, expect } from "chai";
import sinon from "sinon";
import crypto from "crypto";

// Load module under test
import LTILaunchController from "../../src/controllers/lti-launch.js";

// Utilities to stub
import LTI10Utils from "../../src/lib/lti10.js";
import LTI13Utils from "../../src/lib/lti13.js";

// Load logger
import configureLogger from "../../src/config/logger.js";

// Modify Object.prototype for BDD style assertions
should();

describe("/controllers/lti-launch.js", () => {
  const handleLaunchStub = sinon.stub().resolves("/redirectURL");
  const logger = configureLogger("error");
  const domain_name = "http://localhost:3000";

  it("should create an LTILaunchController instance with the correct properties", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunchStub };
    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { createConsumer: sinon.stub() };
    
    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    
    // Assertions
    expect(controller).to.be.an.instanceOf(LTILaunchController);
  });

  // Test LTI 1.0 Launch
  const testLLTI10LaunchRequest = {
    body: {
      oauth_consumer_key: "test-key",
      // Other LTI 1.0 parameters would go here
    }
  }

  const testLTILaunchResult = {
    oauth_consumer_key: "test-key",
    tool_consumer_info_product_family_code: "Test Product",
    tool_consumer_info_version: "1.0",
    tool_consumer_instance_guid: "test-guid",
    tool_consumer_instance_name: "Test Consumer",
    custom_one: "Custom Value 1",
    custom_two: "Custom Value 2",
    context_id: "test-context-id",
    context_title: "Test Context",
    resource_link_id: "test-resource-link-id",
    ext_lti_assignment_id: "test-assignment-id",
    resource_link_title: "Test Resource Link",
    launch_presentation_return_url: "http://localhost:3000/return",
    lis_outcome_service_url: "http://localhost:3000/grade",
    lis_result_sourcedid: "test-sourcedid",
    user_id: "test-user-id",
    lis_person_contact_email_primary: "user@localhost.tld",
    lis_person_name_full: "Test User",
    lis_person_name_given: "Test",
    lis_person_name_family: "User",
    user_image: "http://localhost:3000/user-image.png",
    roles: "Instructor,Student"
  }

  const testLTILaunchData = {
    launch_type: "lti1.0",
      tool_consumer_key: testLTILaunchResult.oauth_consumer_key,
      course_id: testLTILaunchResult.context_id,
      course_label: testLTILaunchResult.context_label,
      course_name: testLTILaunchResult.context_title,
      assignment_id: testLTILaunchResult.resource_link_id,
      assignment_lti_id: testLTILaunchResult.ext_lti_assignment_id,
      assignment_name: testLTILaunchResult.resource_link_title,
      return_url: testLTILaunchResult.launch_presentation_return_url,
      outcome_url: testLTILaunchResult.lis_outcome_service_url,
      outcome_id: testLTILaunchResult.lis_result_sourcedid,
      outcome_ags: null,
      user_lis_id: testLTILaunchResult.user_id,
      user_lis13_id: null,
      user_email: testLTILaunchResult.lis_person_contact_email_primary,
      user_name: testLTILaunchResult.lis_person_name_full,
      user_given_name: testLTILaunchResult.lis_person_name_given,
      user_family_name: testLTILaunchResult.lis_person_name_family,
      user_image: testLTILaunchResult.user_image,
      user_roles: testLTILaunchResult.roles,
      custom: {
        custom_one: testLTILaunchResult.custom_one,
        custom_two: testLTILaunchResult.custom_two
      },
  }

  const consumerProductStub = {
    tc_product: "Old Product",
    tc_version: "0.1",
    tc_guid: "old-guid",
    tc_name: "Old Consumer",
    set: sinon.stub().resolves(),
    save: sinon.stub().resolves()
  }

  it("should fail if key and id token are both missing in the launch request", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunchStub };
    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { createConsumer: sinon.stub() };

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch({ body: {} });
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Launch Error: Missing id_token or oauth_consumer_key");
    }
  });

  it("should handle a complete LTI 1.0 launch request properly", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunchStub };
    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProductStub) };

    // Stub the LTI 1.0 utility function to return a successful launch response
    sinon.stub(LTI10Utils.prototype, "validate10").resolves(testLTILaunchResult);
    
    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    const result = await controller.launch(testLLTI10LaunchRequest);
    
    // Assertions
    // LMS Product information should be updated
    expect(consumerProductStub.set.calledWith({
      tc_product: "Test Product",
      tc_version: "1.0",
      tc_guid: "test-guid",
      tc_name: "Test Consumer"
    })).to.be.true;
    expect(consumerProductStub.save.calledOnce).to.be.true;
    expect(handleLaunchStub.calledOnce).to.be.true;
    // Check Launch Handler Params
    expect(handleLaunchStub.firstCall.args[0]).to.deep.equal(testLTILaunchData);
    expect(handleLaunchStub.firstCall.args[1]).to.deep.equal(consumerProductStub);
    expect(handleLaunchStub.firstCall.args[2]).to.deep.equal(testLLTI10LaunchRequest);
    expect(result).to.equal("/redirectURL");

    // Restore the stubbed method
    LTI10Utils.prototype.validate10.restore();
  });

  it("should fail if the LTI 1.0 launch request is invalid", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunchStub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProductStub) };

    // Stub the LTI 1.0 utility function to return false for an invalid launch
    sinon.stub(LTI10Utils.prototype, "validate10").throws(new Error("Invalid LTI 1.0 Launch Request"));
    
    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI10LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Invalid LTI 1.0 Launch Request");
    }

    // Restore the stubbed method
    LTI10Utils.prototype.validate10.restore();
  });

  it("should throw an error if the LTI Consumer cannot be found for the given key", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunchStub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(null) };

    // Stub the LTI 1.0 utility function to return a successful launch response
    sinon.stub(LTI10Utils.prototype, "validate10").resolves(testLTILaunchResult);

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI10LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Launch Error: Cannot find LTI Consumer for key: test-key");
    }
  });

  it("should log a warning if the Tool Consumer data has changed since the last launch", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunchStub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProductStub) };

    // Stub the LTI 1.0 utility function to return a successful launch response
    sinon.stub(LTI10Utils.prototype, "validate10").resolves(testLTILaunchResult);
    
    // Spy on the logger
    const loggerSpy = sinon.spy(logger, "warn");

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    await controller.launch(testLLTI10LaunchRequest);
    
    // Assertions
    expect(loggerSpy.calledWith("Tool Consumer Data Changed!")).to.be.true;
    expect(loggerSpy.calledWithMatch(/Old: /)).to.be.true;
    expect(loggerSpy.calledWithMatch(/New: /)).to.be.true;

    // Restore the stubbed method and spy
    LTI10Utils.prototype.validate10.restore();
    logger.warn.restore();
  });

  it("should not log a warning if the Tool Consumer data has not changed since the last launch", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunchStub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves({
      tc_product: "Test Product",
      tc_version: "1.0",
      tc_guid: "test-guid",
      tc_name: "Test Consumer",
      set: sinon.stub().resolves(),
      save: sinon.stub().resolves()
    }) };

    // Stub the LTI 1.0 utility function to return a successful launch response
    sinon.stub(LTI10Utils.prototype, "validate10").resolves(testLTILaunchResult);

    // Spy on the logger
    const loggerSpy = sinon.spy(logger, "warn");

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    await controller.launch(testLLTI10LaunchRequest);
    
    // Assertions
    expect(loggerSpy.calledWith("Tool Consumer Data Changed!")).to.be.false;

    // Restore the stubbed method and spy
    LTI10Utils.prototype.validate10.restore();
    logger.warn.restore();
  });

  it("should handle errors thrown by the provider's handleLaunch function", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: sinon.stub().throws(new Error("Provider Launch Error")) };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProductStub) };

    // Stub the LTI 1.0 utility function to return a successful launch response
    sinon.stub(LTI10Utils.prototype, "validate10").resolves(testLTILaunchResult);
    
    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI10LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Provider Launch Error");
    }

    // Restore the stubbed method
    LTI10Utils.prototype.validate10.restore();
  });

  // Test LTI 1.3 Launches
  const handleLaunch13Stub = sinon.stub().resolves("/redirectURL");

  const testLLTI13LaunchRequest = {
    body: {
      id_token: "id-token",
      // Other LTI 1.3 parameters would go here
    }
  }

  const baseUrl = "https://purl.imsglobal.org/spec/lti/claim/";
  const agsUrl = "https://purl.imsglobal.org/spec/lti-ags/claim/";
  const dlUrl = "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings";

  const testLTI13LaunchResult = {
    key: "test-key",
    [baseUrl + "message_type"]: "LtiResourceLinkRequest",
    [baseUrl + "tool_platform"]: {
      product_family_code: "Test Product",
      version: "1.3",
      guid: "test-guid",
      name: "Test Consumer"
    },
    [baseUrl + "context"]: {
      id: "test-context-id",
      label: "Test Context Label",
      title: "Test Context Title"
    },
    [baseUrl + "lti1p1"]: {
      resource_link_id: "test-resource-link-id",
      user_id: "test-user-id",
    },
    [baseUrl + "resource_link"]: {
      id: "test-resource-link-id",
      title: "Test Resource Link Title"
    },
    [baseUrl + "launch_presentation"]: {
      return_url: "http://localhost:3000/return"
    },
    [agsUrl + "endpoint"]: {
      lineitem: "http://localhost:3000/grade",
      lineitems: "http://localhost:3000/grades"
    },
    sub: "test-user-id",
    email: "user@localhost.tld",
    name: "Test User",
    given_name: "Test",
    family_name: "User",
    picture: "http://localhost:3000/user-image.png",
    roles: "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor,http://purl.imsglobal.org/vocab/lis/v2/membership#Student",
    custom: {
      custom_one: "Custom Value 1",
      custom_two: "Custom Value 2"
    }
  }

  const testLTI13LaunchData = {
    launch_type: "lti1.3",
    tool_consumer_key: testLTI13LaunchResult.key,
    course_id: testLTI13LaunchResult[baseUrl + "context"].id,
    course_label: testLTI13LaunchResult[baseUrl + "context"].label,
    course_name: testLTI13LaunchResult[baseUrl + "context"].title,
    assignment_id: testLTI13LaunchResult[baseUrl + "lti1p1"]?.resource_link_id,
    assignment_lti_id: testLTI13LaunchResult[baseUrl + "resource_link"]?.id,
    assignment_name: testLTI13LaunchResult[baseUrl + "resource_link"]?.title,
    return_url: testLTI13LaunchResult[baseUrl + "launch_presentation"]?.return_url,
    outcome_url: testLTI13LaunchResult[agsUrl + "endpoint"]?.lineitem,
    outcome_id: null,
    outcome_ags: JSON.stringify(testLTI13LaunchResult[agsUrl + "endpoint"]),
    user_lis_id: testLTI13LaunchResult[baseUrl + "lti1p1"]?.user_id,
    user_lis13_id: testLTI13LaunchResult.sub,
    user_email: testLTI13LaunchResult.email,
    user_name: testLTI13LaunchResult.name,
    user_given_name: testLTI13LaunchResult.given_name,
    user_family_name: testLTI13LaunchResult.family_name,
    user_image: testLTI13LaunchResult.picture,
    user_roles: testLTI13LaunchResult[baseUrl + "roles"],
    custom: testLTI13LaunchResult[baseUrl + "custom"],
  }

  const consumerProduct13Stub = {
    tc_product: "Old Product",
    tc_version: "0.1",
    tc_guid: "old-guid",
    tc_name: "Old Consumer",
    set: sinon.stub().resolves(),
    save: sinon.stub().resolves()
  }

  const testLTI13DeeplinkingResult = {
    key: "test-key",
    [baseUrl + "message_type"]: "LtiDeepLinkingRequest",
    [baseUrl + "tool_platform"]: {
      product_family_code: "Test Product",
      version: "1.3",
      guid: "test-guid",
      name: "Test Consumer"
    },
    [baseUrl + "context"]: {
      id: "test-context-id",
      label: "Test Context Label",
      title: "Test Context Title"
    },
    [baseUrl + "lti1p1"]: {
      user_id: "test-user-id",
    },
    [baseUrl + "launch_presentation"]: {
      return_url: "http://localhost:3000/return"
    },
    sub: "test-user-id",
    email: "user@localhost.tld",
    name: "Test User",
    given_name: "Test",
    family_name: "User",
    picture: "http://localhost:3000/user-image.png",
    roles: "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor,http://purl.imsglobal.org/vocab/lis/v2/membership#Student",
    custom: {
      custom_one: "Custom Value 1",
      custom_two: "Custom Value 2"
    },
    [dlUrl]: {
      deep_link_return_url: "http://localhost:3000/deeplink-return"
    }
  }

  const handleDeeplink13Stub = sinon.stub().resolves("/redirectURL");

  const testLTI13DeeplinkingData = {
    launch_type: "lti1.3deeplink",
    tool_consumer_key: testLTI13DeeplinkingResult.key,
    course_id: testLTI13DeeplinkingResult[baseUrl + "context"].id,
    course_label: testLTI13DeeplinkingResult[baseUrl + "context"].label,
    course_name: testLTI13DeeplinkingResult[baseUrl + "context"].title,
    return_url: testLTI13DeeplinkingResult[baseUrl + "launch_presentation"]?.return_url,
    user_lis_id: testLTI13DeeplinkingResult[baseUrl + "lti1p1"]?.user_id,
    user_lis13_id: testLTI13DeeplinkingResult.sub,
    user_email: testLTI13DeeplinkingResult.email,
    user_name: testLTI13DeeplinkingResult.name,
    user_given_name: testLTI13DeeplinkingResult.given_name,
    user_family_name: testLTI13DeeplinkingResult.family_name,
    user_image: testLTI13DeeplinkingResult.picture,
    user_roles: testLTI13DeeplinkingResult[baseUrl + "roles"],
    custom: testLTI13DeeplinkingResult[baseUrl + "custom"],
    deep_link_return_url: testLTI13DeeplinkingResult[dlUrl]?.deep_link_return_url
  }

    const consumerProduct13DLStub = {
    tc_product: "Old Product",
    tc_version: "0.1",
    tc_guid: "old-guid",
    tc_name: "Old Consumer",
    set: sinon.stub().resolves(),
    save: sinon.stub().resolves()
  }

  it("should handle a complete LTI 1.3 launch request properly", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunch13Stub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProduct13Stub) };

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves(testLTI13LaunchResult);
    
    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    const result = await controller.launch(testLLTI13LaunchRequest);
    
    // Assertions
    // LMS Product information should be updated
    expect(consumerProduct13Stub.set.calledWith({
      tc_product: "Test Product",
      tc_version: "1.3",
      tc_guid: "test-guid",
      tc_name: "Test Consumer"
    })).to.be.true;
    expect(consumerProduct13Stub.save.calledOnce).to.be.true;
    expect(handleLaunch13Stub.calledOnce).to.be.true;
    // Check Launch Handler Params
    expect(handleLaunch13Stub.firstCall.args[0]).to.deep.equal(testLTI13LaunchData);
    expect(handleLaunch13Stub.firstCall.args[1]).to.deep.equal(consumerProduct13Stub);
    expect(handleLaunch13Stub.firstCall.args[2]).to.deep.equal(testLLTI13LaunchRequest);
    expect(result).to.equal("/redirectURL");

    // Restore the stubbed method
    LTI13Utils.prototype.launchRequest.restore();
  });

  it("should fail if the LTI 1.3 launch request is invalid", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunch13Stub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProduct13Stub) };

    // Stub the LTI 1.3 utility function to return false for an invalid launch
    sinon.stub(LTI13Utils.prototype, "launchRequest").throws(new Error("Invalid LTI 1.3 Launch Request"));
    
    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI13LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Invalid LTI 1.3 Launch Request");
    }

    // Restore the stubbed method
    LTI13Utils.prototype.launchRequest.restore();
  });

  it("should throw an error if the LTI 1.3 Consumer cannot be found for the given key", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunch13Stub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(null) };

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves(testLTI13LaunchResult);

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI13LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Launch Error: Cannot find LTI Consumer for key: test-key");
    }
  });

  it("should log a warning if the Tool Consumer data has changed since the last launch", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunch13Stub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProduct13Stub) };

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves(testLTI13LaunchResult);
    
    // Spy on the logger
    const loggerSpy = sinon.spy(logger, "warn");

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    await controller.launch(testLLTI13LaunchRequest);
    
    // Assertions
    expect(loggerSpy.calledWith("Tool Consumer Data Changed!")).to.be.true;
    expect(loggerSpy.calledWithMatch(/Old: /)).to.be.true;
    expect(loggerSpy.calledWithMatch(/New: /)).to.be.true;

    // Restore the stubbed method and spy
    LTI13Utils.prototype.launchRequest.restore();
    logger.warn.restore();
  });

  it("should not log a warning if the Tool Consumer data has not changed since the last launch", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunch13Stub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves({
      tc_product: "Test Product",
      tc_version: "1.3",
      tc_guid: "test-guid",
      tc_name: "Test Consumer",
      set: sinon.stub().resolves(),
      save: sinon.stub().resolves()
    }) };

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves(testLTI13LaunchResult);

    // Spy on the logger
    const loggerSpy = sinon.spy(logger, "warn");

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    await controller.launch(testLLTI13LaunchRequest);
    
    // Assertions
    expect(loggerSpy.calledWith("Tool Consumer Data Changed!")).to.be.false;

    // Restore the stubbed method and spy
    LTI13Utils.prototype.launchRequest.restore();
    logger.warn.restore();
  });

  it("should handle errors thrown by the provider's handleLaunch function", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: sinon.stub().throws(new Error("Provider Launch Error")) };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProduct13Stub) };

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves(testLTI13LaunchResult);
    
    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI13LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Provider Launch Error");
    }

    // Restore the stubbed method
    LTI13Utils.prototype.launchRequest.restore();
  });

  it("should handle a complete LTI 1.3 deep linking request properly", async () => {
    // Create mock dependencies
    const provider = { handleDeeplink: handleDeeplink13Stub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProduct13DLStub) };

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves(testLTI13DeeplinkingResult);

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    const result = await controller.launch(testLLTI13LaunchRequest);
    
    // Assertions
    // LMS Product information should be updated
    expect(consumerProduct13DLStub.set.calledWith({
      tc_product: "Test Product",
      tc_version: "1.3",
      tc_guid: "test-guid",
      tc_name: "Test Consumer"
    })).to.be.true;
    expect(consumerProduct13DLStub.save.calledOnce).to.be.true;
    expect(handleDeeplink13Stub.calledOnce).to.be.true;
    // Check Launch Handler Params
    expect(handleDeeplink13Stub.firstCall.args[0]).to.deep.equal(testLTI13DeeplinkingData);
    expect(handleDeeplink13Stub.firstCall.args[1]).to.deep.equal(consumerProduct13DLStub);
    expect(handleDeeplink13Stub.firstCall.args[2]).to.deep.equal(testLLTI13LaunchRequest);
    expect(result).to.equal("/redirectURL");

    // Restore the stubbed method
    LTI13Utils.prototype.launchRequest.restore();
  });

  it("should fail on invalid message type", async () => {
    // Create mock dependencies
    const provider = { handleLaunch: handleLaunch13Stub };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProduct13Stub) };

    // Stub the LTI 1.3 utility function to return a launch response with an invalid message type
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves({
      ...testLTI13LaunchResult,
      [baseUrl + "message_type"]: "InvalidMessageType"
    });

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI13LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Launch Error: Unsupported LTI Message Type: InvalidMessageType");
    }

    // Restore the stubbed method
    LTI13Utils.prototype.launchRequest.restore();
  });

  it("should handle errors thrown by the provider's handleDeeplink function", async () => {
    // Create mock dependencies
    const provider = { handleDeeplink: sinon.stub().throws(new Error("Provider Deeplink Error")) };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProduct13DLStub) };

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves(testLTI13DeeplinkingResult);
    
    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI13LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Provider Deeplink Error");
    }

    // Restore the stubbed method
    LTI13Utils.prototype.launchRequest.restore();
  });

  it("should fail if no handleLaunch function is defined on the provider for LTI 1.3 messages", async () => {
    // Create mock dependencies
    const provider = { /* No handleLaunch function */ };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProduct13Stub) };

    // Stub the LTI 1.3 utility function to return a successful launch response
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves(testLTI13LaunchResult);

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI13LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Launch Error: No provider.handleLaunch function defined!");
    }

    // Restore the stubbed method
    LTI13Utils.prototype.launchRequest.restore();
  });

  it("should fail if no handleDeeplink function is defined on the provider for LTI 1.3 deep linking messages", async () => {
    // Create mock dependencies
    const provider = { /* No handleDeeplink function */ };

    const models = { ConsumerKey: { findOne: sinon.stub(), findAll: sinon.stub() } };
    const consumer_controller = { getByKey: sinon.stub().resolves(consumerProduct13DLStub) };

    // Stub the LTI 1.3 utility function to return a deep linking launch response
    sinon.stub(LTI13Utils.prototype, "launchRequest").resolves(testLTI13DeeplinkingResult);

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.launch(testLLTI13LaunchRequest);
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Deeplink Error: No provider.handleDeeplink function defined!");
    }

    // Restore the stubbed method
    LTI13Utils.prototype.launchRequest.restore();
  });

  // LTI 1.3 Login Tests
  it("should handle a complete LTI 1.3 login request properly", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };
    const consumer_controller = { };
    const authForm = {
      attribute: "value"
    }

    // Stub the LTI 1.3 utility function to return a deep linking launch response
    sinon.stub(LTI13Utils.prototype, "authRequest").resolves(authForm);

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    const result = await controller.login13({
      body: {
        id_token: "id-token",
      }
    });
    
    // Assertions
    expect(LTI13Utils.prototype.authRequest.calledOnce).to.be.true;
    expect(result).to.deep.equal(authForm);

    // Restore the stubbed method
    LTI13Utils.prototype.authRequest.restore();
  });

  it("should fail if the LTI 1.3 login request is invalid", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };
    const consumer_controller = { };

    // Stub the LTI 1.3 utility function to throw an error for an invalid login request
    sinon.stub(LTI13Utils.prototype, "authRequest").throws(new Error("Invalid LTI 1.3 Login Request"));

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);

    try {
      await controller.login13({
        body: {
          id_token: "id-token",
        }
      });
      throw new Error("Expected error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Invalid LTI 1.3 Login Request");
    }

    // Restore the stubbed method
    LTI13Utils.prototype.authRequest.restore();
  });

  it("should return an array of JWKS keys for all consumers", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };
    const consumer_controller = { getAllKeys: sinon.stub().resolves([
      {
        key: "consumer1",
        public: "public-key-1"
      },
      {
        key: "consumer2",
        public: "public-key-2"
      }
    ]) };

    // Mock crypto module to return a dummy JWKS key for each consumer
    sinon.stub(crypto, "createPublicKey").callsFake((publicKey) => {
      return {
        export: sinon.stub().returns({
          key: `exported-${publicKey}`,
          kty: "RSA",
          kid: `kid-${publicKey}`
        })
      }
    });

    // Call the function under test
    const controller = new LTILaunchController(provider, models, logger, domain_name, consumer_controller);
    const result = await controller.generateConsumerJWKS();

    // Assertions
    expect(consumer_controller.getAllKeys.calledOnce).to.be.true;
    expect(crypto.createPublicKey.calledWith("public-key-1")).to.be.true;
    expect(crypto.createPublicKey.calledWith("public-key-2")).to.be.true;
    expect(result).to.deep.equal([
      {
        key: "exported-public-key-1",
        kty: "RSA",
        kid: "consumer1",
        alg: "RS256",
        use: "sig"
      },
      {
        key: "exported-public-key-2",
        kty: "RSA",
        kid: "consumer2",
        alg: "RS256",
        use: "sig"
      }
    ]);

    // Restore the stubbed method
    crypto.createPublicKey.restore();
  });
});