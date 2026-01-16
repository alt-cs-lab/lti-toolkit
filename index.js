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
 * @param {Object|None} [config.logger] - Optional logger object (defaults to built-in logger)
 * @param {string|None} [config.log_level] - Optional log level (defaults to "info", use "warn" or "error" for production)
 * @param {Object|None} [config.database] - Optional Sequelize database instance (defaults to built-in SQLite database)
 * @param {String|None} [config.db_storage] - Optional storage location for SQLite database (defaults to "lti-toolkit.db")
 * @param {Object|None} [config.provider] - LTI Provider Configuration
 * @param {Function} [config.provider.handleLaunch] - Required function to handle launch requests
 * @param {string|None} [config.provider.key] - LTI 1.0 Key for Single Provider Setup
 * @param {string|None} [config.provider.secret] - LTI 1.0 Secret for Single Provider Setup
 * @param {Object|None} [config.consumer] - LTI Consumer Configuration
 * @param {Function} [config.consumer.postProviderGrade] - Required function to handle posting grades to the provider
 * @param {string} [config.consumer.admin_email] - Admin email address (e.g., "admin@example.com")
 * @param {string} [config.consumer.deployment_name] - Deployment name (e.g., "My LTI Tool")
 * @param {string} [config.consumer.deployment_id] - Deployment ID (e.g., "deployment-12345")
 * @param {boolean|None} [config.test] - Optional flag to indicate if running in test mode (defaults to false)
 * @returns {Promise<Object>} - Returns a promise that resolves to an object containing the models and routers
 */
export default async function LtiToolkit(config) {
  if (!config) {
    throw new Error("Configuration object is required");
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
      !config.consumer.admin_email ||
      typeof config.consumer.admin_email !== "string"
    ) {
      throw new Error(
        "A valid admin email is required in Consumer configuration",
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
  } else {
    config.consumer = null;
  }
  if (!config.domain_name || typeof config.domain_name !== "string") {
    throw new Error("A valid domain name is required in configuration");
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
    const key = {
      key: config.provider.key,
      secret: config.provider.secret,
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

  // Setup Controllers
  const LTIControllerInstance = new LTIToolkitController(
    config.provider,
    config.consumer,
    modelConfig.models,
    config.logger,
    lti10,
    lti13,
    config.domain_name,
  );

  // Build return object
  const returnObj = {
    routers: {},
    controllers: {
      lti: LTIControllerInstance,
    },
    models: modelConfig.models,
    test: {
      // Expose for testing
      initializeExpiration: modelConfig.initializeExpiration,
      db: config.database,
      lti10: lti10,
      lti13: lti13,
    },
  };

  // Add Provider and Consumer if configured
  if (config.provider) {
    const ProviderControllerInstance = new ProviderController(
      modelConfig.models,
      config.logger,
      config.database,
    );
    returnObj.controllers.provider = ProviderControllerInstance;
    const providerRouter = await setupProviderRoutes(
      LTIControllerInstance,
      config.logger,
    );
    returnObj.routers.provider = providerRouter;
  }
  if (config.consumer) {
    const ConsumerControllerInstance = new ConsumerController(
      modelConfig.models,
      config.logger,
      config.database,
    );
    returnObj.controllers.consumer = ConsumerControllerInstance;
    const consumerRouter = await setupConsumerRoutes(
      LTIControllerInstance,
      config.logger,
    );
    returnObj.routers.consumer = consumerRouter;
  }

  return returnObj;
}
