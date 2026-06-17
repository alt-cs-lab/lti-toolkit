/**
 * @file LTI LMS Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports LTILMSController an LTI Controller instance
 */

// Import Libraries
import crypto from "crypto";

// Import Utilities
import LTI10Utils from "../lib/lti10.js";
import LTI13Utils from "../lib/lti13.js";
import {
  assertGradeResult,
  assertScoreResult,
  assertLineItem,
  assertLineItems,
  assertResults,
  assertRedirectUrl,
} from "../lib/callback-validation.js";

class LTILMSController {
  // Private fields
  #logger;
  #LTI10Utils;
  #LTI13Utils;
  #consumer_config;
  #domain_name;
  #ProviderController;
  #ProviderRegistrationModel;

  /**
   * LTI LMS Controller
   *
   * @param {Object} consumer_config - the consumer configuration object from the main config file
   * @param {Object} models - the LTI toolkit models
   * @param {Object} logger - the logger instance
   * @param {string} domain_name - the domain name of the application (e.g., "https://example.com")
   * @param {string} admin_email - the email address of the administrator
   * @param {Object} provider_controller - the provider controller instance
   */
  constructor(consumer_config, models, logger, domain_name, provider_controller) {
    this.#logger = logger;
    this.#consumer_config = consumer_config;
    this.#domain_name = domain_name;
    this.#ProviderController = provider_controller;
    this.#ProviderRegistrationModel = models.ProviderRegistration;

    // Create LTI Utilities
    this.#LTI10Utils = new LTI10Utils(models, logger, domain_name);
    this.#LTI13Utils = new LTI13Utils(models, logger, domain_name);
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
    let message_id;
    let body;
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
    } else if (body["readresultrequest"]) {
      return await this.readResultRequest(body["readresultrequest"], providerKey, req.originalUrl, message_id, req);
    } else if (body["deleteresultrequest"]) {
      return await this.deleteResultRequest(body["deleteresultrequest"], providerKey, req.originalUrl, message_id, req);
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

    let score;
    let sourcedIdValue;
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

    // Build AGS-style grade score object, mimicking LTI 1.3 structure for LTI 1.0 scores
    const gradeScore = {
      userId: userKey,
      scoreGiven: parseFloat(score),
      scoreMaximum: 1.0,
      activityProgress: "Submitted",
      gradingProgress: "FullyGraded",
      timestamp: new Date().toISOString(),
    };

    // Post Provider Grade to Handler Function
    const gradeResult = await this.#consumer_config.postProviderGrade(
      providerKey.key,
      contextKey,
      resourceKey,
      gradebookKey,
      gradeScore,
      req,
    );
    assertGradeResult(gradeResult, "postProviderGrade");

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
        gradeResult.message,
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

  /**
   * Handle a Read Result Request
   *
   * @param {Object} request - the request object from the body
   * @param {Object} providerKey - the key and secret for the provider
   * @param {string} url - the original request URL
   * @param {string} message_id - the message identifier from the header
   * @param {Object} req - Express request object
   * @returns {Object} an XML response object
   */
  async readResultRequest(request, providerKey, url, message_id, req) {
    this.#logger.lti("Handling Read Result Request");

    let sourcedIdValue;
    try {
      const values = this.#LTI10Utils.validateSourcedIdRequest(request);
      sourcedIdValue = values.sourcedIdValue;
    } catch (err) {
      this.#logger.lti("Read Result Request Validation Failed: " + err.message);
      return this.#LTI10Utils.buildResponse(
        "failure",
        "invalidtargetdatafail",
        err.message,
        providerKey,
        req.originalUrl,
        message_id,
        "readResult",
      );
    }

