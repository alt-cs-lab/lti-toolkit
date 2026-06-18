/**
 * @file /controllers/lti-provider.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should, expect } from "chai";
import sinon from "sinon";

// Load module under test
import LTIProviderController from "../../src/controllers/lti-provider.js";

// Utilities to stub
import LTI10Utils from "../../src/lib/lti10.js";
import LTI13Utils from "../../src/lib/lti13.js";

// Load logger
import configureLogger from "../../src/config/logger.js";

// Modify Object.prototype for BDD style assertions
should();

describe("/controllers/lti-provider.js", () => {
  const logger = configureLogger("error");
  const domain_name = "http://localhost:3000";

  it("should create an LTIProviderController instance with the correct properties", async () => {
    // Create mock dependencies
    const provider = {};
    const models = {};

    // Call the function under test
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Assertions
    expect(controller).to.be.an.instanceOf(LTIProviderController);
  });

  // Test the postGrade method
  const gradeObject = {
    consumer_key: "test_consumer_key",
    grade_url: "http://example.com/grade",
    lms_grade_id: "grade123",
    score: "0.85",
    user_lis13_id: "user123",
  };

  it("should have a postGrade method that posts a grade", async () => {
    // Create mock dependencies
    const provider = {};
    const models = {};

    // Stub the LTI10Utils and LTI13Utils postGrade methods
    sinon.stub(LTI10Utils.prototype, "postOutcome").resolves(true);

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test
    await controller.postGrade(
      gradeObject.consumer_key,
      gradeObject.grade_url,
      gradeObject.lms_grade_id,
      gradeObject.score,
      gradeObject.user_lis13_id,
    );

    // Assertions
    expect(LTI10Utils.prototype.postOutcome.calledOnce).to.be.true;
    expect(
      LTI10Utils.prototype.postOutcome.calledWith(
        gradeObject.lms_grade_id,
        gradeObject.score,
        gradeObject.consumer_key,
        gradeObject.grade_url,
      ),
    ).to.be.true;
  });

  it("should have a postGrade method that posts a grade with debug info", async () => {
    // Create mock dependencies
    const provider = {};
    const models = {};

    const gradeObjectWithDebug = {
      ...gradeObject,
      debug: {
        user: "Test User",
        user_id: "user123",
        assignment: "Test Assignment",
        assignment_id: "assignment123",
      },
    };

    // Stub the LTI10Utils and LTI13Utils postGrade methods
    sinon.stub(LTI10Utils.prototype, "postOutcome").resolves(true);

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test
    await controller.postGrade(
      gradeObject.consumer_key,
      gradeObject.grade_url,
      gradeObject.lms_grade_id,
      gradeObject.score,
      gradeObject.user_lis13_id,
      gradeObjectWithDebug.debug,
    );

    // Assertions
    expect(LTI10Utils.prototype.postOutcome.calledOnce).to.be.true;
    expect(
      LTI10Utils.prototype.postOutcome.calledWith(
        gradeObjectWithDebug.lms_grade_id,
        gradeObjectWithDebug.score,
        gradeObjectWithDebug.consumer_key,
        gradeObjectWithDebug.grade_url,
      ),
    ).to.be.true;
  });

  it("should throw an error if grade URL is missing when posting a grade", async () => {
    // Create mock dependencies
    const provider = {};
    const models = {};

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with missing information
    try {
      await controller.postGrade("test_consumer_key", null, null, "0.85", null);
      throw new Error("Expected postGrade to throw an error due to missing information");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a grade URL");
    }
  });

  it("should throw an error if score is missing or invalid when posting a grade", async () => {
    // Create mock dependencies
    const provider = {};
    const models = {};

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with missing information
    try {
      await controller.postGrade("test_consumer_key", "http://example.com/grade", null, null, null);
      throw new Error("Expected postGrade to throw an error due to missing score");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a valid score");
    }

    try {
      await controller.postGrade("test_consumer_key", "http://example.com/grade", null, -0.5, null);
      throw new Error("Expected postGrade to throw an error due to invalid score");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a valid score");
    }

    try {
      await controller.postGrade("test_consumer_key", "http://example.com/grade", null, 1.5, null);
      throw new Error("Expected postGrade to throw an error due to invalid score");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a valid score");
    }
  });

  it("should throw an error if neither LMS grade ID nor user LTI 1.3 ID is provided when posting a grade", async () => {
    // Create mock dependencies
    const provider = {};
    const models = {};

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with missing information
    try {
      await controller.postGrade("test_consumer_key", "http://example.com/grade", null, 0.85, null);
      throw new Error("Expected postGrade to throw an error due to missing LMS grade ID and user LTI 1.3 ID");
    } catch (err) {
      expect(err.message).to.equal(
        "Post Grade: Grade post must have either an LMS grade ID (for LTI 1.0) or a user LTI 1.3 ID (for LTI 1.3)",
      );
    }
  });

  it("should throw an error when posting a grade with missing consumer key", async () => {
    // Create mock dependencies
    const provider = {};
    const models = {};

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with missing information
    try {
      await controller.postGrade(null, "http://example.com/grade", "grade123", 0.85, null);
      throw new Error("Expected postGrade to throw an error due to missing consumer key");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Consumer Key is required to post grade");
    }
  });

  it("should throw an error when posting a grade with invalid score", async () => {
    // Create mock dependencies
    const provider = {};
    const models = {};

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with invalid score
    try {
      await controller.postGrade("test_consumer_key", "http://example.com/grade", "grade123", "invalid_score", null);
      throw new Error("Expected postGrade to throw an error due to invalid score");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a valid score");
    }
  });

  it("should work correctly when posting a grade with valid information for LTI 1.3", async () => {
    // Create mock dependencies
    const provider = {};
    const models = {};

    // Stub the LTI13Utils postGrade method
    sinon.stub(LTI13Utils.prototype, "postAGSGrade").resolves(true);

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with valid information (default progress values)
    await controller.postGrade("test_consumer_key", "http://example.com/grade", null, 0.85, "user123");

    // Assertions
    expect(LTI13Utils.prototype.postAGSGrade.calledOnce).to.be.true;
    expect(
      LTI13Utils.prototype.postAGSGrade.calledWith(
        "user123",
        0.85,
        "test_consumer_key",
        "http://example.com/grade",
        "Submitted",
        "FullyGraded",
      ),
    ).to.be.true;
  });

  it("should forward custom activityProgress and gradingProgress to postAGSGrade", async () => {
    const provider = {};
    const models = {};

    sinon.stub(LTI13Utils.prototype, "postAGSGrade").resolves(true);

    const controller = new LTIProviderController(provider, models, logger, domain_name);

    await controller.postGrade(
      "test_consumer_key",
      "http://example.com/grade",
      null,
      0.5,
      "user123",
      null,
      "InProgress",
      "Pending",
    );

    expect(
      LTI13Utils.prototype.postAGSGrade.calledWith(
        "user123",
        0.5,
        "test_consumer_key",
        "http://example.com/grade",
        "InProgress",
        "Pending",
      ),
    ).to.be.true;
  });

  const testConsumer = {
    client_id: "test_consumer_key",
    platform_id: "test_platform_id",
    deployment_id: "test_deployment_id",
    key: "test_key",
  };

  const testResponse = {
    iss: "test_consumer_key",
    aud: "test_platform_id",
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "test_deployment_id",
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": [
      {
        type: "ltiResourceLink",
        title: "Test Title",
        url: "http://localhost:3000/lti/provider/launch",
        window: {
          targetName: "_blank",
        },
        custom: {
          custom_id: "test_id",
        },
      },
    ],
  };

  it("should create a deep link URL with the correct parameters", async () => {
    // Create mock dependencies
    const provider = { route_prefix: "/lti/provider" };
    const models = {};
    const res = sinon.stub();

    // Stub the LTI13Utils createDeepLinkUrl method
    sinon.stub(LTI13Utils.prototype, "sendDeepLinkResponse").resolves();

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test
    await controller.createDeepLink(res, testConsumer, "http://example.com/return", "test_id", "Test Title");

    // Assertions
    expect(LTI13Utils.prototype.sendDeepLinkResponse.calledOnce).to.be.true;
    expect(
      LTI13Utils.prototype.sendDeepLinkResponse.calledWith(
        res,
        sinon.match.object,
        "http://example.com/return",
        "test_key",
      ),
    ).to.be.true;
    expect(LTI13Utils.prototype.sendDeepLinkResponse.firstCall.args[1]).to.deep.include(testResponse);
  });

  it("should throw an error if required information is missing when creating a deep link", async () => {
    // Create mock dependencies
    const provider = { route_prefix: "/lti/provider" };
    const models = {};
    const res = sinon.stub();

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with missing information
    try {
      await controller.createDeepLink(null, testConsumer, "http://example.com/return", "test_id", "Test Title");
      throw new Error("Expected createDeepLink to throw an error due to missing response object");
    } catch (err) {
      expect(err.message).to.equal("Create Deep Link: Response object is required");
    }

    try {
      await controller.createDeepLink(res, null, "http://example.com/return", "test_id", "Test Title");
      throw new Error("Expected createDeepLink to throw an error due to missing consumer");
    } catch (err) {
      expect(err.message).to.equal("Create Deep Link: Consumer is required");
    }

    try {
      await controller.createDeepLink(res, testConsumer, null, "test_id", "Test Title");
      throw new Error("Expected createDeepLink to throw an error due to missing return URL");
    } catch (err) {
      expect(err.message).to.equal("Create Deep Link: Return URL is required");
    }

    try {
      await controller.createDeepLink(res, testConsumer, "http://example.com/return", null, "Test Title");
      throw new Error("Expected createDeepLink to throw an error due to missing resource ID");
    } catch (err) {
      expect(err.message).to.equal("Create Deep Link: Resource ID is required");
    }

    try {
      await controller.createDeepLink(res, testConsumer, "http://example.com/return", "test_id", null);
      throw new Error("Expected createDeepLink to throw an error due to missing resource title");
    } catch (err) {
      expect(err.message).to.equal("Create Deep Link: Resource title is required");
    }
  });

  it("should fetch a single line item from the LMS via getLineItem", async () => {
    const provider = {};
    const models = {};
    const lineItemData = {
      id: "http://example.com/lineitems/1",
      scoreMaximum: 100,
      label: "Assignment 1",
      resourceLinkId: "resource1",
    };

    sinon.stub(LTI13Utils.prototype, "getAGSLineItem").resolves(lineItemData);

    const controller = new LTIProviderController(provider, models, logger, domain_name);

    const result = await controller.getLineItem("consumer_key", "http://example.com/lineitems/1");

    expect(LTI13Utils.prototype.getAGSLineItem.calledOnceWith("consumer_key", "http://example.com/lineitems/1")).to.be
      .true;
    expect(result).to.deep.equal(lineItemData);

    LTI13Utils.prototype.getAGSLineItem.restore();
  });

  it("should throw from getLineItem if consumer_key is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.getLineItem(null, "http://example.com/lineitems/1");
      throw new Error("Expected getLineItem to throw");
    } catch (err) {
      expect(err.message).to.equal("Get Line Item: Consumer Key is required");
    }
  });

  it("should throw from getLineItem if lineitem_url is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.getLineItem("consumer_key", null);
      throw new Error("Expected getLineItem to throw");
    } catch (err) {
      expect(err.message).to.equal("Get Line Item: Line item URL is required");
    }
  });

  it("should fetch all line items from the LMS via getLineItems without a filter", async () => {
    const provider = {};
    const models = {};
    const lineItemsData = [
      { id: "http://example.com/lineitems/1", scoreMaximum: 100, label: "Assignment 1", resourceLinkId: "resource1" },
    ];

    sinon.stub(LTI13Utils.prototype, "getAGSLineItems").resolves(lineItemsData);

    const controller = new LTIProviderController(provider, models, logger, domain_name);

    const result = await controller.getLineItems("consumer_key", "http://example.com/lineitems");

    expect(LTI13Utils.prototype.getAGSLineItems.calledOnceWith("consumer_key", "http://example.com/lineitems", null)).to
      .be.true;
    expect(result).to.deep.equal(lineItemsData);

    LTI13Utils.prototype.getAGSLineItems.restore();
  });

  it("should pass resource_link_id to getAGSLineItems when provided to getLineItems", async () => {
    const provider = {};
    const models = {};

    sinon.stub(LTI13Utils.prototype, "getAGSLineItems").resolves([]);

    const controller = new LTIProviderController(provider, models, logger, domain_name);

    await controller.getLineItems("consumer_key", "http://example.com/lineitems", "resource1");

    expect(
      LTI13Utils.prototype.getAGSLineItems.calledOnceWith("consumer_key", "http://example.com/lineitems", "resource1"),
    ).to.be.true;

    LTI13Utils.prototype.getAGSLineItems.restore();
  });

  it("should throw from getLineItems if consumer_key is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.getLineItems(null, "http://example.com/lineitems");
      throw new Error("Expected getLineItems to throw");
    } catch (err) {
      expect(err.message).to.equal("Get Line Items: Consumer Key is required");
    }
  });

  it("should throw from getLineItems if lineitems_url is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.getLineItems("consumer_key", null);
      throw new Error("Expected getLineItems to throw");
    } catch (err) {
      expect(err.message).to.equal("Get Line Items: Line items URL is required");
    }
  });

  it("should read a grade via readGrade", async () => {
    const provider = {};
    const models = {};

    sinon.stub(LTI10Utils.prototype, "readOutcome").resolves(0.85);

    const controller = new LTIProviderController(provider, models, logger, domain_name);

    const result = await controller.readGrade("consumer_key", "http://example.com/grade", "grade_id");

    expect(LTI10Utils.prototype.readOutcome.calledOnceWith("grade_id", "consumer_key", "http://example.com/grade")).to
      .be.true;
    expect(result).to.equal(0.85);

    LTI10Utils.prototype.readOutcome.restore();
  });

  it("should throw from readGrade if consumer_key is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.readGrade(null, "http://example.com/grade", "grade_id");
      throw new Error("Expected readGrade to throw");
    } catch (err) {
      expect(err.message).to.equal("Read Grade: Consumer Key is required");
    }
  });

  it("should throw from readGrade if grade_url is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.readGrade("consumer_key", null, "grade_id");
      throw new Error("Expected readGrade to throw");
    } catch (err) {
      expect(err.message).to.equal("Read Grade: Grade URL is required");
    }
  });

  it("should throw from readGrade if lms_grade_id is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.readGrade("consumer_key", "http://example.com/grade", null);
      throw new Error("Expected readGrade to throw");
    } catch (err) {
      expect(err.message).to.equal("Read Grade: LMS Grade ID is required");
    }
  });

  it("should delete a grade via deleteGrade", async () => {
    const provider = {};
    const models = {};

    sinon.stub(LTI10Utils.prototype, "deleteOutcome").resolves(true);

    const controller = new LTIProviderController(provider, models, logger, domain_name);

    const result = await controller.deleteGrade("consumer_key", "http://example.com/grade", "grade_id");

    expect(LTI10Utils.prototype.deleteOutcome.calledOnceWith("grade_id", "consumer_key", "http://example.com/grade")).to
      .be.true;
    expect(result).to.be.true;

    LTI10Utils.prototype.deleteOutcome.restore();
  });

  it("should throw from deleteGrade if consumer_key is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.deleteGrade(null, "http://example.com/grade", "grade_id");
      throw new Error("Expected deleteGrade to throw");
    } catch (err) {
      expect(err.message).to.equal("Delete Grade: Consumer Key is required");
    }
  });

  it("should throw from deleteGrade if grade_url is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.deleteGrade("consumer_key", null, "grade_id");
      throw new Error("Expected deleteGrade to throw");
    } catch (err) {
      expect(err.message).to.equal("Delete Grade: Grade URL is required");
    }
  });

  it("should throw from deleteGrade if lms_grade_id is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.deleteGrade("consumer_key", "http://example.com/grade", null);
      throw new Error("Expected deleteGrade to throw");
    } catch (err) {
      expect(err.message).to.equal("Delete Grade: LMS Grade ID is required");
    }
  });

  it("should fetch results via getResults without a user_id filter", async () => {
    const provider = {};
    const models = {};
    const resultsData = [
      {
        id: "http://example.com/results/user1",
        scoreOf: "http://example.com/lineitems/1",
        userId: "user1",
        resultScore: 85,
        resultMaximum: 100,
      },
    ];

    sinon.stub(LTI13Utils.prototype, "getAGSResults").resolves(resultsData);

    const controller = new LTIProviderController(provider, models, logger, domain_name);

    const result = await controller.getResults("consumer_key", "http://example.com/results");

    expect(LTI13Utils.prototype.getAGSResults.calledOnceWith("consumer_key", "http://example.com/results", null)).to.be
      .true;
    expect(result).to.deep.equal(resultsData);

    LTI13Utils.prototype.getAGSResults.restore();
  });

  it("should pass user_id to getAGSResults when provided to getResults", async () => {
    const provider = {};
    const models = {};

    sinon.stub(LTI13Utils.prototype, "getAGSResults").resolves([]);

    const controller = new LTIProviderController(provider, models, logger, domain_name);

    await controller.getResults("consumer_key", "http://example.com/results", "user1");

    expect(LTI13Utils.prototype.getAGSResults.calledOnceWith("consumer_key", "http://example.com/results", "user1")).to
      .be.true;

    LTI13Utils.prototype.getAGSResults.restore();
  });

  it("should throw from getResults if consumer_key is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.getResults(null, "http://example.com/results");
      throw new Error("Expected getResults to throw");
    } catch (err) {
      expect(err.message).to.equal("Get Results: Consumer Key is required");
    }
  });

  it("should throw from getResults if results_url is missing", async () => {
    const provider = {};
    const models = {};
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    try {
      await controller.getResults("consumer_key", null);
      throw new Error("Expected getResults to throw");
    } catch (err) {
      expect(err.message).to.equal("Get Results: Results URL is required");
    }
  });
});
