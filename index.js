/**
 * LTI Toolkit - A toolkit for building LTI (Learning Tools Interoperability) applications.
 *
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @license MIT
 */

// Import Libraries
import { Sequelize } from "sequelize";

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
import ProviderController from "./src/controllers/provider.js";
import ConsumerController from "./src/controllers/consumer.js";
import LTIConsumerController from "./src/controllers/lti-consumer.js";
import LTIProviderController from "./src/controllers/lti-provider.js";
import LTILaunchController from "./src/controllers/lti-launch.js";
import LTIRegisterController from "./src/controllers/lti-register.js";
import LTILMSController from "./src/controllers/lti-lms.js";

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
 * @param {string} config.encryption_key - Required 64-character hex string (32 bytes) used as the AES-256-GCM key to encrypt secrets and private keys at rest (e.g. generate with `openssl rand -hex 32`)
 * @param {Object|None} [config.provider] - LTI Provider Configuration
 * @param {Function} [config.provider.handleLaunch] - Required function to handle launch requests
 * @param {string|None} [config.provider.title] - Optional title for configuration XML (e.g., "LTI Toolkit")
 * @param {string|None} [config.provider.description] - Optional description for configuration XML (e.g., "LTI Toolkit Description")
 * @param {string|None} [config.provider.route_prefix] - Optional route prefix for provider routes (defaults to "/lti/provider")
 * @param {string|None} [config.provider.icon_url] - Optional icon URL for configuration XML (e.g., "https://example.com/icon.png")
 * @param {string|None} [config.provider.custom_params] - Optional custom parameters for configuration XML (e.g., { "custom_name": "custom_value" })
 * @param {string|None} [config.provider.tool_id] - Optional tool ID for configuration XML (e.g., "lti_toolkit")
 * @param {string|None} [config.provider.privacy_level] - Optional privacy level for configuration XML (e.g., "public")
 * @param {string|None} [config.provider.handleDeeplink] - Optional LTI 1.3 Deeplink Handler
 * @param {boolean|None} [config.provider.navigation] - Optional show LTI tool in course navigation
 * @param {Object|None} [config.consumer] - LTI Consumer Configuration
 * @param {Function} [config.consumer.postProviderGrade] - Required function to handle posting grades to the provider
 * @param {Function} [config.consumer.handleDeeplink] - Optional function to handle LTI 1.3 Deep Linking responses from providers
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

  // Validate encryption key and convert to a Buffer for use by the models
  const encryptionKey = validateEncryptionConfig(config.encryption_key);

  // Validate provider and consumer configurations and set defaults
  config.provider = validateProviderConfig(config.provider);
  config.consumer = validateConsumerConfig(config.consumer);

  // Check for provider and consumer functions
  if (!config.provider && !config.consumer) {
    throw new Error("At least one of provider or consumer configuration is required");
  }

  // Configure the logging system
  config.logger = validateLoggerConfig(config.logger, config.log_level, config.test);

  // Configure the database
  config.database = validateDatabaseConfig(config.database, config.db_storage, config.logger, config.test);

  // Run Migrations
  const umzug = configureMigrations(config.database, config.logger);
  await config.database.authenticate();
  await umzug.up();

  // Configure Models
  const modelConfig = configureModels(config.database, config.logger, encryptionKey);

  // Initialize LTI Session Expiration
  modelConfig.initializeExpiration();

  // Build return object
  const returnObj = {
    routers: {},
    controllers: {},
    models: {},
  };

  // Add Testing Utilities if in test mode
  if (config.test === true) {
    returnObj.test = {
      // Expose for testing
      initializeExpiration: modelConfig.initializeExpiration,
      // db: config.database,
      // models: modelConfig.models,
    };
  }

  // Add Provider and Consumer Registry Controllers (CRUD for registered records) if configured
  if (config.consumer) {
    // Provider Registry Controller to add/remove the Providers this app connects to
    const ProviderControllerInstance = new ProviderController(modelConfig.models, config.database);
    returnObj.controllers.providerRegistry = ProviderControllerInstance;
    returnObj.models.Provider = modelConfig.models.Provider;
  }
  if (config.provider) {
    // Consumer Registry Controller to add/remove the Consumers (LMSs) that can launch this app
    const ConsumerControllerInstance = new ConsumerController(modelConfig.models, config.database);
    returnObj.controllers.consumerRegistry = ConsumerControllerInstance;
    returnObj.models.Consumer = modelConfig.models.Consumer;
  }

  // Add Routers & Protocol Controllers
  if (config.consumer) {
    // Consumer LTI Controller to handle posting grades and other consumer functions
    const LTIConsumerControllerInstance = new LTIConsumerController(
      config.consumer,
      modelConfig.models,
      config.logger,
      config.domain_name,
      config.admin_email,
      returnObj.controllers.providerRegistry,
    );

    // LMS LTI Controller to handle other LMS functions like registration and key management
    const LTILMSControllerInstance = new LTILMSController(
      config.consumer,
      modelConfig.models,
      config.logger,
      config.domain_name,
      returnObj.controllers.providerRegistry,
    );

    // Consumer Routes
    const consumerRouter = await setupConsumerRoutes(
      LTILMSControllerInstance,
      modelConfig.models.ProviderKey,
      config.logger,
    );
    returnObj.routers.consumer = consumerRouter;
    returnObj.controllers.consumer = LTIConsumerControllerInstance;
  }
  if (config.provider) {
    // Provider LTI Controller to handle launches and other provider functions
    const LTIProviderControllerInstance = new LTIProviderController(
      config.provider,
      modelConfig.models,
      config.logger,
      config.domain_name,
    );

    const LTILaunchControllerInstance = new LTILaunchController(
      config.provider,
      modelConfig.models,
      config.logger,
      config.domain_name,
      returnObj.controllers.consumerRegistry,
    );

    const LTIRegisterControllerInstance = new LTIRegisterController(
      config.provider,
      modelConfig.models,
      config.logger,
      config.domain_name,
      config.admin_email,
      returnObj.controllers.consumerRegistry,
    );

    // Provider Routes
    const providerRouter = await setupProviderRoutes(
      LTILaunchControllerInstance,
      LTIRegisterControllerInstance,
      config.logger,
    );
    returnObj.routers.provider = providerRouter;
    returnObj.controllers.provider = LTIProviderControllerInstance;
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
}

