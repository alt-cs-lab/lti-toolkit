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
  #ProviderModel;
  #ProviderLoginModel;
  #ProviderController;
  #ProviderRegistrationModel;

  /**
   * LTI Consumer Controller
   *
   * @param {Object} consumer_config - the consumer configuration object from the main config file
   * @param {Object} models - the LTI toolkit models
   * @param {Object} logger - the logger instance
   * @param {string} domain_name - the domain name of the application (e.g., "https://example.com")
   * @param {string} admin_email - the email address of the administrator
   * @param {Object} provider_controller - the provider controller instance
   */
  constructor(consumer_config, models, logger, domain_name, admin_email, provider_controller) {
    this.#logger = logger;
    this.#consumer_config = consumer_config;
    this.#domain_name = domain_name;
    this.#admin_email = admin_email;
    this.#ProviderModel = models.Provider;
    this.#ProviderLoginModel = models.ProviderLogin;
    this.#ProviderController = provider_controller;
    this.#ProviderRegistrationModel = models.ProviderRegistration;

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
   * Generate LTI 1.3 Login Form Data
   *
   * @param {string} key - the consumer key for the LTI tool
   * @param {string} client_id - the client ID for the LTI tool
   * @param {string} deployment_id - the deployment ID for the LTI tool
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
  async generateLTI13LoginFormData(
    key,
    client_id,
    deployment_id,
    url,
    ret_url,
    context,
    resource,
    user,
    manager,
    gradebook_key,
    custom = null,
  ) {
    // Validate Inputs
    if (!key) {
      throw new Error("Consumer Key is required to generate LTI 1.0 Launch Data");
    }
    if (!client_id) {
      throw new Error("Client ID is required to generate LTI 1.3 Login Data");
    }
    if (!deployment_id) {
      throw new Error("Deployment ID is required to generate LTI 1.3 Login Data");
    }
    if (!url) {
      throw new Error("Launch URL is required to generate LTI 1.3 Login Data");
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

    // Find the Provider in the database
    const provider = await this.#ProviderModel.findOne({
      where: {
        key: key,
      },
    });
    if (!provider) {
      throw new Error("No provider found with key " + key);
    }
    // Get auth URL for client
    const auth_url = provider.auth_url;
    if (!auth_url) {
      throw new Error("No auth URL found for provider " + provider.name);
    }
    this.#logger.lti("Generating LTI 1.3 Login Data for Provider " + provider.name + " (" + key + ")");

    // Build Login Message
    const login = {
      iss: new URL("/", this.#domain_name).href,
      login_hint: nanoid(),
      client_id: client_id,
      lti_deployment_id: deployment_id,
      target_link_uri: url,
      lti_storage_target: "post_message_forwarding",
    };
    this.#logger.silly("Login Data: " + JSON.stringify(login, null, 2));

    // Build Data to Store in DB
    const loginData = {
      key: key,
      url: url,
      deployment_id: deployment_id,
      ret_url: ret_url,
      context: context,
      resource: resource,
      user: user,
      manager: manager,
      gradebook_key: gradebook_key,
      custom: custom,
    };

    // Store in DB
    const loginCreated = await this.#ProviderLoginModel.create({
      client_id: client_id,
      login_hint: login.login_hint,
      data: JSON.stringify(loginData),
    });
    if (!loginCreated || loginCreated.login_hint != login.login_hint) {
      throw new Error("Validation Error: Unable to save LTI 1.3 Login - Aborting!");
    }
    this.#logger.silly("Login Created: " + JSON.stringify(loginCreated, null, 2));
    return {
      fields: login,
      action: auth_url,
    };
  }

  /**
   * Handle LTI 1.0 XML Registration Request
   *
   * @param {Object} data - the data from the registration request (either XML or URL)
   * @param {string} data.xml - the XML string containing the LTI 1.0 configuration (optional if URL is provided)
   * @param {string} data.url - the URL to fetch the XML configuration from (optional if XML is provided)
   * @param {string} data.key - the key to use for the new provider
   * @param {string} data.secret - the secret to use for the new provider
   * @return {Object} the created provider object
   * @throws {Error} if the XML is invalid or if there is an error creating the provider
   */
  async lti10configxml(data) {
    // data must include a key and secret field
    if (!data.key) {
      throw new Error("Invalid LTI 1.0 Configuration: Missing Key");
    }
    if (!data.secret) {
      throw new Error("Invalid LTI 1.0 Configuration: Missing Secret");
    }

    // check if data contains an xml field or a url field
    let xml;
    if (data.url) {
      // fetch the XML from the URL
      const response = await fetch(data.url);
      if (!response.ok) {
        throw new Error("Failed to fetch XML from URL: " + data.url);
      }
      xml = await response.text();
    } else {
      xml = data.xml;
    }

    const config_data = await this.#LTI10Utils.validateConfigXML(xml);

    // Check for duplicate name in database and append random string if duplicate exists
    const existingConsumer = await this.#ProviderController.getByName(config_data.title);
    if (existingConsumer) {
      config_data.title += " (" + Math.random().toString(36).substring(2, 8) + ")";
    }

    // If valid, add the LTI tool to the database
    const provider = await this.#ProviderController.createProvider({
      name: config_data.title,
      lti13: false,
      key: data.key,
      secret: data.secret,
      launch_url: config_data.launch_url,
      // infer domain from launch url wihtout https:// or any path (e.g., https://example.com/path -> example.com)
      domain: config_data?.extensions?.domain || new URL(config_data.launch_url).hostname,
      custom: config_data.custom ? JSON.stringify(config_data.custom) : null,
      use_section: false,
    });

    return provider;
  }

  /**
   * Handle LTI 1.3 Dynamic Registration Request
   *
   * @param {string} url - the URL to fetch the registration configuration from
   * @return {Object} the created provider object
   * @throws {Error} if the configuration is invalid or if there is an error creating the provider
   */
  async lti13dynamicregistration(url) {
    // Create provider registration token
    const registrationToken = nanoid();
    this.#logger.lti("Handling LTI 1.3 Dynamic Registration Request for URL " + url);

    try {
      const registration = await this.#ProviderRegistrationModel.create({
        token: registrationToken,
        url: url,
      });
      if (!registration) {
        throw new Error("Failed to create LTI 1.3 Dynamic Registration Token");
      }
    } catch (err) {
      this.#logger.lti("Failed to create LTI 1.3 Dynamic Registration Token");
      this.#logger.lti(err);
      throw new Error("Failed to create LTI 1.3 Dynamic Registration Token: " + err.message, err);
    }

    // Send GET request to the registration URL with the registration token
    const query = new URLSearchParams({
      registration_token: registrationToken,
      openid_configuration: new URL(this.#consumer_config.route_prefix + "/openid-configuration", this.#domain_name)
        .href,
    });
    const response = await fetch(url + "?" + query.toString(), {
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

export default LTIConsumerController;
