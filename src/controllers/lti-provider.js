/**
 * @file LTI Provider Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports LTIProviderController an LTI Controller instance
 */

// Import Libraries
import { nanoid } from "nanoid";

// Import Utilities
import LTI10Utils from "../lib/lti10.js";
import LTI13Utils from "../lib/lti13.js";

class LTIProviderController {
  // Private fields
  #logger;
  #LTI10Utils;
  #LTI13Utils;
  #provider_config;
  #domain_name;

  /**
   * LTI Provider Controller
   *
   * @param {Object} provider_config - the provider configuration object from the main config file
   * @param {Object} models - the LTI toolkit models
   * @param {Object} logger - the logger instance
   * @param {string} domain_name - the domain name of the application (e.g., "https://example.com")
   */
  constructor(provider_config, models, logger, domain_name) {
    this.#logger = logger;
    this.#provider_config = provider_config;
    this.#domain_name = domain_name;

    // Create LTI Utilities
    this.#LTI10Utils = new LTI10Utils(models, logger, domain_name);
    this.#LTI13Utils = new LTI13Utils(models, logger, domain_name);
  }

  /**
   * Post a grade to a consumer
   *
   * @param {Integer} [consumer_key] - the consumer key
   * @param {String} [grade_url] - the grade post URL
   * @param {String} [lms_grade_id] - the LMS grade ID (for LTI 1.0 Basic Outcomes)
   * @param {String} [score] - the score to post (0.0 to 1.0)
   * @param {String} [user_lis13_id] - the user LTI 1.3 ID (for LTI 1.3)
   * @param {Object} [debug] - debugging information (optional)
   * @param {String} [debug.user] - the user (for debugging)
   * @param {String} [debug.user_id] - the user ID (for debugging)
   * @param {String} [debug.assignment] - the assignment (for debugging)
   * @param {String} [debug.assignment_id] - the assignment ID (for debugging)
   * @return {boolean} true if the grade was posted successfully, false otherwise
   * @throws {Error} if required information is missing or if posting fails
   */
  async postGrade(
    consumer_key,
    grade_url,
    lms_grade_id,
    score,
    user_lis13_id,
    debug,
    activityProgress = "Submitted",
    gradingProgress = "FullyGraded",
  ) {
    // build debug log if not provided
    debug = {
      user: debug?.user || "Unknown User",
      user_id: debug?.user_id || "Unknown User ID",
      assignment: debug?.assignment || "Unknown Assignment",
      assignment_id: debug?.assignment_id || "Unknown Assignment ID",
    };
    this.#logger.lti(
      "Posting grade for user " +
        debug.user +
        " (" +
        debug.user_id +
        ") to assignment " +
        debug.assignment +
        " (" +
        debug.assignment_id +
        ")",
    );

    // Validate input
    if (!consumer_key) {
      throw new Error("Post Grade: Consumer Key is required to post grade");
    }
    if (!grade_url) {
      throw new Error("Post Grade: Grade post does not have a grade URL");
    }
    if (score === undefined || score === null || isNaN(score) || score < 0 || score > 1) {
      throw new Error("Post Grade: Grade post does not have a valid score");
    }
    if (!lms_grade_id && !user_lis13_id) {
      throw new Error(
        "Post Grade: Grade post must have either an LMS grade ID (for LTI 1.0) or a user LTI 1.3 ID (for LTI 1.3)",
      );
    }

