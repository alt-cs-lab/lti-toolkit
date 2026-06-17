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
        unknownresultrequest: mockRequest,
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
      "The operation unknownresult is not supported by this LTI Tool Consumer",
    );
    expect(buildResponseStub.firstCall.args[3]).to.deep.equal(mockKeys);
    expect(buildResponseStub.firstCall.args[4]).to.equal("http://localhost:3000/lti/consumer/grade");
    expect(buildResponseStub.firstCall.args[5]).to.equal("test_message_id");
    expect(buildResponseStub.firstCall.args[6]).to.equal("unknownresultrequest");
    expect(result).to.deep.equal(mockResult);

    // Restore stubbed method
    validateOauthStub.restore();
    validateBasicOutcomesStub.restore();
    buildResponseStub.restore();
  });

  it("should route a readresultrequest to readResultRequest", async () => {
    const consumer = {};
    const models = {};
    const mockKeys = sinon.mock({ key: "test_consumer_key", secret: "test_consumer_secret" });
    const validateOauthStub = sinon.stub(LTI10Utils.prototype, "validateOauthBody").resolves(mockKeys);
    const mockRequest = sinon.mock({ sourcedid: "test_sourcedid" });
    const validateBasicOutcomesStub = sinon.stub(LTI10Utils.prototype, "validateBasicOutcomesRequest").returns({
      message_id: "test_message_id",
      body: { readresultrequest: mockRequest },
    });
    const mockResult = sinon.mock({ content: "<xml/>", headers: "OAuth header" });
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);
    controller.readResultRequest = sinon.stub().resolves(mockResult);

    const mockReq = { body: {}, originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.basicOutcomesHandler(mockReq);

    expect(controller.readResultRequest.calledOnce).to.be.true;
    expect(controller.readResultRequest.firstCall.args[0]).to.deep.equal(mockRequest);
    expect(controller.readResultRequest.firstCall.args[1]).to.deep.equal(mockKeys);
    expect(controller.readResultRequest.firstCall.args[4]).to.deep.equal(mockReq);
    expect(result).to.deep.equal(mockResult);

    validateOauthStub.restore();
    validateBasicOutcomesStub.restore();
  });

  it("should route a deleteresultrequest to deleteResultRequest", async () => {
    const consumer = {};
    const models = {};
    const mockKeys = sinon.mock({ key: "test_consumer_key", secret: "test_consumer_secret" });
    const validateOauthStub = sinon.stub(LTI10Utils.prototype, "validateOauthBody").resolves(mockKeys);
    const mockRequest = sinon.mock({ sourcedid: "test_sourcedid" });
    const validateBasicOutcomesStub = sinon.stub(LTI10Utils.prototype, "validateBasicOutcomesRequest").returns({
      message_id: "test_message_id",
      body: { deleteresultrequest: mockRequest },
    });
    const mockResult = sinon.mock({ content: "<xml/>", headers: "OAuth header" });
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);
    controller.deleteResultRequest = sinon.stub().resolves(mockResult);

    const mockReq = { body: {}, originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.basicOutcomesHandler(mockReq);

    expect(controller.deleteResultRequest.calledOnce).to.be.true;
    expect(controller.deleteResultRequest.firstCall.args[0]).to.deep.equal(mockRequest);
    expect(controller.deleteResultRequest.firstCall.args[1]).to.deep.equal(mockKeys);
    expect(controller.deleteResultRequest.firstCall.args[4]).to.deep.equal(mockReq);
    expect(result).to.deep.equal(mockResult);

    validateOauthStub.restore();
    validateBasicOutcomesStub.restore();
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
    expect(consumer.postProviderGrade.firstCall.args[3]).to.equal("gradebook_key");
    expect(consumer.postProviderGrade.firstCall.args[4]).to.deep.include({
      userId: "user_key",
      scoreGiven: 0.95,
      scoreMaximum: 1.0,
      activityProgress: "Submitted",
      gradingProgress: "FullyGraded",
    });
    expect(consumer.postProviderGrade.firstCall.args[4].timestamp).to.be.a("string");
    expect(consumer.postProviderGrade.firstCall.args[5]).to.deep.equal(mockReq);
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

  it("should throw when postProviderGrade returns the wrong shape during a replace result request", async () => {
    const consumer = {
      postProviderGrade: sinon.stub().resolves({ ok: true }),
    };
    const models = {};

    const mockGrade = {
      score: 0.95,
      sourcedIdValue: "context_key:resource_key:user_key:gradebook_key",
    };
    const validateReplaceResultStub = sinon
      .stub(LTI10Utils.prototype, "validateReplaceResultRequest")
      .returns(mockGrade);
    const provider_controller = {
      getAllKeys: sinon.stub().resolves([]),
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({}),
    };

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

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

    try {
      await controller.replaceResultRequest(
        mockRequest,
        mockKeys,
        "http://localhost:3000/lti/consumer/grade",
        "test_message_id",
        mockReq,
      );
      throw new Error("Expected replaceResultRequest to throw");
    } catch (err) {
      expect(err.message).to.equal("Invalid postProviderGrade return value: expected success to be a boolean");
    } finally {
      validateReplaceResultStub.restore();
    }
  });

  it("should return success with score when readResultRequest callback returns a score", async () => {
    const consumer = {
      readProviderGrade: sinon.stub().resolves({ score: 0.85 }),
    };
    const models = {};
    const mockKeys = { key: "test_key", secret: "test_secret" };
    const mockRequest = sinon.mock({ sourcedid: "test_sourcedid" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "ctx:res:user:gb" });
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.readResultRequest(
      mockRequest,
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(validateSourcedIdStub.calledOnceWith(mockRequest)).to.be.true;
    expect(consumer.readProviderGrade.calledOnce).to.be.true;
    expect(consumer.readProviderGrade.firstCall.args).to.deep.equal(["test_key", "ctx", "res", "user", "gb", mockReq]);
    expect(buildResponseStub.firstCall.args[0]).to.equal("success");
    expect(buildResponseStub.firstCall.args[6]).to.equal("readResult");
    expect(buildResponseStub.firstCall.args[7]).to.deep.equal({
      readResultResponse: { result: { resultScore: { language: "en", textString: 0.85 } } },
    });
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
    buildResponseStub.restore();
  });

  it("should return success with empty body when readResultRequest callback returns null", async () => {
    const consumer = {
      readProviderGrade: sinon.stub().resolves(null),
    };
    const models = {};
    const mockKeys = sinon.mock({ key: "test_key", secret: "test_secret" });
    const mockRequest = sinon.mock({ sourcedid: "test_sourcedid" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "ctx:res:user:gb" });
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.readResultRequest(
      mockRequest,
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(buildResponseStub.firstCall.args[0]).to.equal("success");
    expect(buildResponseStub.firstCall.args[2]).to.equal("No result on file");
    expect(buildResponseStub.firstCall.args[7]).to.deep.equal({ readResultResponse: {} });
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
    buildResponseStub.restore();
  });

  it("should throw when readProviderGrade returns the wrong shape", async () => {
    const consumer = {
      readProviderGrade: sinon.stub().resolves({ ok: true }),
    };
    const models = {};
    const mockKeys = { key: "test_key", secret: "test_secret" };
    const mockRequest = sinon.mock({ sourcedid: "test_sourcedid" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "ctx:res:user:gb" });
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };

    try {
      await controller.readResultRequest(
        mockRequest,
        mockKeys,
        "http://localhost:3000/lti/consumer/grade",
        "msg_id",
        mockReq,
      );
      throw new Error("Expected readResultRequest to throw");
    } catch (err) {
      expect(err.message).to.equal("Invalid readProviderGrade return value: expected score to be a number");
    } finally {
      validateSourcedIdStub.restore();
    }
  });

  it("should return failure when readResultRequest validation fails", async () => {
    const consumer = {};
    const models = {};
    const mockKeys = sinon.mock({ key: "test_key", secret: "test_secret" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .throws(new Error("Read/Delete Result: Missing Result Record"));
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.readResultRequest(
      {},
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("invalidtargetdatafail");
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
    buildResponseStub.restore();
  });

  it("should return failure when readResultRequest sourcedId is malformed", async () => {
    const consumer = {};
    const models = {};
    const mockKeys = sinon.mock({ key: "test_key", secret: "test_secret" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "only:two" });
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.readResultRequest(
      {},
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("invalididfail");
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
    buildResponseStub.restore();
  });

  it("should return unsupported when readResultRequest has no callback configured", async () => {
    const consumer = {};
    const models = {};
    const mockKeys = sinon.mock({ key: "test_key", secret: "test_secret" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "ctx:res:user:gb" });
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.readResultRequest(
      {},
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(buildResponseStub.firstCall.args[0]).to.equal("unsupported");
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
    buildResponseStub.restore();
  });

  it("should return success when deleteResultRequest callback succeeds", async () => {
    const consumer = {
      deleteProviderGrade: sinon.stub().resolves({ success: true, message: "Grade deleted successfully" }),
    };
    const models = {};
    const mockKeys = { key: "test_key", secret: "test_secret" };
    const mockRequest = sinon.mock({ sourcedid: "test_sourcedid" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "ctx:res:user:gb" });
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.deleteResultRequest(
      mockRequest,
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(validateSourcedIdStub.calledOnceWith(mockRequest)).to.be.true;
    expect(consumer.deleteProviderGrade.calledOnce).to.be.true;
    expect(consumer.deleteProviderGrade.firstCall.args).to.deep.equal([
      "test_key",
      "ctx",
      "res",
      "user",
      "gb",
      mockReq,
    ]);
    expect(buildResponseStub.firstCall.args[0]).to.equal("success");
    expect(buildResponseStub.firstCall.args[6]).to.equal("deleteResult");
    expect(buildResponseStub.firstCall.args[7]).to.deep.equal({ deleteResultResponse: {} });
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
    buildResponseStub.restore();
  });

  it("should throw when deleteProviderGrade returns the wrong shape", async () => {
    const consumer = {
      deleteProviderGrade: sinon.stub().resolves(undefined),
    };
    const models = {};
    const mockKeys = { key: "test_key", secret: "test_secret" };
    const mockRequest = sinon.mock({ sourcedid: "test_sourcedid" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "ctx:res:user:gb" });
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };

    try {
      await controller.deleteResultRequest(
        mockRequest,
        mockKeys,
        "http://localhost:3000/lti/consumer/grade",
        "msg_id",
        mockReq,
      );
      throw new Error("Expected deleteResultRequest to throw");
    } catch (err) {
      expect(err.message).to.equal(
        "Invalid deleteProviderGrade return value: expected { success: boolean, message: string }",
      );
    } finally {
      validateSourcedIdStub.restore();
    }
  });

  it("should return failure when deleteResultRequest validation fails", async () => {
    const consumer = {};
    const models = {};
    const mockKeys = sinon.mock({ key: "test_key", secret: "test_secret" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .throws(new Error("Read/Delete Result: Missing Result Record"));
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.deleteResultRequest(
      {},
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("invalidtargetdatafail");
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
    buildResponseStub.restore();
  });

  it("should return failure when deleteResultRequest sourcedId is malformed", async () => {
    const consumer = {};
    const models = {};
    const mockKeys = sinon.mock({ key: "test_key", secret: "test_secret" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "only:two" });
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.deleteResultRequest(
      {},
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("invalididfail");
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
    buildResponseStub.restore();
  });

  it("should return unsupported when deleteResultRequest has no callback configured", async () => {
    const consumer = {};
    const models = {};
    const mockKeys = sinon.mock({ key: "test_key", secret: "test_secret" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "ctx:res:user:gb" });
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.deleteResultRequest(
      {},
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(buildResponseStub.firstCall.args[0]).to.equal("unsupported");
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
    buildResponseStub.restore();
  });

  it("should return failure when deleteResultRequest callback fails", async () => {
    const consumer = {
      deleteProviderGrade: sinon.stub().resolves({ success: false, message: "Grade deletion failed" }),
    };
    const models = {};
    const mockKeys = sinon.mock({ key: "test_key", secret: "test_secret" });
    const validateSourcedIdStub = sinon
      .stub(LTI10Utils.prototype, "validateSourcedIdRequest")
      .returns({ sourcedIdValue: "ctx:res:user:gb" });
    const mockResult = sinon.mock({ content: "<xml/>", headers: null });
    const buildResponseStub = sinon.stub(LTI10Utils.prototype, "buildResponse").resolves(mockResult);
    const provider_controller = { getAllKeys: sinon.stub().resolves([]) };
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = { originalUrl: "http://localhost:3000/lti/consumer/grade" };
    const result = await controller.deleteResultRequest(
      {},
      mockKeys,
      "http://localhost:3000/lti/consumer/grade",
      "msg_id",
      mockReq,
    );

    expect(buildResponseStub.firstCall.args[0]).to.equal("failure");
    expect(buildResponseStub.firstCall.args[1]).to.equal("processingfail");
    expect(buildResponseStub.firstCall.args[2]).to.equal("Failed to Delete Grade: Grade deletion failed");
    expect(result).to.deep.equal(mockResult);

    validateSourcedIdStub.restore();
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
        lti_storage_target: "post_message_forwarding",
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
      activityProgress: "Submitted",
      gradingProgress: "FullyGraded",
      timestamp: "2024-06-01T12:00:00Z",
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
      },
    };
    const result = await controller.agsGradePassbackHandler(mockReq);

    // Assertions
    expect(validateAGSGradePassbackStub.calledOnce).to.be.true;
    expect(validateAGSGradePassbackStub.firstCall.args[0]).to.deep.equal(mockReq);
    expect(consumer.postProviderGrade.calledOnce).to.be.true;
    expect(consumer.postProviderGrade.firstCall.args[0]).to.equal("test_kid");
    expect(consumer.postProviderGrade.firstCall.args[1]).to.equal("context_key");
    expect(consumer.postProviderGrade.firstCall.args[2]).to.equal("resource_key");
    expect(consumer.postProviderGrade.firstCall.args[3]).to.equal("gradebook_key");
    expect(consumer.postProviderGrade.firstCall.args[4]).to.deep.equal({
      userId: "user_key",
      scoreGiven: 0.95,
      scoreMaximum: 1.0,
      activityProgress: "Submitted",
      gradingProgress: "FullyGraded",
      timestamp: "2024-06-01T12:00:00Z",
    });
    expect(consumer.postProviderGrade.firstCall.args[5]).to.deep.equal(mockReq);
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
      },
    };
    const result = await controller.agsGradePassbackHandler(mockReq);

    // Assertions
    expect(validateAGSGradePassbackStub.calledOnce).to.be.true;
    expect(validateAGSGradePassbackStub.firstCall.args[0]).to.deep.equal(mockReq);
    expect(consumer.postProviderGrade.calledOnce).to.be.true;
    expect(result).to.deep.equal({ success: false, message: "Failed to Post Grade: Grade posting failed" });
  });

  it("should throw an error if grade posting returns no response", async () => {
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
      },
    };

    try {
      await controller.agsGradePassbackHandler(mockReq);
      throw new Error("Expected agsGradePassbackHandler to throw");
    } catch (err) {
      expect(err.message).to.equal(
        "Invalid postProviderGrade return value: expected { success: boolean, message: string }",
      );
    }

    // Assertions
    expect(validateAGSGradePassbackStub.calledOnce).to.be.true;
    expect(validateAGSGradePassbackStub.firstCall.args[0]).to.deep.equal(mockReq);
    expect(consumer.postProviderGrade.calledOnce).to.be.true;
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
        "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
        "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
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
          placements: ["ContentArea"],
        },
        {
          type: "LtiDeepLinkingRequest",
          placements: ["ContentArea", "RichTextEditor"],
        },
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
      },
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
        client_id: "test_client_id",
        deployment_id: "test_deployment_id",
        name: "Test Client",
        auth_url: "http://localhost:3000/test/login",
        keyset_url: "http://localhost:3000/test/jwks",
        domain: "localhost",
        launch_url: "http://localhost:3000/test/launch",
        custom: null,
        claims: null,
        scopes: null,
        redirect_urls: null,
      }),
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
        },
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
    expect(result).to.deep.equal({
      client_id: "test_client_id",
      deployment_id: "test_deployment_id",
      application_type: "web",
      grant_types: ["implicit", "client_credentials"],
      response_types: ["id_token"],
      token_endpoint_auth_method: "private_key_jwt",
      client_name: "Test Client",
      initiate_login_uri: "http://localhost:3000/test/login",
      jwks_uri: "http://localhost:3000/test/jwks",
      "https://purl.imsglobal.org/spec/lti-tool-configuration": {
        domain: "localhost",
        target_link_uri: "http://localhost:3000/test/launch",
        deployment_id: "test_deployment_id",
      },
    });
  });

  it("should include optional fields in the dynamic registration response when present in the request", async () => {
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({ token: "test_registration_token" }),
        destroy: sinon.stub().resolves(),
      },
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
        client_id: "test_client_id",
        deployment_id: "test_deployment_id",
        name: "Test Client",
        auth_url: "http://localhost:3000/test/login",
        keyset_url: "http://localhost:3000/test/jwks",
        domain: "localhost",
        launch_url: "http://localhost:3000/test/launch",
        custom: JSON.stringify({ custom_key: "custom_value" }),
        claims: JSON.stringify(["sub", "email"]),
        scopes: JSON.stringify(["https://purl.imsglobal.org/spec/lti-ags/scope/score"]),
        redirect_urls: JSON.stringify(["http://localhost:3000/test/redirect"]),
      }),
    };

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      body: {
        application_type: "web",
        grant_types: ["implicit", "client_credentials"],
        response_types: ["id_token"],
        token_endpoint_auth_method: "private_key_jwt",
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        redirect_uris: ["http://localhost:3000/test/redirect"],
        logo_uri: "http://localhost:3000/test/logo.png",
        contacts: ["admin@example.com"],
        scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
          domain: "localhost",
          description: "A test tool",
          messages: [{ type: "LtiResourceLinkRequest" }],
          custom_parameters: { custom_key: "custom_value" },
          claims: ["sub", "email"],
        },
      },
      headers: { authorization: "Bearer test_registration_token" },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    const result = await controller.dynamicRegistrationHandler(mockReq);

    expect(result).to.deep.equal({
      client_id: "test_client_id",
      deployment_id: "test_deployment_id",
      application_type: "web",
      grant_types: ["implicit", "client_credentials"],
      response_types: ["id_token"],
      token_endpoint_auth_method: "private_key_jwt",
      client_name: "Test Client",
      initiate_login_uri: "http://localhost:3000/test/login",
      jwks_uri: "http://localhost:3000/test/jwks",
      redirect_uris: ["http://localhost:3000/test/redirect"],
      logo_uri: "http://localhost:3000/test/logo.png",
      contacts: ["admin@example.com"],
      scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
      "https://purl.imsglobal.org/spec/lti-tool-configuration": {
        domain: "localhost",
        target_link_uri: "http://localhost:3000/test/launch",
        deployment_id: "test_deployment_id",
        custom_parameters: { custom_key: "custom_value" },
        claims: ["sub", "email"],
        messages: [{ type: "LtiResourceLinkRequest" }],
        description: "A test tool",
      },
    });
  });

  it("should exclude unknown fields from the dynamic registration response", async () => {
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({ token: "test_registration_token" }),
        destroy: sinon.stub().resolves(),
      },
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
        client_id: "test_client_id",
        deployment_id: "test_deployment_id",
        name: "Test Client",
        auth_url: "http://localhost:3000/test/login",
        keyset_url: "http://localhost:3000/test/jwks",
        domain: "localhost",
        launch_url: "http://localhost:3000/test/launch",
        custom: null,
        claims: null,
        scopes: null,
        redirect_urls: null,
      }),
    };

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        unknown_field: "this should not appear in the response",
        vendor_extension: { nested: "data" },
        "https://purl.imsglobal.org/spec/lti-tool-configuration": {
          target_link_uri: "http://localhost:3000/test/launch",
          unknown_tool_field: "also should not appear",
        },
      },
      headers: { authorization: "Bearer test_registration_token" },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    const result = await controller.dynamicRegistrationHandler(mockReq);

    expect(result).to.not.have.property("unknown_field");
    expect(result).to.not.have.property("vendor_extension");
    expect(result["https://purl.imsglobal.org/spec/lti-tool-configuration"]).to.not.have.property("unknown_tool_field");
    expect(result).to.have.property("client_id", "test_client_id");
    expect(result).to.have.property("deployment_id", "test_deployment_id");
  });

  it("should return an error response for dynamic registration requests with invalid tokens", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves(null),
      },
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
        },
      },
      headers: {
        authorization: "Bearer invalid_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try {
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
      },
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
        },
      },
      headers: {},
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try {
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
      },
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
        },
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try {
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
      },
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
        },
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try {
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
      },
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
        },
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try {
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
      },
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
    try {
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      // Assertions
      expect(models.ProviderRegistration.findOne.calledOnce).to.be.true;
      expect(models.ProviderRegistration.findOne.firstCall.args[0]).to.deep.equal({
        where: { token: "test_registration_token" },
      });
      expect(error.message).to.equal(
        "Missing required field: https://purl.imsglobal.org/spec/lti-tool-configuration.target_link_uri",
      );
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
      },
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
        },
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try {
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      // Assertions
      expect(models.ProviderRegistration.findOne.calledOnce).to.be.true;
      expect(models.ProviderRegistration.findOne.firstCall.args[0]).to.deep.equal({
        where: { token: "test_registration_token" },
      });
      expect(error.message).to.equal(
        "Missing required field: https://purl.imsglobal.org/spec/lti-tool-configuration.target_link_uri",
      );
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
      },
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
        client_id: "test_client_id",
        deployment_id: "test_deployment_id",
      }),
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
          },
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

  it("should handle body that contains redirect_uris and pass them to the provider controller", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
        destroy: sinon.stub().resolves(),
      },
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
        client_id: "test_client_id",
        deployment_id: "test_deployment_id",
      }),
    };

    // Construct controller with stubbed dependencies
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    // Build mock request object with redirect_uris
    const mockReq = {
      body: {
        client_name: "Test Client",
        jwks_uri: "http://localhost:3000/test/jwks",
        initiate_login_uri: "http://localhost:3000/test/login",
        redirect_uris: ["http://localhost:3000/test/redirect1", "http://localhost:3000/test/redirect2"],
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
      redirect_urls: JSON.stringify(["http://localhost:3000/test/redirect1", "http://localhost:3000/test/redirect2"]),
      scopes: null,
      claims: null,
    });
  });

  it("should handle bodies that contain scopes and claims and pass them to the provider controller", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
        destroy: sinon.stub().resolves(),
      },
    };
    const provider_controller = {
      getByName: sinon.stub().resolves(null),
      createProvider: sinon.stub().resolves({
        client_id: "test_client_id",
        deployment_id: "test_deployment_id",
      }),
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
      },
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
    expect(provider_controller.getByName.calledOnce).to.be.true;
    expect(provider_controller.getByName.firstCall.args[0]).to.equal("Test Client");
    expect(provider_controller.createProvider.calledOnce).to.be.true;
    expect(provider_controller.createProvider.firstCall.args[0])
      .to.have.property("name")
      .that.matches(/^Test Client \(\w+\)$/); // New provider name should have a suffix
  });

  it("should return an error if creating a provider fails during dynamic registration", async () => {
    // Create mock dependencies
    const consumer = {};
    const models = {
      ProviderRegistration: {
        findOne: sinon.stub().resolves({
          token: "test_registration_token",
        }),
        destroy: sinon.stub().resolves(),
      },
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
        },
      },
      headers: {
        authorization: "Bearer test_registration_token",
      },
      originalUrl: "http://localhost:3000/lti/consumer/register",
    };

    // Call the function under test
    try {
      await controller.dynamicRegistrationHandler(mockReq);
    } catch (error) {
      // Assertions
      expect(provider_controller.createProvider.calledOnce).to.be.true;
      expect(error.message).to.equal("Failed to create provider from dynamic registration");
    }
  });

  it("should return a line item for a valid agsGetLineItemHandler request", async () => {
    const consumer = {
      getProviderLineItem: sinon.stub().resolves({ scoreMaximum: 100, label: "Assignment 1" }),
    };
    const models = {};
    const provider_controller = {};

    sinon.stub(LTI13Utils.prototype, "validateAGSLineItemRequest").returns();

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { kid: "test_consumer_key" },
      params: { context_key: "context_key", resource_key: "resource_key", gradebook_key: "gradebook_key" },
    };
    const result = await controller.agsGetLineItemHandler(mockReq);

    expect(LTI13Utils.prototype.validateAGSLineItemRequest.calledOnceWith(mockReq)).to.be.true;
    expect(
      consumer.getProviderLineItem.calledOnceWith(
        "test_consumer_key",
        "context_key",
        "resource_key",
        "gradebook_key",
        mockReq,
      ),
    ).to.be.true;
    expect(result).to.deep.equal({
      id: "http://localhost:3000/lti/consumer/ags/context_key/resource_key/gradebook_key",
      scoreMaximum: 100,
      label: "Assignment 1",
      resourceLinkId: "resource_key",
    });

    LTI13Utils.prototype.validateAGSLineItemRequest.restore();
  });

  it("should return null from agsGetLineItemHandler if the callback returns null", async () => {
    const consumer = {
      getProviderLineItem: sinon.stub().resolves(null),
    };
    const models = {};
    const provider_controller = {};

    sinon.stub(LTI13Utils.prototype, "validateAGSLineItemRequest").returns();

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { kid: "test_consumer_key" },
      params: { context_key: "context_key", resource_key: "resource_key", gradebook_key: "gradebook_key" },
    };
    const result = await controller.agsGetLineItemHandler(mockReq);

    expect(result).to.be.null;

    LTI13Utils.prototype.validateAGSLineItemRequest.restore();
  });

  it("should throw from agsGetLineItemHandler if the callback returns the wrong shape", async () => {
    const consumer = {
      getProviderLineItem: sinon.stub().resolves({ ok: true }),
    };
    const models = {};
    const provider_controller = {};

    sinon.stub(LTI13Utils.prototype, "validateAGSLineItemRequest").returns();

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { kid: "test_consumer_key" },
      params: { context_key: "context_key", resource_key: "resource_key", gradebook_key: "gradebook_key" },
    };

    try {
      await controller.agsGetLineItemHandler(mockReq);
      throw new Error("Expected agsGetLineItemHandler to throw");
    } catch (err) {
      expect(err.message).to.equal("Invalid getProviderLineItem return value: expected label to be a string");
    } finally {
      LTI13Utils.prototype.validateAGSLineItemRequest.restore();
    }
  });

  it("should throw from agsGetLineItemHandler if getProviderLineItem callback is not configured", async () => {
    const consumer = {};
    const models = {};
    const provider_controller = {};

    sinon.stub(LTI13Utils.prototype, "validateAGSLineItemRequest").returns();

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { kid: "test_consumer_key" },
      params: { context_key: "context_key", resource_key: "resource_key", gradebook_key: "gradebook_key" },
    };

    try {
      await controller.agsGetLineItemHandler(mockReq);
      throw new Error("Expected agsGetLineItemHandler to throw");
    } catch (err) {
      expect(err.message).to.equal("Get Line Item: No getProviderLineItem function configured");
    } finally {
      LTI13Utils.prototype.validateAGSLineItemRequest.restore();
    }
  });

  it("should throw from agsGetLineItemHandler if token scope validation fails", async () => {
    const consumer = {};
    const models = {};
    const provider_controller = {};

    sinon
      .stub(LTI13Utils.prototype, "validateAGSLineItemRequest")
      .throws(new Error("Line Item Request: Insufficient permissions for AGS line item read"));

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
      params: { context_key: "context_key", resource_key: "resource_key", gradebook_key: "gradebook_key" },
    };

    try {
      await controller.agsGetLineItemHandler(mockReq);
      throw new Error("Expected agsGetLineItemHandler to throw");
    } catch (err) {
      expect(err.message).to.equal("Line Item Request: Insufficient permissions for AGS line item read");
    } finally {
      LTI13Utils.prototype.validateAGSLineItemRequest.restore();
    }
  });

  it("should return an array of line items for a valid agsGetLineItemsHandler request", async () => {
    const consumer = {
      getProviderLineItems: sinon.stub().resolves([
        { resourceKey: "resource1", gradebookKey: "grade1", scoreMaximum: 100, label: "Assignment 1" },
        { resourceKey: "resource2", gradebookKey: "grade2", scoreMaximum: 50, label: "Assignment 2" },
      ]),
    };
    const models = {};
    const provider_controller = {};

    sinon.stub(LTI13Utils.prototype, "validateAGSLineItemRequest").returns();

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { kid: "test_consumer_key" },
      params: { context_key: "context_key" },
      query: {},
    };
    const result = await controller.agsGetLineItemsHandler(mockReq);

    expect(LTI13Utils.prototype.validateAGSLineItemRequest.calledOnceWith(mockReq)).to.be.true;
    expect(consumer.getProviderLineItems.calledOnceWith("test_consumer_key", "context_key", null, mockReq)).to.be.true;
    expect(result).to.deep.equal([
      {
        id: "http://localhost:3000/lti/consumer/ags/context_key/resource1/grade1",
        scoreMaximum: 100,
        label: "Assignment 1",
        resourceLinkId: "resource1",
      },
      {
        id: "http://localhost:3000/lti/consumer/ags/context_key/resource2/grade2",
        scoreMaximum: 50,
        label: "Assignment 2",
        resourceLinkId: "resource2",
      },
    ]);

    LTI13Utils.prototype.validateAGSLineItemRequest.restore();
  });

  it("should pass resource_link_id query param to the callback in agsGetLineItemsHandler", async () => {
    const consumer = {
      getProviderLineItems: sinon
        .stub()
        .resolves([{ resourceKey: "resource1", gradebookKey: "grade1", scoreMaximum: 100, label: "Assignment 1" }]),
    };
    const models = {};
    const provider_controller = {};

    sinon.stub(LTI13Utils.prototype, "validateAGSLineItemRequest").returns();

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { kid: "test_consumer_key" },
      params: { context_key: "context_key" },
      query: { resource_link_id: "resource1" },
    };
    await controller.agsGetLineItemsHandler(mockReq);

    expect(consumer.getProviderLineItems.calledOnceWith("test_consumer_key", "context_key", "resource1", mockReq)).to.be
      .true;

    LTI13Utils.prototype.validateAGSLineItemRequest.restore();
  });

  it("should return an empty array from agsGetLineItemsHandler if the callback returns null", async () => {
    const consumer = {
      getProviderLineItems: sinon.stub().resolves(null),
    };
    const models = {};
    const provider_controller = {};

    sinon.stub(LTI13Utils.prototype, "validateAGSLineItemRequest").returns();

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { kid: "test_consumer_key" },
      params: { context_key: "context_key" },
      query: {},
    };
    const result = await controller.agsGetLineItemsHandler(mockReq);

    expect(result).to.deep.equal([]);

    LTI13Utils.prototype.validateAGSLineItemRequest.restore();
  });

  it("should throw from agsGetLineItemsHandler if an item in the callback's result has the wrong shape", async () => {
    const consumer = {
      getProviderLineItems: sinon.stub().resolves([{ label: "Assignment 1", scoreMaximum: 100 }]),
    };
    const models = {};
    const provider_controller = {};

    sinon.stub(LTI13Utils.prototype, "validateAGSLineItemRequest").returns();

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { kid: "test_consumer_key" },
      params: { context_key: "context_key" },
      query: {},
    };

    try {
      await controller.agsGetLineItemsHandler(mockReq);
      throw new Error("Expected agsGetLineItemsHandler to throw");
    } catch (err) {
      expect(err.message).to.equal(
        "Invalid getProviderLineItems return value: expected items[0].resourceKey to be a string",
      );
    } finally {
      LTI13Utils.prototype.validateAGSLineItemRequest.restore();
    }
  });

  it("should throw from agsGetLineItemsHandler if getProviderLineItems callback is not configured", async () => {
    const consumer = {};
    const models = {};
    const provider_controller = {};

    sinon.stub(LTI13Utils.prototype, "validateAGSLineItemRequest").returns();

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { kid: "test_consumer_key" },
      params: { context_key: "context_key" },
      query: {},
    };

    try {
      await controller.agsGetLineItemsHandler(mockReq);
      throw new Error("Expected agsGetLineItemsHandler to throw");
    } catch (err) {
      expect(err.message).to.equal("Get Line Items: No getProviderLineItems function configured");
    } finally {
      LTI13Utils.prototype.validateAGSLineItemRequest.restore();
    }
  });

  it("should throw from agsGetLineItemsHandler if token scope validation fails", async () => {
    const consumer = {};
    const models = {};
    const provider_controller = {};

    sinon
      .stub(LTI13Utils.prototype, "validateAGSLineItemRequest")
      .throws(new Error("Line Item Request: Insufficient permissions for AGS line item read"));

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      lti13Token: { scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score" },
      params: { context_key: "context_key" },
      query: {},
    };

    try {
      await controller.agsGetLineItemsHandler(mockReq);
      throw new Error("Expected agsGetLineItemsHandler to throw");
    } catch (err) {
      expect(err.message).to.equal("Line Item Request: Insufficient permissions for AGS line item read");
    } finally {
      LTI13Utils.prototype.validateAGSLineItemRequest.restore();
    }
  });

  it("should return an array of results for a valid agsGetResultsHandler request", async () => {
    const consumer = {
      getProviderResults: sinon
        .stub()
        .resolves([{ userId: "user1", resultScore: 0.85, resultMaximum: 1.0, comment: "Good work" }]),
    };
    const models = {};
    const provider_controller = {};
    sinon.stub(LTI13Utils.prototype, "validateAGSResultRequest").returns();
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);
    const mockReq = {
      lti13Token: { kid: "test_consumer_key", scope: "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly" },
      params: { context_key: "ctx", resource_key: "res", gradebook_key: "gb" },
      query: {},
    };

    const result = await controller.agsGetResultsHandler(mockReq);

    expect(LTI13Utils.prototype.validateAGSResultRequest.calledOnceWith(mockReq)).to.be.true;
    expect(consumer.getProviderResults.calledOnceWith("test_consumer_key", "ctx", "res", "gb", null, mockReq)).to.be
      .true;
    expect(result).to.be.an("array").with.length(1);
    expect(result[0].userId).to.equal("user1");
    expect(result[0].resultScore).to.equal(0.85);
    expect(result[0].resultMaximum).to.equal(1.0);
    expect(result[0].comment).to.equal("Good work");
    expect(result[0].scoreOf).to.equal("http://localhost:3000/lti/consumer/ags/ctx/res/gb");
    expect(result[0].id).to.equal("http://localhost:3000/lti/consumer/ags/ctx/res/gb/results/user1");

    LTI13Utils.prototype.validateAGSResultRequest.restore();
  });

  it("should pass user_id query param to the callback in agsGetResultsHandler", async () => {
    const consumer = {
      getProviderResults: sinon.stub().resolves([]),
    };
    const models = {};
    const provider_controller = {};
    sinon.stub(LTI13Utils.prototype, "validateAGSResultRequest").returns();
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);
    const mockReq = {
      lti13Token: { kid: "test_consumer_key", scope: "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly" },
      params: { context_key: "ctx", resource_key: "res", gradebook_key: "gb" },
      query: { user_id: "user42" },
    };

    await controller.agsGetResultsHandler(mockReq);

    expect(consumer.getProviderResults.calledOnceWith("test_consumer_key", "ctx", "res", "gb", "user42", mockReq)).to.be
      .true;

    LTI13Utils.prototype.validateAGSResultRequest.restore();
  });

  it("should return an empty array from agsGetResultsHandler if the callback returns null", async () => {
    const consumer = { getProviderResults: sinon.stub().resolves(null) };
    const models = {};
    const provider_controller = {};
    sinon.stub(LTI13Utils.prototype, "validateAGSResultRequest").returns();
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);
    const mockReq = {
      lti13Token: { kid: "test_consumer_key", scope: "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly" },
      params: { context_key: "ctx", resource_key: "res", gradebook_key: "gb" },
      query: {},
    };

    const result = await controller.agsGetResultsHandler(mockReq);

    expect(result).to.deep.equal([]);

    LTI13Utils.prototype.validateAGSResultRequest.restore();
  });

  it("should throw from agsGetResultsHandler if an item in the callback's result has the wrong shape", async () => {
    const consumer = { getProviderResults: sinon.stub().resolves([{ userId: "user1", comment: "Good work" }]) };
    const models = {};
    const provider_controller = {};
    sinon.stub(LTI13Utils.prototype, "validateAGSResultRequest").returns();
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);
    const mockReq = {
      lti13Token: { kid: "test_consumer_key", scope: "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly" },
      params: { context_key: "ctx", resource_key: "res", gradebook_key: "gb" },
      query: {},
    };

    try {
      await controller.agsGetResultsHandler(mockReq);
      throw new Error("Expected agsGetResultsHandler to throw");
    } catch (err) {
      expect(err.message).to.equal(
        "Invalid getProviderResults return value: expected items[0].resultScore to be a number",
      );
    } finally {
      LTI13Utils.prototype.validateAGSResultRequest.restore();
    }
  });

  it("should throw from agsGetResultsHandler if getProviderResults callback is not configured", async () => {
    const consumer = {};
    const models = {};
    const provider_controller = {};
    sinon.stub(LTI13Utils.prototype, "validateAGSResultRequest").returns();
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);
    const mockReq = {
      lti13Token: { kid: "test_consumer_key", scope: "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly" },
      params: { context_key: "ctx", resource_key: "res", gradebook_key: "gb" },
      query: {},
    };

    try {
      await controller.agsGetResultsHandler(mockReq);
      throw new Error("Expected agsGetResultsHandler to throw");
    } catch (err) {
      expect(err.message).to.equal("Get Results: No getProviderResults function configured");
    } finally {
      LTI13Utils.prototype.validateAGSResultRequest.restore();
    }
  });

  it("should throw from agsGetResultsHandler if token scope validation fails", async () => {
    const consumer = {};
    const models = {};
    const provider_controller = {};
    sinon
      .stub(LTI13Utils.prototype, "validateAGSResultRequest")
      .throws(new Error("Result Request: Insufficient permissions for AGS result read"));
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);
    const mockReq = {
      lti13Token: { kid: "test_consumer_key", scope: "wrong_scope" },
      params: { context_key: "ctx", resource_key: "res", gradebook_key: "gb" },
      query: {},
    };

    try {
      await controller.agsGetResultsHandler(mockReq);
      throw new Error("Expected agsGetResultsHandler to throw");
    } catch (err) {
      expect(err.message).to.equal("Result Request: Insufficient permissions for AGS result read");
    } finally {
      LTI13Utils.prototype.validateAGSResultRequest.restore();
    }
  });

  it("should call buildDeepLinkJWT instead of buildLaunchJWT when the login state message_type is LtiDeepLinkingRequest", async () => {
    const consumer = { route_prefix: "/lti/consumer" };
    const models = {};
    const provider_controller = {};

    const validateOauthStub = sinon.stub(LTI13Utils.prototype, "validateAuthRequest").resolves({
      state: "test_state",
      loginState: {
        data: {
          message_type: "LtiDeepLinkingRequest",
          url: "http://localhost:3000/lti/provider/launch",
        },
      },
    });
    const buildDeepLinkJWTStub = sinon.stub(LTI13Utils.prototype, "buildDeepLinkJWT").resolves("mock_deep_link_jwt");
    const buildLaunchJWTStub = sinon.stub(LTI13Utils.prototype, "buildLaunchJWT").resolves("mock_launch_jwt");

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      body: {
        client_id: "test_client_id",
        login_hint: "test_login_hint",
        target_link_uri: "http://localhost:3000/lti/consumer/launch",
      },
    };
    const result = await controller.authRequestHandler(mockReq);

    expect(validateOauthStub.calledOnce).to.be.true;
    expect(buildDeepLinkJWTStub.calledOnce).to.be.true;
    expect(buildLaunchJWTStub.called).to.be.false;
    expect(result.form.id_token).to.equal("mock_deep_link_jwt");

    validateOauthStub.restore();
    buildDeepLinkJWTStub.restore();
    buildLaunchJWTStub.restore();
  });

  it("should handle an incoming LTI 1.3 deep link response and redirect to the handleDeeplink result", async () => {
    const consumer = {
      handleDeeplink: sinon.stub().resolves("http://example.com/deeplink-result"),
    };
    const models = {};
    const provider_controller = {};

    const verifyStub = sinon
      .stub(LTI13Utils.prototype, "verifyDeepLinkResponse")
      .resolves({ content_items: [{ type: "ltiResourceLink" }], context: { ret_url: "http://example.com/return" } });

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    const mockReq = {
      params: { token: "test_token" },
      body: { JWT: "test_jwt" },
    };
    const mockRes = { redirect: sinon.stub() };

    await controller.deepLinkResponseHandler(mockReq, mockRes);

    expect(verifyStub.calledOnce).to.be.true;
    expect(consumer.handleDeeplink.calledOnce).to.be.true;
    expect(consumer.handleDeeplink.firstCall.args[0]).to.deep.equal([{ type: "ltiResourceLink" }]);
    expect(consumer.handleDeeplink.firstCall.args[1]).to.deep.include({ ret_url: "http://example.com/return" });
    expect(mockRes.redirect.calledOnceWith("http://example.com/deeplink-result")).to.be.true;

    verifyStub.restore();
  });

  it("should throw if handleDeeplink is not configured when processing a deep link response", async () => {
    const consumer = {};
    const models = {};
    const provider_controller = {};
    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    try {
      await controller.deepLinkResponseHandler({}, {});
      throw new Error("Expected deepLinkResponseHandler to throw");
    } catch (err) {
      expect(err.message).to.equal("Deep Link Response: No handleDeeplink callback configured");
    }
  });

  it("should throw if handleDeeplink returns a non-string redirect URL", async () => {
    const consumer = { handleDeeplink: sinon.stub().resolves(null) };
    const models = {};
    const provider_controller = {};

    sinon
      .stub(LTI13Utils.prototype, "verifyDeepLinkResponse")
      .resolves({ content_items: [], context: {} });

    const controller = new LTILMSController(consumer, models, logger, domain_name, provider_controller);

    try {
      await controller.deepLinkResponseHandler({ params: { token: "t" }, body: { JWT: "j" } }, {});
      throw new Error("Expected deepLinkResponseHandler to throw");
    } catch (err) {
      expect(err.message).to.include("handleDeeplink");
    } finally {
      LTI13Utils.prototype.verifyDeepLinkResponse.restore();
    }
  });
});
