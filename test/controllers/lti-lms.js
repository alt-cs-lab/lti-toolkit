/**
 * @file /controllers/lti-lms.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { use, should, expect } from "chai";
import chaiShallowDeepEqual from "chai-shallow-deep-equal";
import sinon from "sinon";

// Load module under test
import LTILMSController from "../../src/controllers/lti-lms.js";

// Utilities to stub
import LTI10Utils from "../../src/lib/lti10.js";

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
});
