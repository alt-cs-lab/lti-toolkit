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
    const provider = { };
    const models = { };
    
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
  }

  it("should have a postGrade method that posts a grade", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };

    // Stub the LTI10Utils and LTI13Utils postGrade methods
    sinon.stub(LTI10Utils.prototype, "postOutcome").resolves(true);
    
    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test
    await controller.postGrade(gradeObject);

    // Assertions
    expect(LTI10Utils.prototype.postOutcome.calledOnce).to.be.true;
    expect(LTI10Utils.prototype.postOutcome.calledWith(gradeObject.lms_grade_id, gradeObject.score, gradeObject.consumer_key, gradeObject.grade_url)).to.be.true;

  });

  it("should have a postGrade method that posts a grade with debug info", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };

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
    await controller.postGrade(gradeObjectWithDebug);

    // Assertions
    expect(LTI10Utils.prototype.postOutcome.calledOnce).to.be.true;
    expect(LTI10Utils.prototype.postOutcome.calledWith(gradeObjectWithDebug.lms_grade_id, gradeObjectWithDebug.score, gradeObjectWithDebug.consumer_key, gradeObjectWithDebug.grade_url)).to.be.true;

  });

  it("should throw an error if grade URL is missing when posting a grade", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with missing information
    try {
      await controller.postGrade({
        consumer_key: "test_consumer_key",
        score: "0.85",
      });
      throw new Error("Expected postGrade to throw an error due to missing information");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a grade URL");
    }
  });

  it("should throw an error if score is missing or invalid when posting a grade", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with missing information
    try {
      await controller.postGrade({
        consumer_key: "test_consumer_key",
        grade_url: "http://example.com/grade",
      });
      throw new Error("Expected postGrade to throw an error due to missing score");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a valid score");
    }

    try {
      await controller.postGrade({
        consumer_key: "test_consumer_key",
        grade_url: "http://example.com/grade",
        score: -0.5,
      });
      throw new Error("Expected postGrade to throw an error due to invalid score");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a valid score");
    }

    try {
      await controller.postGrade({
        consumer_key: "test_consumer_key",
        grade_url: "http://example.com/grade",
        score: 1.5,
      });
      throw new Error("Expected postGrade to throw an error due to invalid score");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a valid score");
    }
  });

  it("should throw an error if neither LMS grade ID nor user LTI 1.3 ID is provided when posting a grade", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with missing information
    try {
      await controller.postGrade({
        consumer_key: "test_consumer_key",
        grade_url: "http://example.com/grade",
        score: "0.85",
      });
      throw new Error("Expected postGrade to throw an error due to missing LMS grade ID and user LTI 1.3 ID");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post must have either an LMS grade ID (for LTI 1.0) or a user LTI 1.3 ID (for LTI 1.3)");
    }

  });

  it("should throw an error when posting a grade with missing consumer key", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with missing information
    try {
      await controller.postGrade({
        grade_url: "http://example.com/grade",
        score: "0.85",
        lms_grade_id: "grade123",
      });
      throw new Error("Expected postGrade to throw an error due to missing consumer key");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Consumer Key is required to post grade");
    }

  });

  it("should throw an error when posting a grade with invalid score", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);

    // Call the function under test with invalid score
    try {
      await controller.postGrade({
        consumer_key: "test_consumer_key",
        grade_url: "http://example.com/grade",
        score: "invalid_score",
        lms_grade_id: "grade123",
      });
      throw new Error("Expected postGrade to throw an error due to invalid score");
    } catch (err) {
      expect(err.message).to.equal("Post Grade: Grade post does not have a valid score");
    }
  });

  it("should work correctly when posting a grade with valid information for LTI 1.3", async () => {
    // Create mock dependencies
    const provider = { };
    const models = { };

    // Stub the LTI13Utils postGrade method
    sinon.stub(LTI13Utils.prototype, "postAGSGrade").resolves(true);

    // Create controller instance
    const controller = new LTIProviderController(provider, models, logger, domain_name);
    
    // Call the function under test with valid information
    await controller.postGrade({
      consumer_key: "test_consumer_key",
      grade_url: "http://example.com/grade",
      score: 0.85,
      user_lis13_id: "user123",
    });

    // Assertions
    expect(LTI13Utils.prototype.postAGSGrade.calledOnce).to.be.true;
    expect(LTI13Utils.prototype.postAGSGrade.calledWith("user123", 0.85, "test_consumer_key", "http://example.com/grade")).to.be.true;

  });

  const testConsumer = {
    client_id: "test_consumer_key",
    platform_id: "test_platform_id",
    deployment_id: "test_deployment_id",
    key: "test_key",
  }

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
    ]
  }

  it("should create a deep link URL with the correct parameters", async () => {
     // Create mock dependencies
     const provider = { route_prefix: "/lti/provider" };
     const models = { };
     const res = sinon.stub();

     // Stub the LTI13Utils createDeepLinkUrl method
     sinon.stub(LTI13Utils.prototype, "sendDeepLinkResponse").resolves();

     // Create controller instance
     const controller = new LTIProviderController(provider, models, logger, domain_name);

     // Call the function under test
     await controller.createDeepLink(res, testConsumer, "http://example.com/return", "test_id", "Test Title");

      // Assertions
      expect(LTI13Utils.prototype.sendDeepLinkResponse.calledOnce).to.be.true;
      expect(LTI13Utils.prototype.sendDeepLinkResponse.calledWith(res, sinon.match.object, "http://example.com/return", "test_key")).to.be.true;
      expect(LTI13Utils.prototype.sendDeepLinkResponse.firstCall.args[1]).to.deep.include(testResponse);
  });

  it("should throw an error if required information is missing when creating a deep link", async () => {
     // Create mock dependencies
     const provider = { route_prefix: "/lti/provider" };
     const models = { };
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
});