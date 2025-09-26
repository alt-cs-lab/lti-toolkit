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
 * @param {Object} [config.logger] - Optional logger object (defaults to built-in logger)
 * @param {string} [config.log_level] - Optional log level (defaults to "info", use "error" for production)
 * @param {Object} [config.database] - Optional Sequelize database instance (defaults to built-in SQLite database)
 * @param {Function} [config.handleLaunch] - Required function to handle launch requests
 * @param {Function} [config.postProviderGrade] - Required function to handle posting grades to the provider
 * @param {Object} [config.vars] - Required object containing environment variables
 * @param {string} [config.vars.domain_name] - Domain name of the application (e.g., "example.com")
 * @param {string} [config.vars.admin_email] - Admin email address (e.g., "admin@example.com")
 * @param {string} [config.vars.deployment_name] - Deployment name (e.g., "My LTI Tool")
 * @param {string} [config.vars.deployment_id] - Deployment ID (e.g., "deployment-12345")
 * @param {boolean} [config.test] - Optional flag to indicate if running in test mode (defaults to false)
 * @returns {Promise<Object>} - Returns a promise that resolves to an object containing the models and routers
 */
export default async function LtiToolkit(config) {
  if (!config) {
    throw new Error("Configuration object is required");
  }
  if (typeof config.handleLaunch !== "function") {
    throw new Error("handleLaunch function is required in configuration");
  }
  if (typeof config.postProviderGrade !== "function") {
    throw new Error("postProviderGrade function is required in configuration");
  }

  // Check for variables
  if (!config.vars) {
    throw new Error("A vars object is required in configuration");
  }
  if (!config.vars.domain_name || typeof config.vars.domain_name !== "string") {
    throw new Error("A valid domain name is required in configuration");
  }
  if (!config.vars.admin_email || typeof config.vars.admin_email !== "string") {
    throw new Error("A valid admin email is required in configuration");
  }
  if (
    !config.vars.deployment_name ||
    typeof config.vars.deployment_name !== "string"
  ) {
    throw new Error("A valid deployment name is required in configuration");
  }
  if (
    !config.vars.deployment_id ||
    typeof config.vars.deployment_id !== "string"
  ) {
    throw new Error("A valid deployment ID is required in configuration");
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
      config.database = configureDatabase(config.logger);
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

  // Setup Utilities
  const lti10 = new LTI10Utils(modelConfig.models, config.logger, config.vars);
  const lti13 = new LTI13Utils(modelConfig.models, config.logger, config.vars);

  // Setup Controllers
  const LTIControllerInstance = new LTIToolkitController(
    config.handleLaunch,
    config.postProviderGrade,
    modelConfig.models,
    config.logger,
    lti10,
    lti13,
    config.vars,
  );
  const ProviderControllerInstance = new ProviderController(
    modelConfig.models,
    config.logger,
    config.database,
  );
  const ConsumerControllerInstance = new ConsumerController(
    modelConfig.models,
    config.logger,
    config.database,
  );

  // Setup routes
  const providerRouter = await setupProviderRoutes(
    LTIControllerInstance,
    config.logger,
  );
  const consumerRouter = await setupConsumerRoutes(
    LTIControllerInstance,
    config.logger,
  );

  return {
    routers: {
      provider: providerRouter,
      consumer: consumerRouter,
    },
    controllers: {
      lti: LTIControllerInstance,
      provider: ProviderControllerInstance,
      consumer: ConsumerControllerInstance,
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
}
