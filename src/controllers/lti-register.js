/**
 * @file LTI Registration Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports LTIRegistrationController an LTI Controller instance
 */

// Import Utilities
import LTI13Utils from "../lib/lti13.js";

class LTIRegistrationController {
  // Private fields
  #LTI13Utils;
  #provider_config;
  #logger;
  #domain_name;
  #admin_email;
  #ConsumerController;

  /**
   * LTI Registration Controller
   *
   * @param {Object} provider_config - the provider configuration object from the main config file
   * @param {Object} models - the LTI toolkit models
   * @param {Object} logger - the logger instance
   * @param {string} domain_name - the domain name of the application (e.g., "https://example.com")
   * @param {string} admin_email - the admin email address (e.g., "admin@domain.tld")
   * @param {Object} consumer_controller - the consumer controller instance (used for database operations related to consumers)
   */
  constructor(provider_config, models, logger, domain_name, admin_email, consumer_controller) {
    this.#provider_config = provider_config;
    this.#logger = logger;
    this.#domain_name = domain_name;
    this.#admin_email = admin_email;
    this.#ConsumerController = consumer_controller;

    // Create LTI Utilities
    this.#LTI13Utils = new LTI13Utils(models, logger, domain_name);
  }

  /**
   * Get an LTI 1.0 Configuration XML
   *
   * @return {string} the LTI 1.0 configuration XML
   */
  async getLTI10Config() {
    // remove https:// from domain name for domain property
    const domain = this.#domain_name.replace(/^https?:\/\//, "");

    // Build custom properties XML
    let custom = "";
    if (this.#provider_config.custom_params) {
      for (const [key, value] of Object.entries(this.#provider_config.custom_params)) {
        custom += `<lticm:property name="${key}">${value}</lticm:property> \n    `;
      }
      custom = `<blti:custom> \n    ${custom}</blti:custom>\n`;
    }

    // Check for navigation link
    let extras = "";
    if (this.#provider_config.navigation) {
      extras += `      <lticm:options name="course_navigation"> \
      <lticm:property name="default">disabled</lticm:property> \
      <lticm:property name="enabled">true</lticm:property> \
      <lticm:property name="windowTarget">_blank</lticm:property> \
    </lticm:options>`;
    }

    // Build XML string
    const xml_string = `<?xml version="1.0" encoding="UTF-8"?> \
<cartridge_basiclti_link xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0" \
  xmlns:blti = "http://www.imsglobal.org/xsd/imsbasiclti_v1p0" \
  xmlns:lticm ="http://www.imsglobal.org/xsd/imslticm_v1p0" \
  xmlns:lticp ="http://www.imsglobal.org/xsd/imslticp_v1p0" \
  xmlns:xsi = "http://www.w3.org/2001/XMLSchema-instance" \
  xsi:schemaLocation = "http://www.imsglobal.org/xsd/imslticc_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd http://www.imsglobal.org/xsd/imsbasiclti_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imsbasiclti_v1p0.xsd http://www.imsglobal.org/xsd/imslticm_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticm_v1p0.xsd http://www.imsglobal.org/xsd/imslticp_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticp_v1p0.xsd"> \
  <blti:title>${this.#provider_config.title}</blti:title> \
  <blti:description>${this.#provider_config.description}</blti:description> \
  <blti:icon>${this.#provider_config.icon_url}</blti:icon> \
  <blti:launch_url>${new URL(`${this.#provider_config.route_prefix}/launch`, this.#domain_name).href}</blti:launch_url> \
  ${custom} \
  <blti:extensions platform="canvas.instructure.com"> \
    <lticm:property name="tool_id">${this.#provider_config.tool_id}</lticm:property> \
    <lticm:property name="privacy_level">${this.#provider_config.privacy_level}</lticm:property> \
    <lticm:property name="domain">${domain}</lticm:property> \
    ${extras} \
  </blti:extensions> \
  <cartridge_bundle identifierref="BLTI001_Bundle"/> \
  <cartridge_icon identifierref="BLTI001_Icon"/> \
</cartridge_basiclti_link>`;
    return xml_string;
  }

  /**
   * LTI 1.3 Dyanamic Registration Handler
   *
   * @param {Object} query - the query parameters from the request
   * @throws {Error} if there is an error during the registration process
   */
  async dynamicRegistration(query) {
    // Get details from LMS
    const lmsDetails = await this.#LTI13Utils.getLMSDetails(query);

    // Get Consumer information based on LMS details
    const confURL = "https://purl.imsglobal.org/spec/lti-platform-configuration";
    const canvasURL = "https://canvas.instructure.com/lti/";

    // Set name based on product family
    let name = lmsDetails[confURL]["product_family_code"];

    // If Canvas, try to get account name for better identification of consumer
    if (lmsDetails[confURL][canvasURL + "account_name"]) {
      name = lmsDetails[confURL][canvasURL + "account_name"];
    }

    // Build consumer object for database
    const consumer = {
      name: name,
      lti13: true,
      // client_id and deployment_id will be updated after successful registration with LMS
      client_id: null,
      deployment_id: null,
      platform_id: lmsDetails.issuer,
      keyset_url: lmsDetails.jwks_uri,
      token_url: lmsDetails.token_endpoint,
      auth_url: lmsDetails.authorization_endpoint,
    };

    const createdConsumer = await this.#ConsumerController.createConsumer(consumer);
    if (!createdConsumer) {
      throw new Error("Dynamic Registration: Failed to create consumer");
    }

    // remove https:// from domain name for domain property
    const domain = this.#domain_name.replace(/^https?:\/\//, "");

    // Get claims based on configured privacy level
    let claims = [];
    if (this.#provider_config.privacy_level === "public") {
      claims = ["iss", "sub", "name", "given_name", "family_name", "email", "picture"];
    } else if (this.#provider_config.privacy_level === "name_only") {
      claims = ["iss", "sub", "name"];
    } else if (this.#provider_config.privacy_level === "email_only") {
      claims = ["iss", "sub", "email"];
    } else if (this.#provider_config.privacy_level === "anonymous") {
      claims = ["iss", "sub"];
    }

    // Check for deep linking
    const messages = [];
    if (this.#provider_config.handleDeeplink) {
      messages.push({
        type: "LtiDeepLinkingRequest",
        target_link_url: new URL(`${this.#provider_config.route_prefix}/launch`, this.#domain_name).href,
        label: this.#provider_config.title,
        icon_uri: this.#provider_config.icon_url,
        // custom_parameters
        placements: ["https://canvas.instructure.com/lti/assignment_selection"],
        // roles
        supported_types: ["ltiResourceLink"],
        "https://canvas.instructure.com/lti/visibility": "admins",
        "https://canvas.instructure.com/lti/display_type": "new_window",
      });
    }

    // Check for navigation link
    if (this.#provider_config.navigation) {
      messages.push({
        type: "LtiResourceLinkRequest",
        target_link_url: new URL(`${this.#provider_config.route_prefix}/launch`, this.#domain_name).href,
        label: this.#provider_config.title,
        icon_uri: this.#provider_config.icon_url,
        // custom_parameters
        placements: ["https://canvas.instructure.com/lti/course_navigation"],
        // roles
        supported_types: ["ltiResourceLink"],
        "https://canvas.instructure.com/lti/course_navigation/default_enabled": false,
        "https://canvas.instructure.com/lti/visibility": "members",
        "https://canvas.instructure.com/lti/display_type": "new_window",
      });
    }

    // Build config object
    const config = {
      application_type: "web",
      response_types: ["id_token"],
      grant_types: ["implicit", "client_credentials"],
      initiate_login_uri: new URL(`${this.#provider_config.route_prefix}/login`, this.#domain_name).href,
      redirect_uris: [new URL(`${this.#provider_config.route_prefix}/launch`, this.#domain_name).href],
      client_name: this.#provider_config.title,
      logo_uri: this.#provider_config.icon_url,
      token_endpoint_auth_method: "private_key_jwt",
      jwks_uri: new URL(`${this.#provider_config.route_prefix}/jwks`, this.#domain_name).href,
      contacts: [this.#admin_email],
      scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score ",
      "https://purl.imsglobal.org/spec/lti-tool-configuration": {
        domain: domain,
        description: this.#provider_config.description,
        target_link_uri: new URL(`${this.#provider_config.route_prefix}/launch`, this.#domain_name).href,
        custom_parameters: this.#provider_config.custom_params,
        claims: claims,
        messages: messages,
      },
    };

    // try to send config to LMS and get response
    try {
      await this.#LTI13Utils.sendRegistrationResponse(
        config,
        lmsDetails.registration_endpoint,
        createdConsumer,
        query.registration_token,
      );
    } catch (error) {
      this.#logger.error("Error registering LTI 1.3 configuration with LMS: " + error.message);
      const body = error.response ? await error.response.json() : null;
      this.#logger.error("Response Body: " + JSON.stringify(body, null, 2));
      throw new Error("Dynamic Registration: Failed to register LTI 1.3 configuration with LMS");
    }
  }
}

export default LTIRegistrationController;
