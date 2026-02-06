/**
 * LTI Toolkit - A toolkit for building LTI (Learning Tools Interoperability) applications.
 *
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @license MIT
 */

// Import libraries
import crypto from "crypto";

// Import configuration
import configureLogger from "./src/config/logger.js";
import configureDatabase from "./src/config/database.js";

// Import model setup
import configureModels from "./src/models/models.js";
import configureMigrations from "./src/config/migrations.js";

// Import routes setup function
import setupProviderRoutes from "./src/routes/provider.js";
import setupConsumerRoutes from "./src/routes/consumer.js";

// Import Utilities
import LTI10Utils from "./src/lib/lti10.js";
import LTI13Utils from "./src/lib/lti13.js";

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
 * @param {string|None} [config.provider.url_prefix] - Optional launch URL for configuration XML (e.g., "https://example.com/lti/provider")
 * @param {string|None} [config.provider.icon_url] - Optional icon URL for configuration XML (e.g., "https://example.com/icon.png")
 * @param {string|None} [config.provider.custom_params] - Optional custom parameters for configuration XML (e.g., { "custom_name": "custom_value" })
 * @param {string|None} [config.provider.tool_id] - Optional tool ID for configuration XML (e.g., "lti_toolkit")
 * @param {string|None} [config.provider.privacy_level] - Optional privacy level for configuration XML (e.g., "public")
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
  if (config.provider && typeof config.provider === "object") {
    if (typeof config.provider.handleLaunch !== "function") {
      throw new Error(
        "provider.handleLaunch function is required in Provider configuration",
      );
    }
    if (!config.provider.title || typeof config.provider.title !== "string") {
      config.provider.title = "LTI Toolkit";
    }
    if (
      !config.provider.description ||
      typeof config.provider.description !== "string"
    ) {
      config.provider.description = "LTI Toolkit for LTI Tool Providers";
    }
    if (
      !config.provider.url_prefix ||
      typeof config.provider.url_prefix !== "string"
    ) {
      config.provider.url_prefix = `${config.domain_name}/lti/provider`;
    }
    if (
      !config.provider.icon_url ||
      typeof config.provider.icon_url !== "string"
    ) {
      config.provider.icon_url = "https://placehold.co/64x64.png";
    }
    if (
      !config.provider.custom_params ||
      typeof config.provider.custom_params !== "object"
    ) {
      config.provider.custom_params = {};
    }
    if (
      !config.provider.tool_id ||
      typeof config.provider.tool_id !== "string"
    ) {
      config.provider.tool_id = "lti_toolkit";
    }
    if (
      !config.provider.privacy_level ||
      typeof config.provider.privacy_level !== "string"
    ) {
      config.provider.privacy_level = "public";
    }
  } else {
    config.provider = null;
  }
  if (config.consumer && typeof config.consumer === "object") {
    if (typeof config.consumer.postProviderGrade !== "function") {
      throw new Error(
        "consumer.postProviderGrade function is required in Consumer configuration",
      );
    }
    if (
      !config.consumer.deployment_name ||
      typeof config.consumer.deployment_name !== "string"
    ) {
      throw new Error(
        "A valid deployment name is required in Consumer configuration",
      );
    }
    if (
      !config.consumer.deployment_id ||
      typeof config.consumer.deployment_id !== "string"
    ) {
      throw new Error(
        "A valid deployment ID is required in Consumer configuration",
      );
    }
    if (
      !config.consumer.product_name ||
      typeof config.consumer.product_name !== "string"
    ) {
      config.consumer.product_name = "lti-toolkit";
    }
    if (
      !config.consumer.product_version ||
      typeof config.consumer.product_version !== "string"
    ) {
      config.consumer.product_version = "cloud";
    }
    if (
      !config.consumer.route_prefix ||
      typeof config.consumer.route_prefix !== "string"
    ) {
      config.consumer.route_prefix = "/lti/consumer";
    }
  } else {
    config.consumer = null;
  }

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

  // Add Single Consumer if configured
  if (config.provider && config.provider.key && config.provider.secret) {
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
    const consumer = {
      id: 1,
      name: "Autogenerated LMS",
      key: config.provider.key,
      lti13: false,
      createdAt:
        new Date().toISOString().slice(0, 23).replace("T", " ") + " +00:00",
      updatedAt:
        new Date().toISOString().slice(0, 23).replace("T", " ") + " +00:00",
    };
    // Generate keys for the consumer
    let publicKey = null;
    let privateKey = null;
    ({ publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs1",
        format: "pem",
      },
    }));
    const key = {
      key: config.provider.key,
      secret: config.provider.secret,
      public: publicKey,
      private: privateKey,
    };
    await config.database.queryInterface.bulkInsert("lti_consumers", [
      consumer,
    ]);
    await config.database.queryInterface.bulkInsert("lti_consumer_keys", [key]);
    if (config.database.dialect === "postgres") {
      await config.database.queryInterface.sequelize.query(
        "SELECT setval('lti_consumers_id_seq', max(id)) FROM lti_consumers;",
      );
      await config.database.queryInterface.sequelize.query(
        "SELECT setval('lti_consumer_keys_id_seq', max(id)) FROM lti_consumer_keys;",
      );
    }
    config.logger.info(
      "Added Single LTI Consumer for Provider Key: " + config.provider.key,
    );
  }

  // Setup Utilities
  const lti10 = new LTI10Utils(
    modelConfig.models,
    config.logger,
    config.domain_name,
  );
  const lti13 = new LTI13Utils(
    modelConfig.models,
    config.logger,
    config.domain_name,
  );

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
      lti10: lti10,
      lti13: lti13,
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

  // Setup LTI Controller
  const LTIControllerInstance = new LTIToolkitController(
    config.provider,
    config.consumer,
    modelConfig.models,
    config.logger,
    lti10,
    lti13,
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
