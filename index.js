/**
 * LTI Toolkit - A toolkit for building LTI (Learning Tools Interoperability) applications.
 *
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @license MIT
 */

// Import configuration
import configureLogger from "./src/config/logger.js";
import configureDatabase from "./src/config/database.js";

// Import model setup
import configureModels from "./src/models/models.js";
import configureMigrations from "./src/config/migrations.js";

// Import routes setup function
import setupProviderRoutes from "./src/routes/provider.js";
import setupConsumerRoutes from "./src/routes/consumer.js";

// Import controllers
import LTIToolkitController from "./src/controllers/lti.js";
import ProviderController from "./src/controllers/provider.js";
import ConsumerController from "./src/controllers/consumer.js";

/**
 * LTI Toolkit - A toolkit for building LTI (Learning Tools Interoperability) applications.
 *
 * @param {*} config - Configuration object
 * @param {string} [config.domain_name] - Domain name of the application (e.g., "example.com")
 * @param {string} [config.admin_email] - Admin email address (e.g., "admin@example.com")
 * @param {Object|None} [config.logger] - Optional logger object (defaults to built-in logger)
 * @param {string|None} [config.log_level] - Optional log level (defaults to "info", use "warn" or "error" for production)
 * @param {Object|None} [config.database] - Optional Sequelize database instance (defaults to built-in SQLite database)
 * @param {String|None} [config.db_storage] - Optional storage location for SQLite database (defaults to "lti-toolkit.db")
 * @param {Object|None} [config.provider] - LTI Provider Configuration
 * @param {Function} [config.provider.handleLaunch] - Required function to handle launch requests
 * @param {string|None} [config.provider.key] - LTI 1.0 Key for Single Provider Setup
 * @param {string|None} [config.provider.secret] - LTI 1.0 Secret for Single Provider Setup
 * @param {string|None} [config.provider.title] - Optional title for configuration XML (e.g., "LTI Toolkit")
 * @param {string|None} [config.provider.description] - Optional description for configuration XML (e.g., "LTI Toolkit Description")
 * @param {string|None} [config.provider.route_prefix] - Optional route prefix for provider routes (defaults to "/lti/provider")
 * @param {string|None} [config.provider.icon_url] - Optional icon URL for configuration XML (e.g., "https://example.com/icon.png")
 * @param {string|None} [config.provider.custom_params] - Optional custom parameters for configuration XML (e.g., { "custom_name": "custom_value" })
 * @param {string|None} [config.provider.tool_id] - Optional tool ID for configuration XML (e.g., "lti_toolkit")
 * @param {string|None} [config.provider.privacy_level] - Optional privacy level for configuration XML (e.g., "public")
 * @param {string|None} [config.provider.handleDeeplink] - Optional LTI 1.3 Deeplink Handler
 * @param {boolean|None} [config.provider.Navigation] - Optional show LTI tool in course navigation
 * @param {Object|None} [config.consumer] - LTI Consumer Configuration
 * @param {Function} [config.consumer.postProviderGrade] - Required function to handle posting grades to the provider
 * @param {string} [config.consumer.product_name] - Optional Product name (e.g., "lti-toolkit")
 * @param {string} [config.consumer.product_version] - Optional Product version (e.g., "cloud")
 * @param {string} [config.consumer.deployment_name] - Deployment name (e.g., "My LTI Tool")
 * @param {string} [config.consumer.deployment_id] - Deployment ID (e.g., "deployment-12345")
 * @param {string} [config.consumer.route_prefix] - Optional route prefix for consumer routes (defaults to "/lti/consumer")
 * @param {boolean|None} [config.test] - Optional flag to indicate if running in test mode (defaults to false)
 * @returns {Promise<Object>} - Returns a promise that resolves to an object containing the models and routers
 */
export default async function LtiToolkit(config) {
  // Validate configuration
  validateConfig(config);

  // Validate provider and consumer configurations and set defaults
  config.provider = validateProviderConfig(config.provider);
  config.consumer = validateConsumerConfig(config.consumer);

  // TODO check types of logger and database?

  // Configure Logger
  if (!config.logger) {
    if (config.test) {
      config.logger = configureLogger("error");
    } else {
      config.logger = configureLogger(config.log_level);
    }
  }

  // Configure Database
  if (!config.database) {
    if (config.test) {
      config.database = configureDatabase(config.logger, ":memory:");
    } else {
      if (!config.db_storage || typeof config.db_storage !== "string") {
        config.db_storage = "lti-toolkit.db";
      }
      config.database = configureDatabase(config.logger, config.db_storage);
    }
  }

  // Run Migrations
  const umzug = configureMigrations(config.database, config.logger);
  await config.database.authenticate();
  await umzug.up();

  // Configure Models
  const modelConfig = configureModels(config.database, config.logger);

  // Initialize LTI Session Expiration
  modelConfig.initializeExpiration();

  // Build return object
  const returnObj = {
    routers: {},
    controllers: {},
    models: modelConfig.models,
  };

  // Add Testing Utilities if in test mode
  if (config.test) {
    returnObj.test = {
      // Expose for testing
      initializeExpiration: modelConfig.initializeExpiration,
      db: config.database,
    };
  }

  // Add Provider and Consumer Controllers if configured
  if (config.consumer) {
    // Provider Controller to add/remove providers
    const ProviderControllerInstance = new ProviderController(
      modelConfig.models,
      config.logger,
      config.database,
    );
    returnObj.controllers.provider = ProviderControllerInstance;
  }
  if (config.provider) {
    // Consumer Controller to add/remove consumers
    const ConsumerControllerInstance = new ConsumerController(
      modelConfig.models,
      config.logger,
      config.database,
    );
    returnObj.controllers.consumer = ConsumerControllerInstance;
  }

  // Set up single LTI Consumer if configured
  if (config.provider && config.provider.key && config.provider.secret) {
    // Clear existing consumers and keys
    await config.database.queryInterface.bulkDelete(
      "lti_consumer_keys",
      {},
      { truncate: true },
    );
    await config.database.queryInterface.bulkDelete(
      "lti_consumers",
      {},
      { truncate: true },
    );

    // Create consumer and key
    returnObj.controllers.consumer.createConsumer({
      name: "Autogenerated LMS",
      key: config.provider.key,
      secret: config.provider.secret,
      lti13: false,
    });
    config.logger.info(
      "Added Single LTI Consumer for Provider Key: " + config.provider.key,
    );
  }

  // Setup LTI Controller
  const LTIControllerInstance = new LTIToolkitController(
    config.provider,
    config.consumer,
    modelConfig.models,
    config.logger,
    config.domain_name,
    config.admin_email,
    returnObj.controllers.consumer,
  );
  returnObj.controllers.lti = LTIControllerInstance;

  // Add Routers
  if (config.consumer) {
    // Consumer Routes
    const consumerRouter = await setupConsumerRoutes(
      LTIControllerInstance,
      config.logger,
    );
    returnObj.routers.consumer = consumerRouter;
  }
  if (config.provider) {
    // Provider Routes
    const providerRouter = await setupProviderRoutes(
      LTIControllerInstance,
      config.logger,
    );
    returnObj.routers.provider = providerRouter;
  }

  return returnObj;
}