    const sourceValues = sourcedIdValue.split(":");
    if (sourceValues.length != 4) {
      this.#logger.lti("Read Result Request: Invalid Source ID " + sourcedIdValue + " - expected 4 parts");
      return this.#LTI10Utils.buildResponse(
        "failure",
        "invalididfail",
        "Invalid Source ID " + sourcedIdValue + " - expected 4 parts",
        providerKey,
        req.originalUrl,
        message_id,
        "readResult",
      );
    }

    const [contextKey, resourceKey, userKey, gradebookKey] = sourceValues;

    if (typeof this.#consumer_config.readProviderGrade !== "function") {
      this.#logger.lti("Read Result Request: No readProviderGrade function configured");
      return this.#LTI10Utils.buildResponse(
        "unsupported",
        "status",
        "The operation readResult is not supported by this LTI Tool Consumer",
        providerKey,
        url,
        message_id,
        "readResult",
      );
    }

    const gradeResult = await this.#consumer_config.readProviderGrade(
      providerKey.key,
      contextKey,
      resourceKey,
      userKey,
      gradebookKey,
      req,
    );
    assertScoreResult(gradeResult, "readProviderGrade");

    if (gradeResult === null || gradeResult === undefined) {
      return this.#LTI10Utils.buildResponse(
        "success",
        "status",
        "No result on file",
        providerKey,
        url,
        message_id,
        "readResult",
        { readResultResponse: {} },
      );
    }

    return this.#LTI10Utils.buildResponse(
      "success",
      "status",
      "Grade read successfully",
      providerKey,
      url,
      message_id,
      "readResult",
      {
        readResultResponse: {
          result: {
            resultScore: {
              language: "en",
              textString: gradeResult.score,
            },
          },
        },
      },
    );
  }

  /**
   * Handle a Delete Result Request
   *
   * @param {Object} request - the request object from the body
   * @param {Object} providerKey - the key and secret for the provider
   * @param {string} url - the original request URL
   * @param {string} message_id - the message identifier from the header
   * @param {Object} req - Express request object
   * @returns {Object} an XML response object
   */
  async deleteResultRequest(request, providerKey, url, message_id, req) {
    this.#logger.lti("Handling Delete Result Request");

    let sourcedIdValue;
    try {
      const values = this.#LTI10Utils.validateSourcedIdRequest(request);
      sourcedIdValue = values.sourcedIdValue;
    } catch (err) {
      this.#logger.lti("Delete Result Request Validation Failed: " + err.message);
      return this.#LTI10Utils.buildResponse(
        "failure",
        "invalidtargetdatafail",
        err.message,
        providerKey,
        req.originalUrl,
        message_id,
        "deleteResult",
      );
    }

    const sourceValues = sourcedIdValue.split(":");
    if (sourceValues.length != 4) {
      this.#logger.lti("Delete Result Request: Invalid Source ID " + sourcedIdValue + " - expected 4 parts");
      return this.#LTI10Utils.buildResponse(
        "failure",
        "invalididfail",
        "Invalid Source ID " + sourcedIdValue + " - expected 4 parts",
        providerKey,
        req.originalUrl,
        message_id,
        "deleteResult",
      );
    }

    const [contextKey, resourceKey, userKey, gradebookKey] = sourceValues;

    if (typeof this.#consumer_config.deleteProviderGrade !== "function") {
      this.#logger.lti("Delete Result Request: No deleteProviderGrade function configured");
      return this.#LTI10Utils.buildResponse(
        "unsupported",
        "status",
        "The operation deleteResult is not supported by this LTI Tool Consumer",
        providerKey,
        url,
        message_id,
        "deleteResult",
      );
    }

    const deleteResult = await this.#consumer_config.deleteProviderGrade(
      providerKey.key,
      contextKey,
      resourceKey,
      userKey,
      gradebookKey,
      req,
    );
    assertGradeResult(deleteResult, "deleteProviderGrade");

    if (!deleteResult.success) {
      this.#logger.lti("Failed to Delete Grade: " + deleteResult.message);
      return this.#LTI10Utils.buildResponse(
        "failure",
        "processingfail",
        "Failed to Delete Grade: " + deleteResult.message,
        providerKey,
        req.originalUrl,
        message_id,
        "deleteResult",
      );
    }

    return this.#LTI10Utils.buildResponse(
      "success",
      "status",
      deleteResult.message,
      providerKey,
      url,
      message_id,
      "deleteResult",
      { deleteResultResponse: {} },
    );
  }

  /**
   * Handle incoming LTI 1.3 Auth Request
   *
   * @param {Object} req - Express request object
   * @return {Object} an object containing the form fields and action URL for the LTI launch
   */
  async authRequestHandler(req) {
    const authRequest = await this.#LTI13Utils.validateAuthRequest(req);
    // Build the launch JWT — deep link requests use a different JWT shape
    const isDeepLink = authRequest.loginState.data.message_type === "LtiDeepLinkingRequest";
    const launchJWT = isDeepLink
      ? await this.#LTI13Utils.buildDeepLinkJWT(authRequest, this.#consumer_config)
      : await this.#LTI13Utils.buildLaunchJWT(authRequest, this.#consumer_config);
    // Return the launch data and action URL
    return {
      form: {
        id_token: launchJWT,
        state: authRequest.state,
        lti_storage_target: "post_message_forwarding",
      },
      url: authRequest.loginState.data.url,
    };
  }

  /**
   * Handle an incoming LTI 1.3 Deep Linking Response
   *
   * @param {Object} req - Express request object (must have req.params.token and req.body.JWT)
   * @param {Object} res - Express response object
   */
  async deepLinkResponseHandler(req, res) {
    if (typeof this.#consumer_config.handleDeeplink !== "function") {
      throw new Error("Deep Link Response: No handleDeeplink callback configured");
    }
    const { content_items, context } = await this.#LTI13Utils.verifyDeepLinkResponse(req);
    const result = await this.#consumer_config.handleDeeplink(content_items, context);
    assertRedirectUrl(result, "handleDeeplink");
    res.redirect(result);
  }

  /**
   * Generate the JWKS for tool providers
   *
   * @returns {Array} an array of JWKs for the tool providers
   */
  async generateProviderJWKS() {
    const keys = await this.#ProviderController.getAllKeys();
    const output = [];
    keys.forEach((k) => {
      if (k.public) {
        const publicKey = crypto.createPublicKey(k.public);
        const jwk = publicKey.export({ format: "jwk" });
        jwk.kid = k.key;
        jwk.alg = "RS256";
        jwk.use = "sig";
        output.push(jwk);
      }
    });
    return output;
  }

  /**
   * Handle LTI 1.3 Token Request
   *
   * @param {Object} req - Express request object
   * @return {Object} an object containing the access token and token type
   */
  async tokenRequestHandler(req) {
    const tokenResponse = await this.#LTI13Utils.validateTokenRequest(req);
    return tokenResponse;
  }

  /**
   * Handle LTI 1.3 AGS Grade Passback
   *
   * @param {Object} req - Express request object
   * @return {Object} an object containing the response status and message
   */
  async agsGradePassbackHandler(req) {
    const gradeResult = await this.#LTI13Utils.validateAGSGradePassback(req);
    this.#logger.lti("Grade Passback Result: " + JSON.stringify(gradeResult, null, 2));
    const gradeScore = {
      userId: gradeResult.userId,
      scoreGiven: parseFloat(gradeResult.scoreGiven),
      scoreMaximum: parseFloat(gradeResult.scoreMaximum),
      activityProgress: gradeResult.activityProgress,
      gradingProgress: gradeResult.gradingProgress,
      timestamp: gradeResult.timestamp,
    };
    // Post Provider Grade to Handler Function
    const passbackResult = await this.#consumer_config.postProviderGrade(
      req.lti13Token.kid,
      req.params.context_key,
      req.params.resource_key,
      req.params.gradebook_key,
      gradeScore,
      req,
    );
    assertGradeResult(passbackResult, "postProviderGrade");

    if (!passbackResult.success) {
      this.#logger.lti("Failed to Post Grade: " + passbackResult.message);
      return {
        success: false,
        message: "Failed to Post Grade: " + passbackResult.message,
      };
    } else {
      return {
        success: true,
        message: passbackResult.message,
      };
    }
  }

  /**
   * Handle LTI 1.3 AGS Get Line Item (single)
   *
   * @param {Object} req - Express request object
   * @return {Object} an AGS line item object
   */
  async agsGetLineItemHandler(req) {
    this.#LTI13Utils.validateAGSLineItemRequest(req);
    if (typeof this.#consumer_config.getProviderLineItem !== "function") {
      throw new Error("Get Line Item: No getProviderLineItem function configured");
    }
    const { context_key, resource_key, gradebook_key } = req.params;
    const lineItemData = await this.#consumer_config.getProviderLineItem(
      req.lti13Token.kid,
      context_key,
      resource_key,
      gradebook_key,
      req,
    );
    assertLineItem(lineItemData, "getProviderLineItem");
    if (!lineItemData) {
      return null;
    }
    return {
      id: new URL(`/lti/consumer/ags/${context_key}/${resource_key}/${gradebook_key}`, this.#domain_name).href,
      scoreMaximum: lineItemData.scoreMaximum,
      label: lineItemData.label,
      resourceLinkId: resource_key,
    };
  }

  /**
   * Handle LTI 1.3 AGS Get Line Items (collection)
   *
   * @param {Object} req - Express request object
   * @return {Array} an array of AGS line item objects
   */
  async agsGetLineItemsHandler(req) {
    this.#LTI13Utils.validateAGSLineItemRequest(req);
    if (typeof this.#consumer_config.getProviderLineItems !== "function") {
      throw new Error("Get Line Items: No getProviderLineItems function configured");
    }
    const { context_key } = req.params;
    const resource_link_id = req.query.resource_link_id || null;
    const lineItems = await this.#consumer_config.getProviderLineItems(
      req.lti13Token.kid,
      context_key,
      resource_link_id,
      req,
    );
    assertLineItems(lineItems, "getProviderLineItems");
    if (!lineItems) {
      return [];
    }
    return lineItems.map((item) => ({
      id: new URL(`/lti/consumer/ags/${context_key}/${item.resourceKey}/${item.gradebookKey}`, this.#domain_name).href,
      scoreMaximum: item.scoreMaximum,
      label: item.label,
      resourceLinkId: item.resourceKey,
    }));
  }

  /**
   * Handle LTI 1.3 AGS Get Results
   *
   * @param {Object} req - Express request object
   * @return {Array} an array of AGS result objects
   */
  async agsGetResultsHandler(req) {
    this.#LTI13Utils.validateAGSResultRequest(req);
    if (typeof this.#consumer_config.getProviderResults !== "function") {
      throw new Error("Get Results: No getProviderResults function configured");
    }
    const { context_key, resource_key, gradebook_key } = req.params;
    const user_id = req.query.user_id || null;
    const results = await this.#consumer_config.getProviderResults(
      req.lti13Token.kid,
      context_key,
      resource_key,
      gradebook_key,
      user_id,
      req,
    );
    assertResults(results, "getProviderResults");
    if (!results) {
      return [];
    }
    const lineItemUrl = new URL(`/lti/consumer/ags/${context_key}/${resource_key}/${gradebook_key}`, this.#domain_name)
      .href;
    return results.map((result) => ({
      id: new URL(
        `/lti/consumer/ags/${context_key}/${resource_key}/${gradebook_key}/results/${result.userId}`,
        this.#domain_name,
      ).href,
      scoreOf: lineItemUrl,
      userId: result.userId,
      resultScore: result.resultScore,
      resultMaximum: result.resultMaximum,
      comment: result.comment,
    }));
  }

  /**
   * Get LTI 1.3 OpenID Configuration
   *
   * @return {Object} the OpenID configuration object
   */
  getOpenIDConfiguration() {
    const config = {
      issuer: new URL("/", this.#domain_name).href,
      authorization_endpoint: new URL(this.#consumer_config.route_prefix + "/login", this.#domain_name).href,
      registration_endpoint: new URL(this.#consumer_config.route_prefix + "/register", this.#domain_name).href,
      jwks_uri: new URL(this.#consumer_config.route_prefix + "/jwks", this.#domain_name).href,
      token_endpoint: new URL(this.#consumer_config.route_prefix + "/token", this.#domain_name).href,
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
      authorization_server: this.#domain_name,
      "https://purl.imsglobal.org/spec/lti-platform-configuration": {
        product_family_code: this.#consumer_config.product_name,
        version: this.#consumer_config.product_version,
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
    };
    return config;
  }

  /**
   * Process LTI 1.3 Dynamic Registration Request
   *
   * @param {Object} req - Express request object
   * @return {Object} the expected registration response object
   */
  async dynamicRegistrationHandler(req) {
    // get access token from bearer header
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Missing or invalid Authorization header");
    }
    const token = authHeader.substring(7);

    // Validate the registration token and get the registration data
    const registrationData = await this.#ProviderRegistrationModel.findOne({
      where: {
        token: token,
      },
    });
    if (!registrationData) {
      throw new Error("Invalid registration token");
    }

    // Check for required fields in the request body
    if (!req.body.client_name) {
      throw new Error("Missing required field: client_name");
    }
    if (!req.body.jwks_uri) {
      throw new Error("Missing required field: jwks_uri");
    }
    if (!req.body.initiate_login_uri) {
      throw new Error("Missing required field: initiate_login_uri");
    }
    if (
      !req.body["https://purl.imsglobal.org/spec/lti-tool-configuration"] ||
      !req.body["https://purl.imsglobal.org/spec/lti-tool-configuration"].target_link_uri
    ) {
      throw new Error("Missing required field: https://purl.imsglobal.org/spec/lti-tool-configuration.target_link_uri");
    }

    // Build the provider configuration from the request body
    const body = req.body;
    const data = {
      name: body.client_name,
      lti13: true,
      launch_url: body["https://purl.imsglobal.org/spec/lti-tool-configuration"].target_link_uri,
      domain:
        body["https://purl.imsglobal.org/spec/lti-tool-configuration"].domain ||
        new URL(body["https://purl.imsglobal.org/spec/lti-tool-configuration"].target_link_uri).hostname,
      custom: body["https://purl.imsglobal.org/spec/lti-tool-configuration"].custom_parameters
        ? JSON.stringify(body["https://purl.imsglobal.org/spec/lti-tool-configuration"].custom_parameters)
        : null,
      use_section: false,
      keyset_url: body.jwks_uri,
      auth_url: body.initiate_login_uri,
      redirect_urls: body.redirect_uris ? JSON.stringify(body.redirect_uris) : null,
      scopes: body.scope ? JSON.stringify(body.scope.split(" ")) : null,
      claims: body["https://purl.imsglobal.org/spec/lti-tool-configuration"].claims
        ? JSON.stringify(body["https://purl.imsglobal.org/spec/lti-tool-configuration"].claims)
        : null,
    };

    // Check for duplicate name in database and append random string if duplicate exists
    const existingProvider = await this.#ProviderController.getByName(data.name);
    if (existingProvider) {
      data.name += " (" + Math.random().toString(36).substring(2, 8) + ")";
    }

    // Create the provider in the database
    const provider = await this.#ProviderController.createProvider(data);
    if (!provider) {
      throw new Error("Failed to create provider from dynamic registration");
    }

    // Delete the registration token to prevent reuse
    await this.#ProviderRegistrationModel.destroy({
      where: {
        token: token,
      },
    });

    // Build the response explicitly from stored provider fields and recognized request fields.
    // Unknown fields sent by the registering tool are intentionally omitted.
    const ltiToolConfig = body["https://purl.imsglobal.org/spec/lti-tool-configuration"];

    const response = {
      // Platform-assigned identifiers
      client_id: provider.client_id,
      deployment_id: provider.deployment_id,
      // Required OIDC fields — echo from request or use LTI 1.3 defaults
      application_type: body.application_type || "web",
      grant_types: body.grant_types || ["implicit", "client_credentials"],
      response_types: body.response_types || ["id_token"],
      token_endpoint_auth_method: body.token_endpoint_auth_method || "private_key_jwt",
      // Core tool identity from stored provider
      client_name: provider.name,
      initiate_login_uri: provider.auth_url,
      jwks_uri: provider.keyset_url,
    };

    if (body.redirect_uris) response.redirect_uris = body.redirect_uris;
    if (body.logo_uri) response.logo_uri = body.logo_uri;
    if (body.contacts) response.contacts = body.contacts;
    if (provider.scopes) response.scope = JSON.parse(provider.scopes).join(" ");

    // LTI tool configuration — reconstructed from stored data
    const responseToolConfig = {
      domain: provider.domain,
      target_link_uri: provider.launch_url,
      // deployment_id included per IMS LTI DR spec (also at top-level for Canvas compatibility)
      deployment_id: provider.deployment_id,
    };
    if (provider.custom) responseToolConfig.custom_parameters = JSON.parse(provider.custom);
    if (provider.claims) responseToolConfig.claims = JSON.parse(provider.claims);
    if (ltiToolConfig?.messages) responseToolConfig.messages = ltiToolConfig.messages;
    if (ltiToolConfig?.description) responseToolConfig.description = ltiToolConfig.description;
    response["https://purl.imsglobal.org/spec/lti-tool-configuration"] = responseToolConfig;

    return response;
  }
}

export default LTILMSController;
