/**
 * @file LTI Launch Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports LTILaunchController an LTI Controller instance
 */

// Import libraries
import crypto from "crypto";

// Import Utilities
import LTI10Utils from "../lib/lti10.js";
import LTI13Utils from "../lib/lti13.js";

class LTILaunchController {
  // Private fields for LTI utilities
  #LTI10Utils;
  #LTI13Utils;
  #logger;
  #provider_config
  #ConsumerController;

  /**
   * LTI Launch Controller
   *
   * @param {*} provider LTI provider configuration
   * @param {*} models LTI toolkit models
   * @param {*} logger Logger instance
   * @param {string} domain_name Domain name of the application (e.g., "example.com")
   * @param {Object} consumer_controller the consumer controller instance (optional, used for generating LTI 1.0 form data)
   * @returns {LTILaunchController} an instance of the LTI Launch Controller
   */
  constructor(
    provider,
    models,
    logger,
    domain_name,
    consumer_controller,
  ) {
    this.#provider_config = provider;
    this.#logger = logger;
    this.#ConsumerController = consumer_controller;

    // Create LTI Utilities
    this.#LTI10Utils = new LTI10Utils(
      models,
      logger,
      domain_name,
    );
    this.#LTI13Utils = new LTI13Utils(
      models,
      logger,
      domain_name,
    );
  }

  /**
   * Handle an LTI Launch Request
   *
   * @param {Object} req - Express request object
   * @return URL to redirect the user to after validation
   * @throws an error if the request is invalid
   */
  async launch(req) {
    // Check for LTI 1.3 Redirect Request
    if (req.body && req.body.id_token) {
      return await this.#launch13(req);
    } else if (req.body && req.body.oauth_consumer_key) {
      return await this.#launch10(req);
    } else {
      throw new Error(
        "Launch Error: Missing id_token or oauth_consumer_key",
      );
    }
  }

  /**
   * Handle an LTI 1.0 Launch Request
   *
   * @param {Object} req - Express request object
   * @throws an error if the request is invalid
   * @return URL to redirect the user to after validation
   */
  async #launch10(req) {
    // Validate the request
    const launchResult = await this.#LTI10Utils.validate10(req);

    // Update LMS Data
    const consumer = await this.#updateLMS(
      launchResult.oauth_consumer_key,
      launchResult.tool_consumer_info_product_family_code,
      launchResult.tool_consumer_instance_guid,
      launchResult.tool_consumer_instance_name,
      launchResult.tool_consumer_info_version,
    );

    // Build custom items object
    const customItems = Object.keys(launchResult)
      .filter((key) => key.startsWith("custom_"))
      .reduce((obj, key) => {
        // Remove "custom_" prefix from key and add to custom items object
        // obj[key.substring(7)] = launchResult[key];
        obj[key] = launchResult[key];
        return obj;
      }, {});

    // Build launch data object
    const launchData = {
      launch_type: "lti1.0",
      tool_consumer_key: launchResult.oauth_consumer_key,
      // tool_consumer_product:
      //   launchResult.tool_consumer_info_product_family_code,
      // tool_consumer_guid: launchResult.tool_consumer_instance_guid,
      // tool_consumer_name: launchResult.tool_consumer_instance_name,
      // tool_consumer_version: launchResult.tool_consumer_info_version,
      course_id: launchResult.context_id,
      course_label: launchResult.context_label,
      course_name: launchResult.context_title,
      assignment_id: launchResult.resource_link_id,
      assignment_lti_id: launchResult.ext_lti_assignment_id,
      assignment_name: launchResult.resource_link_title,
      return_url: launchResult.launch_presentation_return_url,
      outcome_url: launchResult.lis_outcome_service_url,
      outcome_id: launchResult.lis_result_sourcedid,
      outcome_ags: null,
      user_lis_id: launchResult.user_id,
      user_lis13_id: null,
      user_email: launchResult.lis_person_contact_email_primary,
      user_name: launchResult.lis_person_name_full,
      user_given_name: launchResult.lis_person_name_given,
      user_family_name: launchResult.lis_person_name_family,
      user_image: launchResult.user_image,
      user_roles: launchResult.roles,
      custom: customItems,
    };

    // Call Launch Handler
    return await this.#launch(launchData, consumer, req);
  }

  /**
   * Handle an LTI 1.3 Launch Request
   *
   * @param {Object} req - Express request object
   * @throws an error if the request is invalid
   * @return URL to redirect the user to after validation
   */
  async #launch13(req) {
    const launchResult = await this.#LTI13Utils.launchRequest(req);

    // Base URL for LTI Claims
    const baseUrl = "https://purl.imsglobal.org/spec/lti/claim/";

    // Update LMS Data
    const consumer = await this.#updateLMS(
      launchResult.key,
      launchResult[baseUrl + "tool_platform"].product_family_code,
      launchResult[baseUrl + "tool_platform"].guid,
      launchResult[baseUrl + "tool_platform"].name,
      launchResult[baseUrl + "tool_platform"].version,
    );

    // Determine Launch Type and Call Appropriate Handler
    if (launchResult[baseUrl + "message_type"] === "LtiResourceLinkRequest") {
      const agsUrl = "https://purl.imsglobal.org/spec/lti-ags/claim/";
      const launchData = {
        launch_type: "lti1.3",
        tool_consumer_key: launchResult.key,
        // tool_consumer_product:
        //   launchResult[baseUrl + "tool_platform"].product_family_code,
        // tool_consumer_guid: launchResult[baseUrl + "tool_platform"].guid,
        // tool_consumer_name: launchResult[baseUrl + "tool_platform"].name,
        // tool_consumer_version:
        //   launchResult[baseUrl + "tool_platform"].version,
        course_id: launchResult[baseUrl + "context"].id,
        course_label: launchResult[baseUrl + "context"].label,
        course_name: launchResult[baseUrl + "context"].title,
        assignment_id: launchResult[baseUrl + "lti1p1"]?.resource_link_id,
        assignment_lti_id: launchResult[baseUrl + "resource_link"]?.id,
        assignment_name: launchResult[baseUrl + "resource_link"]?.title,
        return_url: launchResult[baseUrl + "launch_presentation"]?.return_url,
        outcome_url: launchResult[agsUrl + "endpoint"]?.lineitem,
        outcome_id: null,
        outcome_ags: JSON.stringify(launchResult[agsUrl + "endpoint"]),
        user_lis_id: launchResult[baseUrl + "lti1p1"]?.user_id,
        user_lis13_id: launchResult.sub,
        user_email: launchResult.email,
        user_name: launchResult.name,
        user_given_name: launchResult.given_name,
        user_family_name: launchResult.family_name,
        user_image: launchResult.picture,
        user_roles: launchResult[baseUrl + "roles"],
        custom: launchResult[baseUrl + "custom"],
      };
      return await this.#launch(launchData, consumer, req);
    } else if (
      launchResult[baseUrl + "message_type"] === "LtiDeepLinkingRequest"
    ) {
      const dlUrl =
        "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings";
      const deeplinkData = {
        launch_type: "lti1.3deeplink",
        tool_consumer_key: launchResult.key,
        // tool_consumer_product:
        //   launchResult[baseUrl + "tool_platform"].product_family_code,
        // tool_consumer_guid: launchResult[baseUrl + "tool_platform"].guid,
        // tool_consumer_name: launchResult[baseUrl + "tool_platform"].name,
        // tool_consumer_version:
        //   launchResult[baseUrl + "tool_platform"].version,
        course_id: launchResult[baseUrl + "context"].id,
        course_label: launchResult[baseUrl + "context"].label,
        course_name: launchResult[baseUrl + "context"].title,
        return_url: launchResult[baseUrl + "launch_presentation"]?.return_url,
        user_lis_id: launchResult[baseUrl + "lti1p1"]?.user_id,
        user_lis13_id: launchResult.sub,
        user_email: launchResult.email,
        user_name: launchResult.name,
        user_given_name: launchResult.given_name,
        user_family_name: launchResult.family_name,
        user_image: launchResult.picture,
        user_roles: launchResult[baseUrl + "roles"],
        custom: launchResult[baseUrl + "custom"],
        deep_link_return_url: launchResult[dlUrl].deep_link_return_url,
      };
      return await this.#deeplink(deeplinkData, consumer, req);
    } else {
      throw new Error("Launch Error: Unsupported LTI Message Type: " + launchResult[baseUrl + "message_type"]);
    }
  }

  /**
   * Update LMS data in the database
   *
   * @param {string} key the consumer key of the LMS
   * @param {string} product the product name of the LMS
   * @param {string} guid the GUID of the LMS
   * @param {string} name the name of the LMS
   * @param {string} version the version of the LMS
   * @return {Consumer} the updated consumer
   * @throws an error if the consumer cannot be found
   */
  async #updateLMS(key, product, guid, name, version) {
    // Tool Consumers
    const consumer = await this.#ConsumerController.getByKey(key);
    if (!consumer) {
      throw new Error("Launch Error: Cannot find LTI Consumer for key: " + key);
    }
    // Check for changes in Tool Consumer
    let changed = false;
    const prior = {};
    const updated = {};
    if (consumer.tc_product != product) {
      changed = true;
      prior.tc_product = consumer.tc_product;
      updated.tc_product = product;
    }
    if (consumer.tc_version != version) {
      changed = true;
      prior.tc_version = consumer.tc_version;
      updated.tc_version = version;
    }
    if (consumer.tc_guid != guid) {
      changed = true;
      prior.tc_guid = consumer.tc_guid;
      updated.tc_guid = guid;
    }
    if (consumer.tc_name != name) {
      changed = true;
      prior.tc_name = consumer.tc_name;
      updated.tc_name = name;
    }
    if (changed) {
      // HACK Are changes to these values a problem?
      // If so, we should consider not updating them and instead just logging the changes and maybe alerting the admin
      // For now, we will just log the changes
      this.#logger.warn("Tool Consumer Data Changed!");
      this.#logger.warn("Old: " + JSON.stringify(prior, null, 2));
      this.#logger.warn("New: " + JSON.stringify(updated, null, 2));
      consumer.set(updated);
      await consumer.save();
    }
    return consumer;
  }

  /**
   * Handle an LTI Launch Request
   *
   */
  async #launch(launchData, consumer, req) {
    this.#logger.lti("Handling LTI Launch");
    this.#logger.silly("Launch Data: " + JSON.stringify(launchData, null, 2));
    if (this.#provider_config && typeof this.#provider_config.handleLaunch === "function") {
      return await this.#provider_config.handleLaunch(launchData, consumer, req);
    } else {
      throw new Error("Launch Error: No provider.handleLaunch function defined!");
    }
  }

  /**
   * Handle an LTI Launch Request
   *
   */
  async #deeplink(launchData, consumer, req) {
    this.#logger.lti("Handling LTI Deeplink");
    this.#logger.silly("Launch Data: " + JSON.stringify(launchData, null, 2));
    if (this.#provider_config && typeof this.#provider_config.handleDeeplink === "function") {
      return await this.#provider_config.handleDeeplink(launchData, consumer, req);
    } else {
      throw new Error("Deeplink Error: No provider.handleDeeplink function defined!");
    }
  }

  /**
   * Handle an LTI 1.3 Login Request
   *
   * @param {Object} req - Express request object
   * @return returns an authRequest form
   * @throws an error if the request is invalid
   */
  async login13(req) {
    // Validate the request
    return await this.#LTI13Utils.authRequest(req);
  }

  /**
   * Generate the JWKS for tool consumers
   *
   * @returns {Array} an array of JWKs for the tool consumers
   */
  async generateConsumerJWKS() {
    const keys = await this.#ConsumerController.getAllKeys();
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
}

export default LTILaunchController;