/**
 * Validate the encryption key and convert it to a Buffer
 *
 * @param {string} encryptionKey - 64-character hex string (32 bytes) used as the AES-256-GCM key
 * @returns {Buffer} the encryption key as a Buffer
 * @throws Will throw an error if the encryption key is missing or not a valid 32-byte hex string
 */
function validateEncryptionConfig(encryptionKey) {
  if (!encryptionKey || typeof encryptionKey !== "string") {
    throw new Error("A valid encryption key is required in configuration");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    throw new Error("encryption_key must be a 64-character hex string (32 bytes) for AES-256-GCM");
  }
  return Buffer.from(encryptionKey, "hex");
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
      throw new Error("provider.handleLaunch function is required in Provider configuration");
    }
    if (!providerConfig.title || typeof providerConfig.title !== "string") {
      providerConfig.title = "LTI Toolkit";
    }
    if (!providerConfig.description || typeof providerConfig.description !== "string") {
      providerConfig.description = "LTI Toolkit for LTI Tool Providers";
    }
    if (!providerConfig.route_prefix || typeof providerConfig.route_prefix !== "string") {
      providerConfig.route_prefix = "/lti/provider";
    }
    if (!providerConfig.icon_url || typeof providerConfig.icon_url !== "string") {
      providerConfig.icon_url = "https://placehold.co/64x64.png";
    }
    if (!providerConfig.custom_params || typeof providerConfig.custom_params !== "object") {
      providerConfig.custom_params = {};
    }
    if (!providerConfig.tool_id || typeof providerConfig.tool_id !== "string") {
      providerConfig.tool_id = "lti_toolkit";
    }
    if (!providerConfig.privacy_level || typeof providerConfig.privacy_level !== "string") {
      providerConfig.privacy_level = "public";
    }
    if (!providerConfig.handleDeeplink || typeof providerConfig.handleDeeplink !== "function") {
      providerConfig.handleDeeplink = null;
    }
    if (!providerConfig.navigation || typeof providerConfig.navigation !== "boolean") {
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
      throw new Error("consumer.postProviderGrade function is required in Consumer configuration");
    }
    if (!consumerConfig.deployment_name || typeof consumerConfig.deployment_name !== "string") {
      throw new Error("A valid deployment name is required in Consumer configuration");
    }
    if (!consumerConfig.deployment_id || typeof consumerConfig.deployment_id !== "string") {
      throw new Error("A valid deployment ID is required in Consumer configuration");
    }
    if (!consumerConfig.product_name || typeof consumerConfig.product_name !== "string") {
      consumerConfig.product_name = "lti-toolkit";
    }
    if (!consumerConfig.product_version || typeof consumerConfig.product_version !== "string") {
      consumerConfig.product_version = "cloud";
    }
    if (!consumerConfig.route_prefix || typeof consumerConfig.route_prefix !== "string") {
      consumerConfig.route_prefix = "/lti/consumer";
    }
    if (!consumerConfig.handleDeeplink || typeof consumerConfig.handleDeeplink !== "function") {
      consumerConfig.handleDeeplink = null;
    }
  } else {
    consumerConfig = null;
  }
  return consumerConfig;
}

