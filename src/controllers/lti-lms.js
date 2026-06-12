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

    if (!gradeResult || !gradeResult.success) {
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
   * Handle incoming LTI 1.3 Auth Request
   *
   * @param {Object} req - Express request object
   * @return {Object} an object containing the form fields and action URL for the LTI launch
   */
  async authRequestHandler(req) {
    const authRequest = await this.#LTI13Utils.validateAuthRequest(req);
    // Build the launch JWT
    const launchJWT = await this.#LTI13Utils.buildLaunchJWT(authRequest, this.#consumer_config);
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
    // Post Provider Grade to Handler Function
    const passbackResult = await this.#consumer_config.postProviderGrade(
      req.lti13Token.kid,
      req.params.context_key,
      req.params.resource_key,
      gradeResult.userId,
      req.params.gradebook_key,
      gradeResult.scoreGiven / gradeResult.scoreMaximum,
      req,
    );

    if (!passbackResult || !passbackResult.success) {
      this.#logger.lti("Failed to Post Grade: " + passbackResult?.message);
      return {
        success: false,
        message: "Failed to Post Grade: " + passbackResult?.message,
      };
    } else {
      return {
        success: true,
        message: passbackResult.message,
      };
    }
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
        // TODO Add more scopes here?
        "openid",
        "https://purl.imsglobal.org/spec/lti-ags/scope/score",
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
      redirect_urls: body.redirect_urls ? JSON.stringify(body.redirect_urls) : null,
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

    // TODO modify the response to include/remove the appropriate fields based on the registration request and the created provider

    // Return the expected response object
    body.client_id = provider.client_id;
    body.deployment_id = provider.deployment_id;
    return body;
  }
}

export default LTILMSController;
