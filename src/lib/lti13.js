/**
 * @file LTI 1.3 Utilities
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports validate13 Validate LTI 1.3 LOgin
 */

// Import Libraries
import { JwksClient } from "jwks-rsa";
import jsonwebtoken from "jsonwebtoken";
import { nanoid } from "nanoid";
import ky from "ky";
import crypto from "crypto";

class LTI13Utils {
  /**
   * Constructor for LTI 1.3 Utilities
   *
   * @param {Object} models the database models
   * @param {Object} logger the logger instance
   */
  constructor(models, logger, domain_name) {
    this.models = models;
    this.logger = logger;
    this.domain_name = domain_name;
  }

  /**
   * Validate an LTI 1.3 Login Request
   *
   * @param {Object} req - Express request object
   */
  async authRequest(req) {
    try {
      // Hostname must be set
      if (!this.domain_name) {
        this.logger.warn("domain_name variable must be set for LTI to work");
        return false;
      }

      // merge query and body into single object to handle GET and POST
      const params = { ...req.query, ...req.body };

      // find consumer using client_id and deployment_id
      const consumer = await this.models.Consumer.findOne({
        where: {
          client_id: params.client_id,
          deployment_id: params.lti_deployment_id,
        },
      });

      if (!consumer) {
        this.logger.lti(
          "LTI Consumer Not Found: " +
            params.client_id +
            " / " +
            params.lti_deployment_id,
        );
        return false;
      }

      // #######################
      // OAUTH SPECIFIC THINGS
      // #######################
      // iss must be provided
      if (!params.iss) {
        this.logger.lti("No LTI Issuer Provided in Login Request");
        return false;
      }
      // login_hint must be provided
      if (!params.login_hint) {
        this.logger.lti("No LTI Login Hint Provided in Login Request");
        return false;
      }

      // #######################
      // LTI SPECIFIC THINGS
      // #######################
      // LTI Client ID must match if provided
      if (params.client_id) {
        if (params.client_id !== consumer.client_id) {
          this.logger.lti("Invalid LTI Client ID: " + params.client_id);
          return false;
        }
      }
      // LTI Deployment ID must match if provided
      if (params.lti_deployment_id) {
        if (params.lti_deployment_id !== consumer.deployment_id) {
          this.logger.lti(
            "Invalid LTI Deployment ID: " + params.lti_deployment_id,
          );
          return false;
        }
      }
      // LTI Target URI must match
      if (
        !params.target_link_uri ||
        params.target_link_uri !==
          new URL("/lti/provider/launch", this.domain_name).href
      ) {
        this.logger.lti(
          "Invalid LTI Target Link URI: " + params.target_link_uri,
        );
        return false;
      }

      // Generate State and Nonce
      //TODO Automatically expire state and nonce
      const state = nanoid();
      const nonce = nanoid();
      const login = await this.models.ConsumerLogin.create({
        key: consumer.key,
        state,
        nonce,
        iss: params.iss,
        client_id: consumer.client_id,
        keyset_url: consumer.keyset_url,
      });
      if (!login) {
        this.logger.lti("Unable to save Login State - Aborting!");
        return false;
      }

      // Build Return Request Object
      const authRequestForm = {
        scope: "openid",
        response_type: "id_token",
        client_id: consumer.client_id,
        redirect_uri: new URL("/lti/provider/launch", this.domain_name).href,
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
    } catch (error) {
      this.logger.error("Exception while parsing LTI 1.3 Login!");
      this.logger.error(error);
      return false;
    }
  }

  /**
   * Validate an LTI 1.3 Launch Request
   *
   * @param {Object} req - Express request object
   */
  async launchRequest(req) {
    try {
      // Check State
      if (!req.body.state) {
        this.logger.lti("State Not Found in Launch Request");
        return false;
      }
      // Check Token
      if (!req.body.id_token) {
        this.logger.lti("JWT Not Found in Launch Request");
        return false;
      }

      // Load State
      const loginState = await this.models.ConsumerLogin.findOne({
        where: { state: req.body.state },
      });
      if (!loginState) {
        this.logger.lti("Invalid State in Launch Request");
        return false;
      }

      // Request Keys
      const keyUrl = loginState.keyset_url;
      const jwksClient = new JwksClient({
        jwksUri: keyUrl,
        requestHeaders: {},
        timeout: 1000,
      });

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
        this.logger.lti("Unable to Verify JWT!");
        this.logger.debug(error);
        return false;
      }

      // Extract Token
      const token = decodedJwt.payload;

      // Add Tool Consumer Key to Token
      token.key = loginState.key;

      // Remove login state to prevent replays
      await loginState.destroy();

      // TODO: Store and check nonce in token?

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
        this.logger.lti(
          "Invalid LTI Message Type: " + token[baseUrl + "message_type"],
        );
        return false;
      }
      // Token must include LTI version
      if (
        !token[baseUrl + "version"] ||
        token[baseUrl + "version"] !== "1.3.0"
      ) {
        this.logger.lti("Invalid LTI Version: " + token[baseUrl + "version"]);
        return false;
      }

      // Return validated payload to controller
      return token;
    } catch (error) {
      this.logger.error("Exception while parsing LTI 1.3 Launch!");
      this.logger.error(error);
      return false;
    }
  }

  /**
   * Get an access token for the given LTI consumer
   *
   * @param {string} consumerID the ID of the consumer
   * @param {string} scopes the scopes to request
   * @return {string|null} a string containing the access token or null unable to get token
   */
  async getAccessToken(consumerID, scopes) {
    this.logger.lti("Requesting access token for Consumer " + consumerID);
    const consumer = await this.models.Consumer.findByPk(consumerID);
    if (!consumer) {
      this.logger.lti("Consumer not found");
      return null;
    }
    if (!consumer.lti13) {
      this.logger.lti(
        "Consumer token requested but consumer does not support LTI 1.3",
      );
      return null;
    }
    if (!consumer.client_id) {
      this.logger.lti("Consumer client ID not set");
      return null;
    }
    if (!consumer.token_url) {
      this.logger.lti("Consumer token URL not set");
      return null;
    }
    if (!consumer.platform_id) {
      this.logger.lti("Consumer platform ID not set");
      return null;
    }
    const key = await this.models.ConsumerKey.findOne({
      where: { key: consumer.key },
    });
    if (!key) {
      this.logger.lti("Consumer key not found");
      return null;
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
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: jwt,
      scopes: scopes,
    };
    this.logger.lti("Sending Access Token Request to " + consumer.token_url);
    this.logger.silly(JSON.stringify(request, null, 2));
    try {
      const result = await ky
        .post(consumer.token_url, {
          json: request,
        })
        .json();
      if (!result || !result.access_token) {
        this.logger.lti(
          "Unable to get access token from " + consumer.token_url,
        );
        return null;
      }
      return result;
    } catch (error) {
      this.logger.lti("Error requesting access token: " + error.message);
      return null;
    }
  }

  /**
   * Get LMS Details for Dynamic Registration
   *
   * @param {Object} query the query parameters from the request
   * @return {Object|null} an object containing the LMS details or null if unable to get details
   */
  async getLMSDetails(query) {
    if (!query.openid_configuration) {
      this.logger.lti(
        "No OpenID Configuration URL provided for Dynamic Registration",
      );
      return null;
    }
    try {
      const response = await ky.get(query.openid_configuration).json();
      // validate registration endpoint is present and is based on issuer
      if (!response.registration_endpoint) {
        this.logger.lti(
          "No Registration Endpoint found in OpenID Configuration",
        );
        return null;
      }
      if (!response.issuer) {
        this.logger.lti("No Issuer found in OpenID Configuration");
        return null;
      }
      if (!response.registration_endpoint.startsWith(response.issuer)) {
        this.logger.lti(
          "Registration Endpoint does not match Issuer in OpenID Configuration",
        );
        return null;
      }
      // validate other URLs are present
      if (!response.authorization_endpoint) {
        this.logger.lti(
          "No Authorization Endpoint found in OpenID Configuration",
        );
        return null;
      }
      if (!response.token_endpoint) {
        this.logger.lti("No Token Endpoint found in OpenID Configuration");
        return null;
      }
      if (!response.jwks_uri) {
        this.logger.lti("No JWKS URI found in OpenID Configuration");
        return null;
      }
      // validate lti-platform-configuration is present and has required fields
      if (
        !response["https://purl.imsglobal.org/spec/lti-platform-configuration"]
      ) {
        this.logger.lti(
          "No LTI Platform Configuration found in OpenID Configuration",
        );
        return null;
      }
      const platformConfig =
        response["https://purl.imsglobal.org/spec/lti-platform-configuration"];
      if (!platformConfig.product_family_code) {
        this.logger.lti(
          "No Product Family Code found in LTI Platform Configuration",
        );
        return null;
      }
      if (!platformConfig.version) {
        this.logger.lti("No Version found in LTI Platform Configuration");
        return null;
      }
      return response;
    } catch (error) {
      this.logger.lti("Error getting LMS details: " + error.message);
      return null;
    }
  }

  /**
   * Create Tool JWT Token to send to client
   *
   * @param {Object} consumer_key the tool consumer key
   * @param {Object} data the data to include in the token
   * @returns {string} the signed token
   */
  async createToolToken(consumer_key, data) {
    const key = await this.models.ConsumerKey.findOne({
      where: { key: consumer_key },
    });
    if (!key) {
      this.logger.lti("Consumer key not found");
      return null;
    }
    const privateKey = crypto.createPrivateKey(key.private);
    const jwt = await jsonwebtoken.sign(data, privateKey, {
      algorithm: "RS256",
      expiresIn: "1h",
      keyid: consumer_key,
    });
    return jwt;
  }
}

export default LTI13Utils;
