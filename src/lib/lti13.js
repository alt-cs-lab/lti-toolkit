/**
 * @file LTI 1.3 Utilities
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports validate13 Validate LTI 1.3 LOgin
 */

// Import Libraries
import jsonwebtoken from "jsonwebtoken";
import { nanoid } from "nanoid";
import ky from "ky";
import crypto from "crypto";
import nunjucks from "nunjucks";

// Import Utilities
import { getJwksClient } from "./jwks-cache.js";

class LTI13Utils {
  // Private Attributes
  #ConsumerLoginModel;
  #ConsumerKeyModel;
  #ConsumerModel;
  #ProviderLoginModel;
  #ProviderKeyModel;
  #ProviderModel;
  #ProviderRegistrationModel;
  #ProviderDeepLinkModel;
  #logger;
  #domain_name;

  /**
   * Constructor for LTI 1.3 Utilities
   *
   * @param {Object} models the database models
   * @param {Object} logger the logger instance
   */
  constructor(models, logger, domain_name) {
    this.#ConsumerModel = models.Consumer;
    this.#ConsumerKeyModel = models.ConsumerKey;
    this.#ConsumerLoginModel = models.ConsumerLogin;
    this.#ProviderLoginModel = models.ProviderLogin;
    this.#ProviderKeyModel = models.ProviderKey;
    this.#ProviderModel = models.Provider;
    this.#ProviderRegistrationModel = models.ProviderRegistration;
    this.#ProviderDeepLinkModel = models.ProviderDeepLink;
    this.#logger = logger;
    this.#domain_name = domain_name;
  }