/**
 * Validate Required Configuration Fields
 *
 * @param {Object} config - Configuration object
 * @throws Will throw an error if required fields are missing or invalid
 */
function validateConfig(config) {
  // Implementation of validation logic
  if (!config) {
    throw new Error("Configuration object is required");
  }
  if (!config.domain_name || typeof config.domain_name !== "string") {
    throw new Error("A valid domain name is required in configuration");
  }
  if (!config.admin_email || typeof config.admin_email !== "string") {
    throw new Error("A valid admin email is required in configuration");
  }
  // Check for provider and consumer functions
  if (!config.provider && !config.consumer) {
    throw new Error(
      "At least one of provider or consumer configuration is required",
    );
  }
}

/**
 * Validate Provider Configuration and set defaults
 *
 * @param {Object} providerConfig - Provider configuration object
 * @returns {Object} Validated and defaulted provider configuration
 * @throws Will throw an error if required fields are missing or invalid
 */
function validateProviderConfig(providerConfig) {
  if (providerConfig && typeof providerConfig === "object") {
    if (typeof providerConfig.handleLaunch !== "function") {
      throw new Error(
        "provider.handleLaunch function is required in Provider configuration",
      );
    }
    if (!providerConfig.title || typeof providerConfig.title !== "string") {
      providerConfig.title = "LTI Toolkit";
    }
    if (
      !providerConfig.description ||
      typeof providerConfig.description !== "string"
    ) {
      providerConfig.description = "LTI Toolkit for LTI Tool Providers";
    }
    if (
      !providerConfig.route_prefix ||
      typeof providerConfig.route_prefix !== "string"
    ) {
      providerConfig.route_prefix = "/lti/provider";
    }
    if (
      !providerConfig.icon_url ||
      typeof providerConfig.icon_url !== "string"
    ) {
      providerConfig.icon_url = "https://placehold.co/64x64.png";
    }
    if (
      !providerConfig.custom_params ||
      typeof providerConfig.custom_params !== "object"
    ) {
      providerConfig.custom_params = {};
    }
    if (!providerConfig.tool_id || typeof providerConfig.tool_id !== "string") {
      providerConfig.tool_id = "lti_toolkit";
    }
    if (
      !providerConfig.privacy_level ||
      typeof providerConfig.privacy_level !== "string"
    ) {
      providerConfig.privacy_level = "public";
    }
    if (
      !providerConfig.handleDeeplink ||
      typeof providerConfig.handleDeeplink !== "function"
    ) {
      providerConfig.handleDeeplink = null;
    }
    if (
      !providerConfig.navigation ||
      typeof providerConfig.navigation !== "boolean"
    ) {
      providerConfig.navigation = true;
    }
  } else {
    providerConfig = null;
  }
  return providerConfig;
}

/**
 * Validate Consumer Configuration and set defaults
 *
 * @param {Object} consumerConfig - Consumer configuration object
 * @returns {Object} Validated and defaulted consumer configuration
 * @throws Will throw an error if required fields are missing or invalid
 */
function validateConsumerConfig(consumerConfig) {
  if (consumerConfig && typeof consumerConfig === "object") {
    if (typeof consumerConfig.postProviderGrade !== "function") {
      throw new Error(
        "consumer.postProviderGrade function is required in Consumer configuration",
      );
    }
    if (
      !consumerConfig.deployment_name ||
      typeof consumerConfig.deployment_name !== "string"
    ) {
      throw new Error(
        "A valid deployment name is required in Consumer configuration",
      );
    }
    if (
      !consumerConfig.deployment_id ||
      typeof consumerConfig.deployment_id !== "string"
    ) {
      throw new Error(
        "A valid deployment ID is required in Consumer configuration",
      );
    }
    if (
      !consumerConfig.product_name ||
      typeof consumerConfig.product_name !== "string"
    ) {
      consumerConfig.product_name = "lti-toolkit";
    }
    if (
      !consumerConfig.product_version ||
      typeof consumerConfig.product_version !== "string"
    ) {
      consumerConfig.product_version = "cloud";
    }
    if (
      !consumerConfig.route_prefix ||
      typeof consumerConfig.route_prefix !== "string"
    ) {
      consumerConfig.route_prefix = "/lti/consumer";
    }
  } else {
    consumerConfig = null;
  }
  return consumerConfig;
}