    // Switch between LTI 1.0 and LTI 1.3
    if (lms_grade_id) {
      // Has Grade ID, expecting Basic Outcomes
      return await this.#LTI10Utils.postOutcome(lms_grade_id, score, consumer_key, grade_url);
    } else {
      // No Grade ID, expecting LTI 1.3 Assignment and Grade Services (AGS)
      return await this.#LTI13Utils.postAGSGrade(
        user_lis13_id,
        score,
        consumer_key,
        grade_url,
        activityProgress,
        gradingProgress,
      );
    }
  }

  /**
   * Get a single line item from a connected LMS via LTI 1.3 AGS
   *
   * @param {string} consumer_key - the consumer key
   * @param {string} lineitem_url - the line item URL from the LTI launch (outcome_url)
   * @return {Object} the line item object from the LMS
   * @throws {Error} if required information is missing or if the request fails
   */
  async getLineItem(consumer_key, lineitem_url) {
    if (!consumer_key) {
      throw new Error("Get Line Item: Consumer Key is required");
    }
    if (!lineitem_url) {
      throw new Error("Get Line Item: Line item URL is required");
    }
    return await this.#LTI13Utils.getAGSLineItem(consumer_key, lineitem_url);
  }

  /**
   * Get all line items from a connected LMS via LTI 1.3 AGS
   *
   * @param {string} consumer_key - the consumer key
   * @param {string} lineitems_url - the lineitems collection URL from the LTI launch (outcome_lineitems)
   * @param {string|null} resource_link_id - optional resource link ID to filter results
   * @return {Array} the array of line item objects from the LMS
   * @throws {Error} if required information is missing or if the request fails
   */
  async getLineItems(consumer_key, lineitems_url, resource_link_id = null) {
    if (!consumer_key) {
      throw new Error("Get Line Items: Consumer Key is required");
    }
    if (!lineitems_url) {
      throw new Error("Get Line Items: Line items URL is required");
    }
    return await this.#LTI13Utils.getAGSLineItems(consumer_key, lineitems_url, resource_link_id);
  }

  /**
   * Read a grade from a connected LMS via LTI 1.0 Basic Outcomes
   *
   * @param {string} consumer_key - the consumer key
   * @param {string} grade_url - the grade passback URL from the LTI launch
   * @param {string} lms_grade_id - the LMS grade ID (sourcedId)
   * @return {number|null} the score (0.0 - 1.0), or null if no grade is on file
   * @throws {Error} if required information is missing or if the request fails
   */
  async readGrade(consumer_key, grade_url, lms_grade_id) {
    if (!consumer_key) {
      throw new Error("Read Grade: Consumer Key is required");
    }
    if (!grade_url) {
      throw new Error("Read Grade: Grade URL is required");
    }
    if (!lms_grade_id) {
      throw new Error("Read Grade: LMS Grade ID is required");
    }
    return await this.#LTI10Utils.readOutcome(lms_grade_id, consumer_key, grade_url);
  }

  /**
   * Delete a grade from a connected LMS via LTI 1.0 Basic Outcomes
   *
   * @param {string} consumer_key - the consumer key
   * @param {string} grade_url - the grade passback URL from the LTI launch
   * @param {string} lms_grade_id - the LMS grade ID (sourcedId)
   * @return {boolean} true if the grade was deleted successfully
   * @throws {Error} if required information is missing or if the request fails
   */
  async deleteGrade(consumer_key, grade_url, lms_grade_id) {
    if (!consumer_key) {
      throw new Error("Delete Grade: Consumer Key is required");
    }
    if (!grade_url) {
      throw new Error("Delete Grade: Grade URL is required");
    }
    if (!lms_grade_id) {
      throw new Error("Delete Grade: LMS Grade ID is required");
    }
    return await this.#LTI10Utils.deleteOutcome(lms_grade_id, consumer_key, grade_url);
  }

  /**
   * Get AGS results for a line item from a connected LMS via LTI 1.3 AGS
   *
   * @param {string} consumer_key - the consumer key
   * @param {string} results_url - the results URL for the line item
   * @param {string|null} user_id - optional user ID to filter results
   * @return {Array} array of result objects from the LMS
   * @throws {Error} if required information is missing or if the request fails
   */
  async getResults(consumer_key, results_url, user_id = null) {
    if (!consumer_key) {
      throw new Error("Get Results: Consumer Key is required");
    }
    if (!results_url) {
      throw new Error("Get Results: Results URL is required");
    }
    return await this.#LTI13Utils.getAGSResults(consumer_key, results_url, user_id);
  }

  /**
   * LTI 1.3 Deeplink Selection Handler
   *
   * @param {Object} res the Express response object
   * @param {Consumer} consumer the LTI Consumer
   * @param {string} return_url the URL to send the data to
   * @param {string} id the ID of the resource to be created
   * @param {string} title the title of the resource to be created
   */
  async createDeepLink(res, consumer, return_url, id, title) {
    // validate input
    if (!res) {
      throw new Error("Create Deep Link: Response object is required");
    }
    if (!consumer) {
      throw new Error("Create Deep Link: Consumer is required");
    }
    if (!return_url) {
      throw new Error("Create Deep Link: Return URL is required");
    }
    if (!id) {
      throw new Error("Create Deep Link: Resource ID is required");
    }
    if (!title) {
      throw new Error("Create Deep Link: Resource title is required");
    }

    const data = {
      iss: consumer.client_id,
      aud: consumer.platform_id,
      nonce: nanoid(),
      "https://purl.imsglobal.org/spec/lti/claim/deployment_id": consumer.deployment_id,
      "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": [
        {
          type: "ltiResourceLink",
          title: title,
          url: new URL(`${this.#provider_config.route_prefix}/launch`, this.#domain_name).href,
          window: {
            targetName: "_blank",
          },
          custom: {
            custom_id: id,
          },
        },
      ],
    };

    await this.#LTI13Utils.sendDeepLinkResponse(res, data, return_url, consumer.key);
  }
}

export default LTIProviderController;