/**
 * Configure the logging system based on the provided configuration
 *
 * @param {Object} logger - provider logger object
 * @param {string} logLevel - log level to use for the logger
 * @param {boolean} test - flag indicating if running in test mode
 * @returns {Object} Configured logger object
 * @throws Will throw an error if the logger is missing required methods
 */
function validateLoggerConfig(logger, logLevel, test) {
  // Configure Logger
  let configuredLogger;
  if (!logger) {
    if (test) {
      configuredLogger = configureLogger("error");
    } else if (logLevel && typeof logLevel === "string") {
      configuredLogger = configureLogger(logLevel);
    } else {
      configuredLogger = configureLogger("info");
    }
  } else {
    configuredLogger = logger;
  }

  // Check for required logger methods
  if (!configuredLogger.error || typeof configuredLogger.error !== "function") {
    throw new Error("Logger is missing required method: error");
  }
  if (!configuredLogger.info || typeof configuredLogger.info !== "function") {
    throw new Error("Logger is missing required method: info");
  }
  if (!configuredLogger.lti || typeof configuredLogger.lti !== "function") {
    throw new Error("Logger is missing required method: lti");
  }
  if (!configuredLogger.sql || typeof configuredLogger.sql !== "function") {
    throw new Error("Logger is missing required method: sql");
  }
  if (!configuredLogger.warn || typeof configuredLogger.warn !== "function") {
    throw new Error("Logger is missing required method: warn");
  }

  return configuredLogger;
}

/**
 * Validate the database configuration and set defaults
 *
 * @param {Object} database
 * @param {string} db_storage
 * @param {Object} logger
 * @param {boolean} test
 * @returns {Object} Configured database instance
 * @throws Will throw an error if the database configuration is invalid
 */
function validateDatabaseConfig(database, db_storage, logger, test) {
  // Configure Database
  let configuredDatabase;
  if (!database) {
    if (test) {
      configuredDatabase = configureDatabase(logger, ":memory:");
    } else {
      if (!db_storage || typeof db_storage !== "string") {
        db_storage = "lti-toolkit.db";
      }
      configuredDatabase = configureDatabase(logger, db_storage);
    }
  } else {
    if (!(database instanceof Sequelize)) {
      throw new Error("Provided database must be an instance of Sequelize");
    }
    configuredDatabase = database;
  }
  return configuredDatabase;
}