  /**
   * Validate an LTI 1.3 Login Request
   *
   * @param {Object} req - Express request object
   * @return {Object} the validated token payload
   * @throws {Error} if the request is invalid or if an error occurs during validation
   */
  async authRequest(req) {
    // merge query and body into single object to handle GET and POST
    const params = { ...req.query, ...req.body };

    // #######################
    // OAUTH SPECIFIC THINGS
    // #######################
    // iss must be provided
    if (!params.iss) {
      throw new Error("Login: No LTI Issuer Provided");
    }
    // login_hint must be provided
    if (!params.login_hint) {
      throw new Error("Login: No LTI Login Hint Provided");
    }

    // #######################
    // LTI SPECIFIC THINGS
    // #######################
    // LTI Client ID required?
    if (!params.client_id) {
      throw new Error("Login: No LTI Client ID Provided");
    }
    // LTI Deployment ID required?
    if (!params.lti_deployment_id) {
      throw new Error("Login: No LTI Deployment ID Provided");
    }

    // find consumer using client_id and deployment_id
    const consumer = await this.#ConsumerModel.findOne({
      where: {
        client_id: params.client_id,
        deployment_id: params.lti_deployment_id,
      },
    });

    if (!consumer) {
      throw new Error(
        "Login: Consumer not found for client_id: " +
          params.client_id +
          " and deployment_id: " +
          params.lti_deployment_id,
      );
    }

    // LTI Target URI must match
    if (!params.target_link_uri || params.target_link_uri !== new URL("/lti/provider/launch", this.#domain_name).href) {
      throw new Error("Login: Invalid LTI Target Link URI: " + params.target_link_uri);
    }

    // Generate State and Nonce
    //TODO Automatically expire state and nonce
    const state = nanoid();
    const nonce = nanoid();
    const login = await this.#ConsumerLoginModel.create({
      key: consumer.key,
      state,
      nonce,
      iss: params.iss,
      client_id: consumer.client_id,
      keyset_url: consumer.keyset_url,
      deployment_id: consumer.deployment_id,
    });
    if (!login) {
      throw new Error("Login: Unable to save Login State");
    }
    // Note: state and nonce records expire automatically via clearExpired() in models.js

    // Build Return Request Object
    const authRequestForm = {
      scope: "openid",
      response_type: "id_token",
      client_id: consumer.client_id,
      redirect_uri: new URL("/lti/provider/launch", this.#domain_name).href,
      login_hint: params.login_hint,
      state: state,
      response_mode: "form_post",
      nonce: nonce,
      prompt: "none",
    };

    // Add LTI Message Hint if provided
    if (params.lti_message_hint) {
      authRequestForm.lti_message_hint = params.lti_message_hint;
    }

    // Return data for form
    return {
      form: authRequestForm,
      url: consumer.auth_url,
      name: consumer.name,
    };
  }

  /**
   * Validate an LTI 1.3 Launch Request
   *
   * @param {Object} req - Express request object
   */
  async launchRequest(req) {
    // Check State
    if (!req.body.state) {
      throw new Error("Launch: State Not Found in Launch Request");
    }
    // Check Token
    if (!req.body.id_token) {
      throw new Error("Launch: JWT Not Found in Launch Request");
    }

    // Load State
    const loginState = await this.#ConsumerLoginModel.findOne({
      where: { state: req.body.state },
    });
    if (!loginState) {
      throw new Error("Launch: Invalid State in Launch Request");
    }

    // Request Keys
    const keyUrl = loginState.keyset_url;
    const jwksClient = getJwksClient(keyUrl);

    // Decode JWT
    const decodedJwt = await jsonwebtoken.decode(req.body.id_token, {
      complete: true,
    });

    // Find Key
    const key = await jwksClient.getSigningKey(decodedJwt.header.kid);
    const signingKey = key.getPublicKey();

    try {
      await jsonwebtoken.verify(req.body.id_token, signingKey, {
        // Audience must match client ID
        audience: loginState.client_id,
        // Issuer must match initial request
        issuer: loginState.iss,
        // Nonce must match provided value
        nonce: loginState.nonce,
      });
    } catch (error) {
      throw new Error("Launch: Unable to Verify JWT: " + error.message, { cause: error });
    }

    // Extract Token
    const token = decodedJwt.payload;

    // Add Tool Consumer Key to Token
    token.key = loginState.key;
    const expectedDeploymentId = loginState.deployment_id;

    const baseUrl = "https://purl.imsglobal.org/spec/lti/claim/";

    // #######################
    // LTI SPECIFIC THINGS
    // #######################
    // Token must include message type

    if (
      !token[baseUrl + "message_type"] ||
      (token[baseUrl + "message_type"] !== "LtiResourceLinkRequest" &&
        token[baseUrl + "message_type"] !== "LtiDeepLinkingRequest")
    ) {
      throw new Error("Launch: Invalid LTI Message Type: " + token[baseUrl + "message_type"]);
    }
    // Token must include LTI version
    if (!token[baseUrl + "version"] || token[baseUrl + "version"] !== "1.3.0") {
      throw new Error("Launch: Invalid LTI Version: " + token[baseUrl + "version"]);
    }
    // Token's deployment_id claim must match the deployment used during the OIDC login
    if (!token[baseUrl + "deployment_id"] || token[baseUrl + "deployment_id"] !== expectedDeploymentId) {
      throw new Error("Launch: Invalid LTI Deployment ID: " + token[baseUrl + "deployment_id"]);
    }

    // Remove login state to prevent replays; nonce was already verified by jsonwebtoken.verify above
    await loginState.destroy();

    // Return validated payload to controller
    return token;
  }

  /**
   * Get an access token for the given LTI consumer
   *
   * @param {string} consumer_key the key of the consumer
   * @param {string} scopes the scopes to request
   * @return {string|null} a string containing the access token or null unable to get token
   */
  async getAccessToken(consumer_key, scopes) {
    this.#logger.lti("Requesting access token for Consumer " + consumer_key);
    const consumer = await this.#ConsumerModel.findOne({ where: { key: consumer_key } });
    if (!consumer) {
      throw new Error("Access Token: Consumer not found");
    }
    if (!consumer.lti13) {
      throw new Error("Access Token: Consumer does not support LTI 1.3");
    }
    if (!consumer.client_id) {
      throw new Error("Access Token: Consumer client ID not set");
    }
    if (!consumer.token_url) {
      throw new Error("Access Token: Consumer token URL not set");
    }
    if (!consumer.platform_id) {
      throw new Error("Access Token: Consumer platform ID not set");
    }
    const key = await this.#ConsumerKeyModel.findOne({
      where: { key: consumer.key },
    });
    if (!key) {
      throw new Error("Access Token: Consumer key not found");
    }
    const token = {
      sub: consumer.client_id,
      iss: consumer.client_id,
      aud: consumer.token_url,
      jti: nanoid(),
    };
    const privateKey = crypto.createPrivateKey(key.private);
    const jwt = await jsonwebtoken.sign(token, privateKey, {
      algorithm: "RS256",
      expiresIn: "1h",
      keyid: consumer.key,
    });
    const request = {
      grant_type: "client_credentials",
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: jwt,
      scope: scopes,
    };
    this.#logger.lti("Sending Access Token Request to " + consumer.token_url);
    this.#logger.silly(JSON.stringify(request, null, 2));
    let result;
    try {
      result = await ky
        .post(consumer.token_url, {
          json: request,
        })
        .json();
    } catch (error) {
      throw new Error("Error requesting access token: " + error.message, { cause: error });
    }
    if (!result || !result.access_token) {
      throw new Error("Access Token: Unable to get access token from " + consumer.token_url);
    }
    this.#logger.lti("Access token received successfully");
    this.#logger.silly(JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Get LMS Details for Dynamic Registration
   *
   * @param {Object} query the query parameters from the request
   * @return {Object} an object containing the LMS details or null if unable to get details
   * @throws {Error} if an error occurs during the request
   */
  async getLMSDetails(query) {
    if (!query.openid_configuration) {
      throw new Error("Dynamic Registration: No OpenID Configuration URL provided in registration request");
    }
    let response;
    try {
      response = await ky.get(query.openid_configuration).json();
    } catch (error) {
      this.#logger.lti("Error fetching OpenID Configuration: " + error.message);
      throw new Error("Dynamic Registration: Failed to fetch OpenID Configuration from LMS", { cause: error });
    }
    // validate registration endpoint is present and is based on issuer
    if (!response.registration_endpoint) {
      throw new Error("Dynamic Registration: No Registration Endpoint found in OpenID Configuration");
    }
    if (!response.issuer) {
      throw new Error("Dynamic Registration: No Issuer found in OpenID Configuration");
    }
    if (new URL(response.registration_endpoint).origin !== new URL(response.issuer).origin) {
      throw new Error("Dynamic Registration: Registration Endpoint does not match Issuer in OpenID Configuration");
    }
    // validate other URLs are present
    if (!response.authorization_endpoint) {
      throw new Error("Dynamic Registration: No Authorization Endpoint found in OpenID Configuration");
    }
    if (!response.token_endpoint) {
      throw new Error("Dynamic Registration: No Token Endpoint found in OpenID Configuration");
    }
    if (!response.jwks_uri) {
      throw new Error("Dynamic Registration: No JWKS URI found in OpenID Configuration");
    }
    // validate lti-platform-configuration is present and has required fields
    if (!response["https://purl.imsglobal.org/spec/lti-platform-configuration"]) {
      throw new Error("Dynamic Registration: No LTI Platform Configuration found in OpenID Configuration");
    }
    const platformConfig = response["https://purl.imsglobal.org/spec/lti-platform-configuration"];
    if (!platformConfig.product_family_code) {
      throw new Error("Dynamic Registration: No Product Family Code found in LTI Platform Configuration");
    }
    if (!platformConfig.version) {
      throw new Error("Dynamic Registration: No Version found in LTI Platform Configuration");
    }
    return response;
  }

  /**
   * Create Tool JWT Token to send to client
   *
   * @param {Object} consumer_key the tool consumer key
   * @param {Object} data the data to include in the token
   * @returns {string} the signed token
   * @throws {Error} if the consumer key is not found or if there is an error signing the token
   */
  async createToolToken(consumer_key, data) {
    const key = await this.#ConsumerKeyModel.findOne({
      where: { key: consumer_key },
      attributes: ["private"],
    });
    if (!key) {
      throw new Error("Tool Token: Consumer key not found");
    }
    const privateKey = crypto.createPrivateKey(key.private);
    const jwt = await jsonwebtoken.sign(data, privateKey, {
      algorithm: "RS256",
      expiresIn: "1h",
      keyid: consumer_key,
    });
    return jwt;
  }

  /**
   * Send Dynamic Registration Response
   *
   * @param {Object} config the registration data to send to the LMS
   * @param {string} endpoint the registration endpoint to send the data to
   * @param {Object} consumer the consumer object containing client_id and deployment_id to update after successful registration
   * @param {string|null} token an optional access token to include in the request for platforms that require it
   * @returns {Object} the response from the LMS
   * @throws {Error} if the registration fails
   */
  async sendRegistrationResponse(config, endpoint, consumer, token = null) {
    let headers = { "Content-Type": "application/json" };

    // Set registration token if provided in query for platforms that require it
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Logging
    this.#logger.lti("Sending LTI 1.3 Configuration to LMS");
    this.#logger.silly(JSON.stringify(config, null, 2));

    let response;

    try {
      response = await ky.post(endpoint, {
        json: config,
        headers: headers,
      });
    } catch (error) {
      this.#logger.lti("Error sending registration response: " + error.message);
      if (error.response) {
        this.#logger.lti("Response Status: " + error.response.status);
        this.#logger.silly(JSON.stringify(await error.response.json(), null, 2));
      }
      throw new Error("Dynamic Registration: Failed to register LTI 1.3 configuration with LMS: " + error.message, {
        cause: error,
      });
    }

    // Parse response
    let responseData;
    if (response && response.status === 200) {
      // Get response JSON
      responseData = await response.json();
    } else {
      this.#logger.lti("Failed to register LTI 1.3 configuration with LMS");
      this.#logger.silly(JSON.stringify(await response.json(), null, 2));
      throw new Error("Dynamic Registration: Failed to register LTI 1.3 configuration with LMS");
    }

    // Validate response data
    if (!responseData.client_id) {
      throw new Error("Dynamic Registration: No client_id returned in registration response");
    }
    if (
      !responseData.deployment_id &&
      !responseData["https://purl.imsglobal.org/spec/lti-tool-configuration"].deployment_id
    ) {
      throw new Error("Dynamic Registration: No deployment_id returned in registration response");
    }

    // Update consumer with client_id and deployment_id from response
    consumer.client_id = responseData.client_id;

    // Some platforms return deployment_id at the top level, others return it under the lti-tool-configuration claim, so check both places
    consumer.deployment_id =
      responseData.deployment_id ||
      responseData["https://purl.imsglobal.org/spec/lti-tool-configuration"].deployment_id;

    // Save updated consumer
    await consumer.save();

    this.#logger.lti("LTI 1.3 Configuration registered successfully with LMS");
    this.#logger.silly(JSON.stringify(responseData, null, 2));
    return config;
  }

  /**
   * Post grade to LTI 1.3 AGS
   *
   * @param {Object} grade the grade object containing the necessary information to post the grade
   * @returns {boolean} true if the grade was posted successfully, false otherwise
   * @throws {Error} if required information is missing or if posting fails
   */
  async postAGSGrade(
    user_lis13_id,
    score,
    consumer_key,
    grade_url,
    activityProgress = "Submitted",
    gradingProgress = "FullyGraded",
  ) {
    const validActivityProgress = ["Initialized", "Started", "InProgress", "Submitted", "Completed"];
    const validGradingProgress = ["FullyGraded", "Pending", "PendingManual", "Failed", "NotReady"];
    if (!validActivityProgress.includes(activityProgress)) {
      throw new Error("Post AGS Grade: Invalid activityProgress value: " + activityProgress);
    }
    if (!validGradingProgress.includes(gradingProgress)) {
      throw new Error("Post AGS Grade: Invalid gradingProgress value: " + gradingProgress);
    }

    const token = await this.getAccessToken(consumer_key, "https://purl.imsglobal.org/spec/lti-ags/scope/score");

    const lineitem = {
      timestamp: new Date(Date.now()).toISOString(),
      scoreGiven: parseFloat(score),
      scoreMaximum: 1.0,
      activityProgress,
      gradingProgress,
      userId: user_lis13_id,
    };

    this.#logger.lti("Posting grade to LTI 1.3 AGS at " + grade_url);
    this.#logger.silly(JSON.stringify(lineitem, null, 2));

    // Post grade to AGS endpoint
    const response = await ky.post(grade_url + "/scores", {
      json: lineitem,
      headers: {
        Authorization: `${token.token_type} ${token.access_token}`,
        "Content-Type": "application/vnd.ims.lis.v1.score+json",
      },
    });

    // Check response
    if (response && response.status === 200) {
      this.#logger.lti("Grade posted successfully");
      return true;
    } else {
      throw new Error("Failed to post grade: " + JSON.stringify(await response.json(), null, 2));
    }
  }

  /**
   * Send Deep Link Response
   *
   * @param {Object} res the Express response object
   * @param {Object} data the data to include in the response
   * @param {string} return_url the URL to send the response to
   * @param {string} consumer_key the key of the consumer to get an access token for
   * @returns {Object} the response from the LMS
   * @throws {Error} if the request fails
   */
  async sendDeepLinkResponse(res, data, return_url, consumer_key) {
    const token = await this.createToolToken(consumer_key, data);
    this.#logger.lti("Sending DeepLink Response to " + return_url);
    this.#logger.silly(token);

    res.header("Content-Type", "text/html");
    res.header("Content-Security-Policy", "form-action " + return_url);
    nunjucks.configure({ autoescape: true });
    const output = nunjucks.renderString(
      '<!doctype html>\
<head>\
<title>LTI Autoform</title>\
</head>\
<body onload="document.forms[0].submit()">\
<form method="POST" action="{{ return_url }}">\
  <input type="hidden" id="JWT" name="JWT" value="{{ token }}" />\
</form>\
</body>',
      {
        return_url,
        token,
      },
    );
    res.status(200).send(output);
  }

  /**
   * Validate Auth Request
   *
   * @param {Object} req the Express request object
   * @returns {Object} the validated auth request data
   * @throws {Error} if the request is invalid
   */
  async validateAuthRequest(req) {
    // merge query and body into single object to handle GET and POST
    const params = { ...req.query, ...req.body };

    // Validate required parameters
    if (!params.scope || params.scope !== "openid") {
      throw new Error("Auth Request: Invalid or missing scope parameter");
    }
    if (!params.response_type || params.response_type !== "id_token") {
      throw new Error("Auth Request: Invalid or missing response_type parameter");
    }
    if (!params.client_id) {
      throw new Error("Auth Request: Missing client_id parameter");
    }
    if (!params.redirect_uri) {
      throw new Error("Auth Request: Missing redirect_uri parameter");
    }
    if (!params.login_hint) {
      throw new Error("Auth Request: Missing login_hint parameter");
    }
    if (!params.state) {
      throw new Error("Auth Request: Missing state parameter");
    }
    if (!params.response_mode || params.response_mode !== "form_post") {
      throw new Error("Auth Request: Invalid or missing response_mode parameter");
    }
    if (!params.nonce) {
      throw new Error("Auth Request: Missing nonce parameter");
    }

    // Find login state in database
    const loginState = await this.#ProviderLoginModel.findOne({
      where: { client_id: params.client_id, login_hint: params.login_hint },
    });
    if (!loginState) {
      throw new Error("Auth Request: No matching login state found for client_id and login_hint");
    }

    const returnObj = {
      scope: params.scope,
      response_type: params.response_type,
      client_id: params.client_id,
      redirect_uri: params.redirect_uri,
      login_hint: params.login_hint,
      state: params.state,
      response_mode: params.response_mode,
      nonce: params.nonce,
      loginState: {
        data: JSON.parse(loginState.toJSON().data),
      },
    };

    // Remove login state to prevent replays
    await loginState.destroy();

    this.#logger.lti("Validated Auth Request");
    this.#logger.silly(JSON.stringify(returnObj, null, 2));

    // Return validated data
    return returnObj;
  }

  /**
   * Build an LTI 1.3 Launch JWT
   *
   * @param {Object} authRequest the validated auth request data
   * @returns {string} the signed JWT
   * @throws {Error} if there is an error signing the JWT
   */
  async buildLaunchJWT(authRequest, consumer_config) {
    const data = authRequest.loginState.data;
    const launchData = {
      "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
        id: `${data.resource.key}`,
        title: `${data.resource.name}`,
      },
      "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {
        lineitem: new URL(
          `/lti/consumer/ags/${data.context.key}/${data.resource.key}/${data.gradebook_key}`,
          this.#domain_name,
        ).href,
        lineitems: new URL(`/lti/consumer/ags/${data.context.key}/line_items`, this.#domain_name).href,
        scope: [
          "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
          "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
          "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        ],
      },
      "https://purl.imsglobal.org/spec/lti/claim/deployment_id": data.deployment_id,
      nonce: authRequest.nonce,
      "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": data.url,
      picture: data.user.image,
      email: data.user.email,
      name: data.user.name,
      given_name: data.user.first_name,
      family_name: data.user.last_name,
      "https://purl.imsglobal.org/spec/lti/claim/context": {
        id: data.context.key,
        label: data.context.label,
        title: data.context.name,
        type: ["http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"],
      },
      "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
        guid: consumer_config.deployment_id,
        name: consumer_config.deployment_name,
        version: consumer_config.platform_version,
        product_family_code: consumer_config.platform_name,
      },
      "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
        document_target: "iframe",
        return_url: data.ret_url,
        locale: "en",
      },
      locale: "en",
    };
    if (data.manager) {
      launchData["https://purl.imsglobal.org/spec/lti/claim/roles"] = [
        "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor",
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
        "http://purl.imsglobal.org/vocab/lis/v2/system/person#User",
      ];
    } else {
      launchData["https://purl.imsglobal.org/spec/lti/claim/roles"] = [
        "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student",
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
        "http://purl.imsglobal.org/vocab/lis/v2/system/person#User",
      ];
    }
    if (data.custom) {
      launchData["https://purl.imsglobal.org/spec/lti/claim/custom"] = data.custom;
    }
    // aud = client_id, iss = client_id, sub = user id from login hint
    // Get private key for signing
    const key = await this.#ProviderKeyModel.findOne({
      where: { key: data.key },
      attributes: ["private"],
    });
    if (!key) {
      throw new Error("Launch JWT: Provider key not found");
    }
    this.#logger.lti("Building LTI 1.3 Launch JWT");
    this.#logger.silly(JSON.stringify(launchData, null, 2));
    const privateKey = crypto.createPrivateKey(key.private);
    const jwt = await jsonwebtoken.sign(launchData, privateKey, {
      algorithm: "RS256",
      expiresIn: "1h",
      keyid: data.key,
      issuer: new URL("/", this.#domain_name).href,
      audience: authRequest.client_id,
      subject: data.user.key,
    });
    return jwt;
  }

  /**
   * Build an LTI 1.3 Deep Linking Request JWT
   *
   * @param {Object} authRequest the validated auth request data
   * @param {Object} consumer_config the consumer configuration
   * @returns {string} the signed JWT
   * @throws {Error} if there is an error signing the JWT
   */
  async buildDeepLinkJWT(authRequest, consumer_config) {
    const data = authRequest.loginState.data;
    const settings = data.settings || {};
    const launchData = {
      "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingRequest",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings": {
        deep_link_return_url: new URL(`/lti/consumer/deeplink/${data.deep_link_token}`, this.#domain_name).href,
        accept_types: settings.accept_types ?? ["ltiResourceLink"],
        accept_presentation_document_targets: settings.accept_presentation_document_targets ?? ["iframe", "window"],
        accept_multiple: settings.accept_multiple ?? false,
      },
      "https://purl.imsglobal.org/spec/lti/claim/deployment_id": data.deployment_id,
      nonce: authRequest.nonce,
      "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": data.url,
      picture: data.user.image,
      email: data.user.email,
      name: data.user.name,
      given_name: data.user.first_name,
      family_name: data.user.last_name,
      "https://purl.imsglobal.org/spec/lti/claim/context": {
        id: data.context.key,
        label: data.context.label,
        title: data.context.name,
        type: ["http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"],
      },
      "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
        guid: consumer_config.deployment_id,
        name: consumer_config.deployment_name,
        version: consumer_config.platform_version,
        product_family_code: consumer_config.platform_name,
      },
      "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
        document_target: "iframe",
        return_url: data.ret_url,
        locale: "en",
      },
      locale: "en",
    };
    if (data.custom) {
      launchData["https://purl.imsglobal.org/spec/lti/claim/custom"] = data.custom;
    }
    const key = await this.#ProviderKeyModel.findOne({
      where: { key: data.key },
      attributes: ["private"],
    });
    if (!key) {
      throw new Error("Deep Link JWT: Provider key not found");
    }
    this.#logger.lti("Building LTI 1.3 Deep Link JWT");
    this.#logger.silly(JSON.stringify(launchData, null, 2));
    const privateKey = crypto.createPrivateKey(key.private);
    const jwt = await jsonwebtoken.sign(launchData, privateKey, {
      algorithm: "RS256",
      expiresIn: "1h",
      keyid: data.key,
      issuer: new URL("/", this.#domain_name).href,
      audience: authRequest.client_id,
      subject: data.user.key,
    });
    return jwt;
  }

  /**
   * Verify an LTI 1.3 Deep Linking Response JWT and extract content items
   *
   * @param {Object} req the Express request object (must have req.body.JWT and req.params.token)
   * @returns {Object} an object with content_items array and context from the pending deep link record
   * @throws {Error} if the token is invalid, the JWT cannot be verified, or content items are missing
   */
  async verifyDeepLinkResponse(req) {
    const token = req.params.token;
    if (!token) {
      throw new Error("Deep Link Response: No token provided");
    }
    if (!req.body || !req.body.JWT) {
      throw new Error("Deep Link Response: No JWT provided");
    }

    // Look up the pending deep link record
    const deepLinkRecord = await this.#ProviderDeepLinkModel.findOne({ where: { token } });
    if (!deepLinkRecord) {
      throw new Error("Deep Link Response: Invalid or expired token");
    }

    // Look up the provider
    const provider = await this.#ProviderModel.findOne({ where: { key: deepLinkRecord.provider_key } });
    if (!provider) {
      throw new Error("Deep Link Response: Provider not found");
    }

    // Decode JWT to get kid for key lookup
    const decodedJwt = await jsonwebtoken.decode(req.body.JWT, { complete: true });
    if (!decodedJwt) {
      throw new Error("Deep Link Response: Unable to decode JWT");
    }

    // Verify JWT signature using the provider's JWKS
    const jwksClient = getJwksClient(provider.keyset_url);
    const signingKey = await jwksClient.getSigningKey(decodedJwt.header.kid);
    const publicKey = signingKey.getPublicKey();
    try {
      await jsonwebtoken.verify(req.body.JWT, publicKey, {
        audience: new URL("/", this.#domain_name).href,
        issuer: provider.client_id,
      });
    } catch (error) {
      throw new Error("Deep Link Response: Unable to verify JWT: " + error.message, { cause: error });
    }

    // Extract content items
    const contentItemsClaim = "https://purl.imsglobal.org/spec/lti-dl/claim/content_items";
    const content_items = decodedJwt.payload[contentItemsClaim] || [];

    // Destroy the pending record to prevent replay
    const context = deepLinkRecord.context;
    await deepLinkRecord.destroy();

    this.#logger.lti("Deep Link Response verified, received " + content_items.length + " content items");
    return { content_items, context };
  }

  /**
   * Validate LTI 1.3 Token Request
   *
   * @param {Object} req the Express request object
   * @returns {Object} the validated token request data
   * @throws {Error} if the request is invalid
   */
  async validateTokenRequest(req) {
    // merge query and body into single object to handle GET and POST
    const params = { ...req.query, ...req.body };

    // Validate required parameters
    if (!params.grant_type || params.grant_type !== "client_credentials") {
      throw new Error("Token Request: Invalid or missing grant_type parameter");
    }
    if (
      !params.client_assertion_type ||
      params.client_assertion_type !== "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
    ) {
      throw new Error("Token Request: Invalid or missing client_assertion_type parameter");
    }
    if (!params.client_assertion) {
      throw new Error("Token Request: Missing client_assertion parameter");
    }
    if (!params.scope) {
      throw new Error("Token Request: Missing scope parameter");
    }

    // Decode JWT
    let decodedJwt;
    try {
      decodedJwt = await jsonwebtoken.decode(params.client_assertion, { complete: true });
    } catch (error) {
      throw new Error("Token Request: Invalid JWT in client_assertion parameter: " + error.message, { cause: error });
    }

    // Find Provider for key to get expected audience and issuer
    const provider = await this.#ProviderModel.findOne({
      where: { client_id: decodedJwt.payload.iss },
    });
    if (!provider) {
      throw new Error("Token Request: No matching provider found for JWT kid");
    }

    // Get key from provider using JWKS
    const keyUrl = provider.keyset_url;
    const jwksClient = getJwksClient(keyUrl);

    // Find Key
    const key = await jwksClient.getSigningKey(decodedJwt.header.kid);
    const signingKey = key.getPublicKey();

    // Verify JWT
    try {
      await jsonwebtoken.verify(params.client_assertion, signingKey, {
        algorithms: ["RS256"],
        audience: new URL("/lti/consumer/token", this.#domain_name).href,
        issuer: provider.client_id,
        subject: provider.client_id,
      });
    } catch (error) {
      throw new Error("Token Request: Unable to verify JWT: " + error.message, { cause: error });
    }

    // Verify scopes - at least one supported scope must be requested
    const allowedScopes = [
      "https://purl.imsglobal.org/spec/lti-ags/scope/score",
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
    ];
    const requestedScopes = params.scope.split(" ");

    // Only grant scopes that are supported — never echo back arbitrary requested scopes
    const grantedScopes = requestedScopes.filter((s) => allowedScopes.includes(s));
    if (grantedScopes.length === 0) {
      throw new Error("Token Request: Required scope not included in scope parameter");
    }

    // Create and issue token
    const token = {
      scope: grantedScopes.join(" "),
    };

    // Get private key for signing
    const local_key = await this.#ProviderKeyModel.findOne({
      where: { key: provider.key },
      attributes: ["private"],
    });
    if (!local_key) {
      throw new Error("Token Request: No matching key found for JWT kid");
    }
    const privateKey = crypto.createPrivateKey(local_key.private);

    // Sign token and set expiration to 3600 seconds (1 hour)
    const jwt = await jsonwebtoken.sign(token, privateKey, {
      algorithm: "RS256",
      expiresIn: "1h",
      keyid: provider.key,
      issuer: new URL("/", this.#domain_name).href,
      subject: provider.client_id,
      audience: [new URL("/lti/consumer/token", this.#domain_name).href, this.#domain_name],
      jwtid: nanoid(),
    });
    return {
      access_token: jwt,
      token_type: "Bearer",
      expires_in: 3600,
      scope: grantedScopes.join(" "),
    };
  }

  /**
   * Validate AGS Grade Post Request
   *
   * @param {Object} req the Express request object
   * @returns {Object} the validated grade post data
   * @throws {Error} if the request is invalid
   */
  async validateAGSGradePassback(req) {
    // merge query and body into single object to handle GET and POST
    const params = { ...req.query, ...req.body };

    // Validate required parameters
    if (!params.timestamp) {
      throw new Error("Grade Post Request: Missing timestamp parameter");
    }
    if (!params.scoreGiven || typeof params.scoreGiven === "undefined") {
      throw new Error("Grade Post Request: Missing scoreGiven parameter");
    }
    if (!params.scoreMaximum || typeof params.scoreMaximum === "undefined") {
      throw new Error("Grade Post Request: Missing scoreMaximum parameter");
    }
    if (!params.userId) {
      throw new Error("Grade Post Request: Missing userId parameter");
    }
    if (!params.activityProgress) {
      throw new Error("Grade Post Request: Missing activityProgress parameter");
    }
    if (!params.gradingProgress) {
      throw new Error("Grade Post Request: Missing gradingProgress parameter");
    }

    // Check scope of provided token - for simplicity, just check that the required score scope is present for now
    if (
      !req.lti13Token ||
      !req.lti13Token.scope ||
      !req.lti13Token.scope.split(" ").includes("https://purl.imsglobal.org/spec/lti-ags/scope/score")
    ) {
      throw new Error("Grade Post Request: Insufficient permissions for AGS grade post");
    }

    // Validate scores are valid numbers
    const scoreGiven = parseFloat(params.scoreGiven);
    const scoreMaximum = parseFloat(params.scoreMaximum);
    if (isNaN(scoreGiven) || isNaN(scoreMaximum)) {
      throw new Error("Grade Post Request: scoreGiven and scoreMaximum must be valid numbers");
    }

    // Return validated data
    return params;
  }

  /**
   * Validate an AGS Line Item Request token scope
   *
   * @param {Object} req the Express request object (must have req.lti13Token set by middleware)
   * @throws {Error} if the token does not include lineitem.readonly or lineitem scope
   */
  validateAGSLineItemRequest(req) {
    const lineitemScopes = [
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    ];
    if (!req.lti13Token || !req.lti13Token.scope) {
      throw new Error("Line Item Request: Insufficient permissions for AGS line item read");
    }
    const tokenScopes = req.lti13Token.scope.split(" ");
    if (!lineitemScopes.some((s) => tokenScopes.includes(s))) {
      throw new Error("Line Item Request: Insufficient permissions for AGS line item read");
    }
  }

  /**
   * Validate an AGS Result Request token scope
   *
   * @param {Object} req the Express request object (must have req.lti13Token set by middleware)
   * @throws {Error} if the token does not include result.readonly scope
   */
  validateAGSResultRequest(req) {
    if (!req.lti13Token || !req.lti13Token.scope) {
      throw new Error("Result Request: Insufficient permissions for AGS result read");
    }
    const tokenScopes = req.lti13Token.scope.split(" ");
    if (!tokenScopes.includes("https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly")) {
      throw new Error("Result Request: Insufficient permissions for AGS result read");
    }
  }

  /**
   * Get a single line item from an LTI 1.3 AGS endpoint
   *
   * @param {string} consumer_key the key of the consumer
   * @param {string} lineitem_url the URL of the line item to retrieve
   * @returns {Object} the line item object from the LMS
   * @throws {Error} if the request fails
   */
  async getAGSLineItem(consumer_key, lineitem_url) {
    const token = await this.getAccessToken(
      consumer_key,
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
    );
    this.#logger.lti("Fetching AGS line item from " + lineitem_url);
    let result;
    try {
      result = await ky
        .get(lineitem_url, {
          headers: {
            Authorization: `${token.token_type} ${token.access_token}`,
            Accept: "application/vnd.ims.lis.v2.lineitem+json",
          },
        })
        .json();
    } catch (error) {
      throw new Error("Get AGS Line Item: Failed to fetch line item: " + error.message, { cause: error });
    }
    this.#logger.lti("AGS line item fetched successfully");
    this.#logger.silly(JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Get all line items from an LTI 1.3 AGS lineitems endpoint
   *
   * @param {string} consumer_key the key of the consumer
   * @param {string} lineitems_url the URL of the lineitems collection to retrieve
   * @param {string|null} resource_link_id optional resource link ID filter
   * @returns {Array} the array of line item objects from the LMS
   * @throws {Error} if the request fails
   */
  async getAGSLineItems(consumer_key, lineitems_url, resource_link_id = null) {
    const token = await this.getAccessToken(
      consumer_key,
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
    );
    let url = lineitems_url;
    if (resource_link_id) {
      const params = new URLSearchParams({ resource_link_id });
      url = lineitems_url + "?" + params.toString();
    }
    this.#logger.lti("Fetching AGS line items from " + url);
    let result;
    try {
      result = await ky
        .get(url, {
          headers: {
            Authorization: `${token.token_type} ${token.access_token}`,
            Accept: "application/vnd.ims.lis.v2.lineitemcontainer+json",
          },
        })
        .json();
    } catch (error) {
      throw new Error("Get AGS Line Items: Failed to fetch line items: " + error.message, { cause: error });
    }
    this.#logger.lti("AGS line items fetched successfully");
    this.#logger.silly(JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Fetch AGS results for a line item from an LTI consumer via LTI 1.3 AGS
   *
   * @param {string} consumer_key the consumer key
   * @param {string} results_url the results URL for the line item
   * @param {string|null} user_id optional user ID to filter results
   * @returns {Array} array of result objects
   * @throws {Error} if the request fails
   */
  async getAGSResults(consumer_key, results_url, user_id = null) {
    const token = await this.getAccessToken(
      consumer_key,
      "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
    );
    let url = results_url;
    if (user_id) {
      const params = new URLSearchParams({ user_id });
      url = results_url + "?" + params.toString();
    }
    this.#logger.lti("Fetching AGS results from " + url);
    let result;
    try {
      result = await ky
        .get(url, {
          headers: {
            Authorization: `${token.token_type} ${token.access_token}`,
            Accept: "application/vnd.ims.lis.v2.resultcontainer+json",
          },
        })
        .json();
    } catch (error) {
      throw new Error("Get AGS Results: Failed to fetch results: " + error.message, { cause: error });
    }
    this.#logger.lti("AGS results fetched successfully");
    this.#logger.silly(JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Handle LTI 1.3 Dynamic Registration Request
   *
   * @param {string} url the URL to fetch the registration configuration from
   * @return {string} the HTML response to send back to the client
   * @throws {Error} if the request is invalid or if there is an error during processing
   */
  async handleDynamicRegistrationRequest(url, route_prefix) {
    // Create provider registration token
    const registrationToken = nanoid();

    try {
      const registration = await this.#ProviderRegistrationModel.create({
        token: registrationToken,
        url: url,
      });
      if (!registration) {
        throw new Error("Database Error");
      }
    } catch (err) {
      this.#logger.lti("Failed to create LTI 1.3 Dynamic Registration Token");
      this.#logger.lti(err);
      throw new Error("Failed to create LTI 1.3 Dynamic Registration Token: " + err.message, err);
    }

    // Send GET request to the registration URL with the registration token
    const query = new URLSearchParams({
      registration_token: registrationToken,
      openid_configuration: new URL(route_prefix + "/openid-configuration", this.#domain_name).href,
    });
    const response = await ky.get(url + "?" + query.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "text/html",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch registration configuration from URL: " + url);
    }

    const html = await response.text();
    return html;
  }
}

export default LTI13Utils;
