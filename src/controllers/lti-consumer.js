/**
 * @file LTI Consumer Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports LTIConsumerController an LTI Controller instance
 */

// Import Libraries
import { nanoid } from "nanoid";

// Import Utilities
import LTI10Utils from "../lib/lti10.js";

class LTIConsumerController {
  // Private fields
  #logger;
  #LTI10Utils;
  #consumer_config;
  #domain_name;
  #admin_email;

  /**
   * LTI Consumer Controller
   *
   * @param {Object} consumer_config - the consumer configuration object from the main config file
   * @param {Object} models - the LTI toolkit models
   * @param {Object} logger - the logger instance
   * @param {string} domain_name - the domain name of the application (e.g., "https://example.com")
   * @param {string} admin_email - the email address of the administrator
   */
  constructor(consumer_config, models, logger, domain_name, admin_email) {
    this.#logger = logger;
    this.#consumer_config = consumer_config;
    this.#domain_name = domain_name;
    this.#admin_email = admin_email;

    // Create LTI Utilities
    this.#LTI10Utils = new LTI10Utils(models, logger, domain_name);
  }

  /**
   * Generate LTI 1.0 Launch Form Data
   *
   * @param {string} key - the consumer key for the LTI tool
   * @param {string} secret - the consumer secret for the LTI tool
   * @param {string} url - the URL to launch the LTI tool
   * @param {string} ret_url - the return URL for the LTI tool
   * @param {Object} context - the context for the LTI launch (course)
   * @param {string} context.key - the context key (course ID)
   * @param {string} context.label - the context label (course code)
   * @param {string} context.name - the context name (course name)
   * @param {Object} resource - the resource for the LTI launch (assignment or lesson)
   * @param {string} resource.key - the resource key (assignment or lesson ID)
   * @param {string} resource.name - the resource name (assignment or lesson name)
   * @param {Object} user - the user launching the LTI tool
   * @param {string} user.key - the user key (user ID)
   * @param {string} user.email - the user's email address
   * @param {string} user.family_name - the user's family name
   * @param {string} user.given_name - the user's given name
   * @param {string} user.name - the user's full name
   * @param {string} user.image - the user's profile image URL
   * @param {boolean} manager - true if the user is a course manager, else false
   * @param {string} gradebook_key - the gradebook ID for the LTI launch
   * @param {Object} custom - custom parameters to include in the launch (optional)
   * @return {Object} an object containing the form fields and action URL for the LTI launch
   */
  generateLTI10LaunchFormData(
    key,
    secret,
    url,
    ret_url,
    context,
    resource,
    user,
    manager,
    gradebook_key,
    custom = null,
  ) {
    this.#logger.lti("Generating LTI 1.0 Launch Data");

    // Validate Inputs
    if (!key) {
      throw new Error("Consumer Key is required to generate LTI 1.0 Launch Data");
    }
    if (!secret) {
      throw new Error("Consumer Secret is required to generate LTI 1.0 Launch Data");
    }
    if (!url) {
      throw new Error("Launch URL is required to generate LTI 1.0 Launch Data");
    }
    if (!ret_url) {
      throw new Error("Return URL is required to generate LTI 1.0 Launch Data");
    }
    if (!context || !context.key || !context.label || !context.name) {
      throw new Error("Context with key, label, and name is required to generate LTI 1.0 Launch Data");
    }
    if (!resource || !resource.key || !resource.name) {
      throw new Error("Resource with key and name is required to generate LTI 1.0 Launch Data");
    }
    if (!user || !user.key || !user.email) {
      throw new Error("User with key and email is required to generate LTI 1.0 Launch Data");
    }
    if (manager === undefined || manager === null || typeof manager !== "boolean") {
      throw new Error("Manager status is required to generate LTI 1.0 Launch Data");
    }
    if (!gradebook_key) {
      throw new Error("Gradebook Key is required to generate LTI 1.0 Launch Data");
    }

    // Build the launch object with required and optional parameters
    const launch = {
      oauth_consumer_key: key,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: nanoid(),
      oauth_version: "1.0",
      context_id: context.key,
      context_label: context.label,
      context_title: context.name,
      launch_presentation_document_target: "iframe",
      launch_presentation_locale: "en",
      launch_presentation_return_url: ret_url,
      lis_outcome_service_url: new URL(`${this.#consumer_config.route_prefix}/grade`, this.#domain_name).href,
      lis_result_sourcedid: `${context.key}:${resource.key}:${user.key}:${gradebook_key}`,
      lis_person_contact_email_primary: user.email,
      lis_person_name_family: user.family_name,
      lis_person_name_full: user.name,
      lis_person_name_given: user.given_name,
      lti_message_type: "basic-lti-launch-request",
      lti_version: "LTI-1p0",
      oauth_callback: "about:blank",
      resource_link_id: resource.key,
      resource_link_title: resource.name,
      roles: manager ? "Instructor" : "Learner",
      tool_consumer_info_product_family_code: this.#consumer_config.product_name,
      tool_consumer_info_version: this.#consumer_config.product_version,
      tool_consumer_instance_contact_email: this.#admin_email,
      tool_consumer_instance_guid: this.#consumer_config.deployment_id,
      tool_consumer_instance_name: this.#consumer_config.deployment_name,
      user_id: user.key,
      user_image: user.image,
    };

    // Add custom parameters if provided
    if (custom) {
      for (const [key, value] of Object.entries(custom)) {
        if (!key.startsWith("custom_")) {
          launch[`custom_${key}`] = value;
        } else {
          launch[key] = value;
        }
      }
    }

    // Sign the launch data with OAuth 1.0
    const signature = this.#LTI10Utils.oauth_sign("HMAC-SHA1", "POST", url, launch, secret);
    launch["oauth_signature"] = signature;

    this.#logger.silly("Launch Data: " + JSON.stringify(launch, null, 2));

    // Return the launch data and action URL
    return {
      fields: launch,
      action: url,
    };
  }

  /**
   * Basic Outcomes Handler
   *
   * @param req - Express request object
   * @returns {Object} - XML response body
   * @see https://www.imsglobal.org/spec/lti-bo/v1p1
   * @see https://www.imsglobal.org/gws/gwsv1p0/imsgws_wsdlBindv1p0.html
   */
  async basicOutcomesHandler(req) {
    this.#logger.lti("Handling Basic Outcomes Request");

    let providerKey = null;
    let message_id = null;
    let body = null;
    try {
      // Validate the request and get the provider key
      providerKey = await this.#LTI10Utils.validateOauthBody(req);
      // Additional validation for Basic Outcomes Requests
      const values = this.#LTI10Utils.validateBasicOutcomesRequest(req);
      message_id = values.message_id;
      body = values.body;
    } catch (err) {
      this.#logger.lti("Basic Outcomes Request Validation Failed: " + err.message);
      // Return appropriate error response based on the type of validation error
      return this.#LTI10Utils.buildResponse(
        "failure",
        "invalidtargetdatafail",
        err.message,
        providerKey,
        req.originalUrl,
        null,
      );
    }

    // Check for Replace Result Request
    if (body["replaceresultrequest"]) {
      return await this.replaceResultRequest(
        body["replaceresultrequest"],
        providerKey,
        req.originalUrl,
        message_id,
        req,
      );

      // TODO handle readResult or deleteResult?
    } else {
      // Find the operation type from the body keys (e.g., "replaceResultRequest", "readResultRequest", "deleteResultRequest")
      let operation = Object.keys(body);
      const requestIndex = operation.findIndex((x) => x.endsWith("request"));
      let operationType = "unknown";
      if (requestIndex !== -1) {
        operationType = operation[requestIndex].slice(0, -7); // Remove "request" suffix
      }
      this.#logger.lti("Unsupported Operation: " + operationType);
      return this.#LTI10Utils.buildResponse(
        "unsupported",
        "status",
        `The operation ${operationType} is not supported by this LTI Tool Consumer`,
        providerKey,
        req.originalUrl,
        message_id,
        operation[requestIndex],
      );
    }
  }

  /**
   * Handle a Replace Result Request
   *
   * @param {Object} request - the request object from the body
   * @param {Object} providerKey - the key and secret for the provider
   * @param {string} url - the original request URL
   * @param {string} message_id - the message identifier from the header
   * @param {Object} req - Express request object
   * @returns {boolean} - true if the request is valid, else false
   */
  async replaceResultRequest(request, providerKey, url, message_id, req) {
    this.#logger.lti("Handling Replace Result Request");

    let score = null;
    let sourcedIdValue = null;
    try {
      // Validate the request
      const values = this.#LTI10Utils.validateReplaceResultRequest(request);
      score = values.score;
      sourcedIdValue = values.sourcedIdValue;
    } catch (err) {
      this.#logger.lti("Replace Result Request Validation Failed: " + err.message);
      // Return appropriate error response based on the type of validation error
      return this.#LTI10Utils.buildResponse(
        "failure",
        "invalidtargetdatafail",
        err.message,
        providerKey,
        req.originalUrl,
        message_id,
        "replaceResult",
      );
    }

    // Parse Source ID
    const sourceValues = sourcedIdValue.split(":");
    if (sourceValues.length != 4) {
      this.#logger.lti("Replace Result Request: Invalid Source ID " + sourcedIdValue + " - expected 4 parts");
      return this.#LTI10Utils.buildResponse(
        "failure",
        "invalididfail",
        "Invalid Source ID " + sourcedIdValue + " - expected 4 parts",
        providerKey,
        req.originalUrl,
        message_id,
        "replaceResult",
      );
    }

    // Extract values from Source ID
    const [contextKey, resourceKey, userKey, gradebookKey] = sourceValues;

    // Post Provider Grade to Handler Function
    const gradeResult = await this.#consumer_config.postProviderGrade(
      providerKey.key,
      contextKey,
      resourceKey,
      userKey,
      gradebookKey,
      score,
      req,
    );

    if (!gradeResult.success) {
      this.#logger.lti("Failed to Post Grade: " + gradeResult.message);
      return this.#LTI10Utils.buildResponse(
        "failure",
        "processingfail",
        "Failed to Post Grade: " + gradeResult.message,
        providerKey,
        req.originalUrl,
        message_id,
        "replaceResult",
      );
    } else {
      return this.#LTI10Utils.buildResponse(
        "success",
        "status",
        `Score for ${sourcedIdValue} is now ${score}`,
        providerKey,
        url,
        message_id,
        "replaceResult",
        {
          replaceResultResponse: {},
        },
      );
    }
  }
}

export default LTIConsumerController;
