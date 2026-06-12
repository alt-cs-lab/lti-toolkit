/**
 * @file /controllers/lti-lms.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { use, should, expect } from "chai";
import chaiShallowDeepEqual from "chai-shallow-deep-equal";
import sinon from "sinon";
import crypto from "crypto";

// Load module under test
import LTILMSController from "../../src/controllers/lti-lms.js";

// Utilities to stub
import LTI10Utils from "../../src/lib/lti10.js";
import LTI13Utils from "../../src/lib/lti13.js";

// Load logger
import configureLogger from "../../src/config/logger.js";

// Modify Object.prototype for BDD style assertions
should();
use(chaiShallowDeepEqual);

describe("/controllers/lti-lms.js", () => {
  const logger = configureLogger("error");
  const domain_name = "http://localhost:3000";

  it("should create an LTILMSController instance with the correct properties", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {};
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    // Call the function under test
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Assertions
    expect(controller).to.be.an.instanceOf(LTILMSController);
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
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

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
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

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
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

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
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

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
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

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
    expect(buildResponseStub.firstCall.args[2]).to.equal("Grade posted successfully");
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
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

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
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

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
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

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

  it("should handle an incoming LTI 1.3 auth request and return the expected response", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
    };
    const models = {};
    const provider_controller = {};

    // Stub LTI 1.3 library functions to return known values
    const validateOauthStub = sinon.stub(LTI13Utils.prototype, "validateAuthRequest").resolves({
      state: "test_state",
      loginState: {
        data: {
          url: "http://localhost:3000/lti/consumer/launch",
        },
      },
    });
    const buildLaunchJWTStub = sinon.stub(LTI13Utils.prototype, "buildLaunchJWT").resolves("mock_launch_jwt");
    
    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Call the function under test
    const mockReq = {
      body: {
        client_id: "test_client_id",
        login_hint: "test_login_hint",
        lti_message_hint: "test_lti_message_hint",
        target_link_uri: "http://localhost:3000/lti/consumer/launch",
      },
    };
    const result = await controller.authRequestHandler(mockReq);

    // Assertions
    expect(validateOauthStub.calledOnce).to.be.true;
    expect(validateOauthStub.firstCall.args[0]).to.deep.equal(mockReq);
    expect(buildLaunchJWTStub.calledOnce).to.be.true;
    expect(buildLaunchJWTStub.firstCall.args[0]).to.deep.equal({
      state: "test_state",
      loginState: {
        data: {
          url: "http://localhost:3000/lti/consumer/launch",
        },
      },
    });
    expect(buildLaunchJWTStub.firstCall.args[1]).to.deep.equal({
      route_prefix: "/lti/consumer",
    });
    expect(result).to.deep.equal({
      form: {
        id_token: "mock_launch_jwt",
        state: "test_state",
        lti_storage_target: "post_message_forwarding"
      },
      url: "http://localhost:3000/lti/consumer/launch",
    });
  });

  it("should return an array of JWKS keys for all providers", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {};
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([
        {
          key: "consumer1",
          public: "public-key-1",
        },
        {
          key: "consumer2",
          public: "public-key-2",
        },
      ]),
    };

    // Mock crypto module to return a dummy JWKS key for each consumer
    sinon.stub(crypto, "createPublicKey").callsFake((publicKey) => {
      return {
        export: sinon.stub().returns({
          key: `exported-${publicKey}`,
          kty: "RSA",
          kid: `kid-${publicKey}`,
        }),
      };
    });

    // Call the function under test
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);
    const result = await controller.generateProviderJWKS();

    // Assertions
    expect(provider_controller.getAllKeys.calledOnce).to.be.true;
    expect(crypto.createPublicKey.calledWith("public-key-1")).to.be.true;
    expect(crypto.createPublicKey.calledWith("public-key-2")).to.be.true;
    expect(result).to.deep.equal([
      {
        key: "exported-public-key-1",
        kty: "RSA",
        kid: "consumer1",
        alg: "RS256",
        use: "sig",
      },
      {
        key: "exported-public-key-2",
        kty: "RSA",
        kid: "consumer2",
        alg: "RS256",
        use: "sig",
      },
    ]);

    // Restore the stubbed method
    crypto.createPublicKey.restore();
  });

  it("should handle an LTI 1.3 token request and return the expected response", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {};
    const provider_controller = {};

    // Stub LTI 1.3 library functions to return known values
    const validateTokenRequestStub = sinon.stub(LTI13Utils.prototype, "validateTokenRequest").resolves({
      clientId: "test_client_id",
      scope: "test_scope",
    });
    
    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Call the function under test
    const mockReq = {
      body: {
        client_id: "test_client_id",
        client_assertion: "test_client_assertion",
        client_assertion_type: "test_client_assertion_type",
        scope: "test_scope",
      },
    };
    const result = await controller.tokenRequestHandler(mockReq);

    // Assertions
    expect(validateTokenRequestStub.calledOnce).to.be.true;
    expect(validateTokenRequestStub.firstCall.args[0]).to.deep.equal(mockReq);
    expect(result).to.deep.equal({
      clientId: "test_client_id",
      scope: "test_scope",
    });
  });

  it("should handle an incoming ags grade and post it to the provider", async () => {
    // Create mock dependencies
    const consumer = {
      postProviderGrade: sinon.stub().resolves({ success: true, message: "Grade posted successfully" }),
    };
    const models = {};
    const provider_controller = {};

    // Stub LTI 1.3 library functions to return known values
    const validateAGSGradePassbackStub = sinon.stub(LTI13Utils.prototype, "validateAGSGradePassback").resolves({
      userId: "user_key",
      scoreGiven: 0.95,
      scoreMaximum: 1.0,
    });

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Call the function under test
    const mockReq = {
      body: {
        grade_result: "test_grade_result",
      },
      lti13Token: {
        kid: "test_kid",
      },
      params: {
        context_key: "context_key",
        resource_key: "resource_key",
        gradebook_key: "gradebook_key",
      }
    };
    const result = await controller.agsGradePassbackHandler(mockReq);

    // Assertions
    expect(validateAGSGradePassbackStub.calledOnce).to.be.true;
    expect(validateAGSGradePassbackStub.firstCall.args[0]).to.deep.equal(mockReq);
    expect(consumer.postProviderGrade.calledOnce).to.be.true;
    expect(consumer.postProviderGrade.firstCall.args[0]).to.equal("test_kid");
    expect(consumer.postProviderGrade.firstCall.args[1]).to.equal("context_key");
    expect(consumer.postProviderGrade.firstCall.args[2]).to.equal("resource_key");
    expect(consumer.postProviderGrade.firstCall.args[3]).to.equal("user_key");
    expect(consumer.postProviderGrade.firstCall.args[4]).to.equal("gradebook_key");
    expect(consumer.postProviderGrade.firstCall.args[5]).to.equal(0.95);
    expect(consumer.postProviderGrade.firstCall.args[6]).to.deep.equal(mockReq);
    expect(result).to.deep.equal({ success: true, message: "Grade posted successfully" });
  });

  it("should handle an incoming ags grade and return an error response if grade posting fails", async () => {
    // Create mock dependencies
    const consumer = {
      postProviderGrade: sinon.stub().resolves({ success: false, message: "Grade posting failed" }),
    };
    const models = {};
    const provider_controller = {};

    // Stub LTI 1.3 library functions to return known values
    const validateAGSGradePassbackStub = sinon.stub(LTI13Utils.prototype, "validateAGSGradePassback").resolves({
      userId: "user_key",
      scoreGiven: 0.95,
      scoreMaximum: 1.0,
    });

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Call the function under test
    const mockReq = {
      body: {
        grade_result: "test_grade_result",
      },
      lti13Token: {
        kid: "test_kid",
      },
      params: {
        context_key: "context_key",
        resource_key: "resource_key",
        gradebook_key: "gradebook_key",
      }
    };
    const result = await controller.agsGradePassbackHandler(mockReq);

    // Assertions
    expect(validateAGSGradePassbackStub.calledOnce).to.be.true;
    expect(validateAGSGradePassbackStub.firstCall.args[0]).to.deep.equal(mockReq);
    expect(consumer.postProviderGrade.calledOnce).to.be.true;
    expect(result).to.deep.equal({ success: false, message: "Failed to Post Grade: Grade posting failed" });
  });

  it("should handle an incoming ags grade and return an error response if grade posting returns no response", async () => {
    // Create mock dependencies
    const consumer = {
      postProviderGrade: sinon.stub().resolves(null),
    };
    const models = {};
    const provider_controller = {};

    // Stub LTI 1.3 library functions to return known values
    const validateAGSGradePassbackStub = sinon.stub(LTI13Utils.prototype, "validateAGSGradePassback").resolves({
      userId: "user_key",
      scoreGiven: 0.95,
      scoreMaximum: 1.0,
    });

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Call the function under test
    const mockReq = {
      body: {
        grade_result: "test_grade_result",
      },
      lti13Token: {
        kid: "test_kid",
      },
      params: {
        context_key: "context_key",
        resource_key: "resource_key",
        gradebook_key: "gradebook_key",
      }
    };
    const result = await controller.agsGradePassbackHandler(mockReq);

    // Assertions
    expect(validateAGSGradePassbackStub.calledOnce).to.be.true;
    expect(validateAGSGradePassbackStub.firstCall.args[0]).to.deep.equal(mockReq);
    expect(consumer.postProviderGrade.calledOnce).to.be.true;
    expect(result).to.deep.equal({ success: false, message: "Failed to Post Grade: undefined" });
  });

  it("should return the correct open ID configuration", async () => {
    // Create mock dependencies
    const consumer = {
      route_prefix: "/lti/consumer",
      product_name: "Test Product",
      product_version: "1.0",
    };
    const models = {};
    const provider_controller = {};

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Call the function under test
    const result = await controller.getOpenIDConfiguration();

    // Assertions
    expect(result).to.deep.equal({
      issuer: "http://localhost:3000/",
      authorization_endpoint: "http://localhost:3000/lti/consumer/login",
      registration_endpoint: "http://localhost:3000/lti/consumer/register",
      jwks_uri: "http://localhost:3000/lti/consumer/jwks",
      token_endpoint: "http://localhost:3000/lti/consumer/token",
      token_endpoint_auth_methods_supported: ["private_key_jwt"],
      token_endpoint_auth_signing_alg_values_supported: ["RS256"],
      scopes_supported: [
        "openid",
        "https://purl.imsglobal.org/spec/lti-ags/scope/score"
      ],
      response_types_supported: ["id_token"],
      id_token_signing_alg_values_supported: ["RS256"],
      claims_supported: ["sub", "picture", "email", "name", "given_name", "family_name", "locale"],
      subject_types_supported: ["public"],
      authorization_server: domain_name,
      "https://purl.imsglobal.org/spec/lti-platform-configuration": {
        product_family_code: "Test Product",
        version: "1.0",
      },
      messages_supported: [
        {
          type: "LtiResourceLinkRequest",
          placements: ["ContentArea"]
        },
        {
          type: "LtiDeepLinkingRequest",
          placements: ["ContentArea", "RichTextEditor"]
        }
      ],
      notice_types_supported: [],
      variables: [],
    });
  });

  it("should handle incoming dynamic registration requests and return the expected response", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
        destroy: sinon.stub().resolves(),
      }
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
          client_id: "test_client_id",
          deployment_id: "test_deployment_id",
      })
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
        }
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    const result = await controller.dynamicRegistrationHandler(mockReq);

    // Assertions
    expect(models.ProviderRegistration.findOne.calledOnce).to.be.true;
    expect(models.ProviderRegistration.findOne.firstCall.args[0]).to.deep.equal({
      where: { token: "test_registration_token" },
    });
    expect(provider_controller.getByName.calledOnce).to.be.true;
    expect(provider_controller.getByName.firstCall.args[0]).to.equal("Test Client");
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    expect(provider_controller.createProvider.firstCall.args[0]).to.deep.equal({
      name: "Test Client",
      lti13: true,
      launch_url: "http://localhost:3000/test/launch",
      domain: "localhost",
      custom: null,
      use_section: false,
      keyset_url: "http://localhost:3000/test/jwks",
      auth_url: "http://localhost:3000/test/login",
      redirect_urls: null,
      scopes: null,
      claims: null,
    });
    expect(models.ProviderRegistration.destroy.calledOnce).to.be.true;
    expect(models.ProviderRegistration.destroy.firstCall.args[0]).to.deep.equal({
      where: { token: "test_registration_token" },
    });
    mockReq.body.client_id = "test_client_id"; // client_id is typically generated during registration, so we set it here for assertion
    mockReq.body.deployment_id = "test_deployment_id"; // deployment_id is typically generated during registration, so we set it here for assertion
    expect(result).to.deep.equal(mockReq.body)
  });

  it("should return an error response for dynamic registration requests with invalid tokens", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves(null),
      }
    };
    const provider_controller = {};

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
        }
      },
      headers: {
        authorization: "Bearer invalid_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try{
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      expect(error.message).to.equal("Invalid registration token");
    }
  });

  it("should return an error if the bearer header is missing", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves(null),
      }
    };
    const provider_controller = {};

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object without authorization header
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
        }
      },
      headers: {},
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try{
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      expect(error.message).to.equal("Missing or invalid Authorization header");
    }
  });

  it("should return an error if the body is missing jwks_uri", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
      }
    };
    const provider_controller = {};
    
    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object with missing fields
    const mockReq = {
      body: {
        client_name: "Test Client",
        // jwks_uri is missing
        initiate_login_uri: "http://localhost:3000/test/login",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
        }
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try{
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      // Assertions
      expect(models.ProviderRegistration.findOne.calledOnce).to.be.true;
      expect(models.ProviderRegistration.findOne.firstCall.args[0]).to.deep.equal({
        where: { token: "test_registration_token" },
      });
      expect(error.message).to.equal("Missing required field: jwks_uri");
    }
  });

  it("should return an error if the body is missing initiate_login_uri", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
      }
    };
    const provider_controller = {};
    
    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object with missing fields
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        // initiate_login_uri is missing
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
        }
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try{
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      // Assertions
      expect(models.ProviderRegistration.findOne.calledOnce).to.be.true;
      expect(models.ProviderRegistration.findOne.firstCall.args[0]).to.deep.equal({
        where: { token: "test_registration_token" },
      });
      expect(error.message).to.equal("Missing required field: initiate_login_uri");
    }
  });

  it("should return an error if the body is missing client_name", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
      }
    };
    const provider_controller = {};
    
    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object with missing fields
    const mockReq = {
      body: {
        // client_name is missing
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
        }
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try{
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      // Assertions
      expect(models.ProviderRegistration.findOne.calledOnce).to.be.true;
      expect(models.ProviderRegistration.findOne.firstCall.args[0]).to.deep.equal({
        where: { token: "test_registration_token" },
      });
      expect(error.message).to.equal("Missing required field: client_name");
    }
  });

  it("should return an error if the body is missing lti_tool_configuration", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
      }
    };
    const provider_controller = {};
    
    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object with missing fields
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
          // target_link_uri is missing
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try{
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      // Assertions
      expect(models.ProviderRegistration.findOne.calledOnce).to.be.true;
      expect(models.ProviderRegistration.findOne.firstCall.args[0]).to.deep.equal({
        where: { token: "test_registration_token" },
      });
      expect(error.message).to.equal("Missing required field: https://purl.imsglobal.org/spec/lti-tool-configuration.target_link_uri");
    }
  });

  it("should return an error if the body is missing target_link_uri", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
      }
    };
    const provider_controller = {};
    
    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object with missing fields
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          // target_link_uri is missing
        }
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try{
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      // Assertions
      expect(models.ProviderRegistration.findOne.calledOnce).to.be.true;
      expect(models.ProviderRegistration.findOne.firstCall.args[0]).to.deep.equal({
        where: { token: "test_registration_token" },
      });
      expect(error.message).to.equal("Missing required field: https://purl.imsglobal.org/spec/lti-tool-configuration.target_link_uri");
    }
  });

  it("should handle body that contains custom parameters and pass them to the provider controller", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
        destroy: sinon.stub().resolves(),
      }
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
          client_id: "test_client_id",
          deployment_id: "test_deployment_id",
      })
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object with custom parameters
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
          custom_parameters: {
            custom_key1: "custom_value1",
            custom_key2: "custom_value2",
          }
        },
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    await controller.dynamicRegistrationHandler(mockReq);

    // Assertions
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    expect(provider_controller.createProvider.firstCall.args[0]).to.deep.equal({
      name: "Test Client",
      lti13: true,
      launch_url: "http://localhost:3000/test/launch",
      domain: "localhost",
      custom: JSON.stringify({
        custom_key1: "custom_value1",
        custom_key2: "custom_value2",
      }),
      use_section: false,
      keyset_url: "http://localhost:3000/test/jwks",
      auth_url: "http://localhost:3000/test/login",
      redirect_urls: null,
      scopes: null,
      claims: null,
    });
  });

  it("should handle body that contains redirect_urls and pass them to the provider controller", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
        destroy: sinon.stub().resolves(),
      }
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
          client_id: "test_client_id",
          deployment_id: "test_deployment_id",
      })
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object with redirect_urls
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        redirect_urls: [
          "http://localhost:3000/test/redirect1",
          "http://localhost:3000/test/redirect2",
        ],
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
        },
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    await controller.dynamicRegistrationHandler(mockReq);

    // Assertions
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    expect(provider_controller.createProvider.firstCall.args[0]).to.deep.equal({
      name: "Test Client",
      lti13: true,
      launch_url: "http://localhost:3000/test/launch",
      domain: "localhost",
      custom: null,
      use_section: false,
      keyset_url: "http://localhost:3000/test/jwks",
      auth_url: "http://localhost:3000/test/login",
      redirect_urls: JSON.stringify([
        "http://localhost:3000/test/redirect1",
        "http://localhost:3000/test/redirect2",
      ]),
      scopes: null,
      claims: null,
    });
  });

  it('should handle bodies that contain scopes and claims and pass them to the provider controller', async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
        destroy: sinon.stub().resolves(),
      }
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
          client_id: "test_client_id",
          deployment_id: "test_deployment_id",
      })
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object with scopes and claims
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        scope: "scope1 scope2 scope3",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
          claims: ["claim1", "claim2", "claim3"],
        },
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    await controller.dynamicRegistrationHandler(mockReq);

    // Assertions
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    expect(provider_controller.createProvider.firstCall.args[0]).to.deep.equal({
      name: "Test Client",
      lti13: true,
      launch_url: "http://localhost:3000/test/launch",
      domain: "localhost",
      custom: null,
      use_section: false,
      keyset_url: "http://localhost:3000/test/jwks",
      auth_url: "http://localhost:3000/test/login",
      redirect_urls: null,
      scopes: JSON.stringify(["scope1", "scope2", "scope3"]),
      claims: JSON.stringify(["claim1", "claim2", "claim3"]),
    });
    
  });

  it("should rename the provider if one already exists during dynamic registration", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
        destroy: sinon.stub().resolves(),
      }
    };
    const provider_controller = {
      getByName: sinon.stub().resolves({ name: "Test Client" }), // Simulate existing provider with same name
      createProvider: sinon.stub().resolves({
          client_id: "test_client_id",
          deployment_id: "test_deployment_id",
      }),
      renameProvider: sinon.stub().resolves(), // Stub rename function
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
        }
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    await controller.dynamicRegistrationHandler(mockReq);

    // Assertions
    expect(provider_controller.getByName.calledOnce).to.be.true;
    expect(provider_controller.getByName.firstCall.args[0]).to.equal("Test Client");
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    expect(provider_controller.createProvider.firstCall.args[0]).to.have.property("name").that.matches(/^Test Client \(\w+\)$/); // New provider name should have a suffix
  });

  it('should return an error if creating a provider fails during dynamic registration', async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
        destroy: sinon.stub().resolves(),
      }
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves(null), // Simulate error during provider creation
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
        }
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try{
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      // Assertions
      expect(provider_controller.createProvider.calledOnce).to.be.true;
      expect(error.message).to.equal("Failed to create provider from dynamic registration");
    }
  });
});
