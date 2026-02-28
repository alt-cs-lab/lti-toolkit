/**
 * @file Index tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should } from "chai";
import sinon from "sinon";
import { Sequelize } from "sequelize";

// Modify Object.prototype for BDD style assertions
should();

// Import Library
import LTIToolkit from "../index.js";
const lti = await LTIToolkit({
  domain_name: "http://localhost:3000",
  admin_email: "admin@localhost.local",
  provider: {
    handleLaunch: async function () {},
  },
  consumer: {
    postProviderGrade: async function () {},
    deployment_name: "LTI Toolkit Dev",
    deployment_id: "test-deployment-id",
  },
  test: true, // Indicate that we are in a test environment
});

/**
 * Check that timer is set properly
 */
const shouldInitializeExpiration = (state) => {
  it("should initialize expiration of old records", (done) => {
    const spy = sinon.spy();
    const interval = sinon.stub(global, "setInterval").returns({
      unref: spy,
    });
    state.lti.test.initializeExpiration();
    interval.calledOnce.should.be.true;
    interval.calledOnceWithMatch(sinon.match.func, 5 * 60 * 1000).should.be.true;
    spy.calledOnce.should.be.true;
    done();
  });
};

const shouldThrowConfigurationErrors = (config, field, expectedError, fieldName = undefined, badValue = undefined) => {
  it("should throw configuration error for field " + (fieldName ? fieldName : field), async () => {
    try {
      if (field && field.includes(".")) {
        const [parentField, childField] = field.split(".");
        await LTIToolkit({
          ...config,
          [parentField]: {
            ...config[parentField],
            [childField]: badValue,
          },
        });
        throw new Error("Configuration error was not thrown for field " + field);
      } else if (field) {
        await LTIToolkit({
          ...config,
          [field]: badValue,
        });
        throw new Error("Configuration error was not thrown for field " + field);
      } else {
        await LTIToolkit(config);
        throw new Error("Configuration error was not thrown when config is null");
      }
    } catch (error) {
      error.message.should.contain(expectedError);
    }
  });
};

const shouldSuccessfullyInitializeWithConfig = (config, message) => {
  it("should successfully initialize with valid configuration " + message, async () => {
    try {
      const instance = await LTIToolkit(config);
      instance.should.exist;
    } catch (error) {
      throw new Error("Initialization failed with valid configuration: " + error.message);
    }
  });
};

describe("Index", () => {
  const state = {};

  beforeEach(() => {
    state.lti = lti;
  });

  describe("initializeExpiration", () => {
    shouldInitializeExpiration(state);
  });

  describe("validateConfig", () => {
    const validConfig = {
      domain_name: "http://localhost:3000",
      admin_email: "admin@localhost.local",
      provider: {
        handleLaunch: async function () {},
      },
      consumer: {
        postProviderGrade: async function () {},
        deployment_name: "LTI Toolkit Dev",
        deployment_id: "test-deployment-id",
      },
    };

    // Global Configs
    shouldThrowConfigurationErrors(null, null, "Configuration object is required", "config");
    shouldThrowConfigurationErrors(validConfig, "domain_name", "A valid domain name is required in configuration");
    shouldThrowConfigurationErrors(validConfig, "admin_email", "A valid admin email is required in configuration");

    // Provider & Consumer Configs Exist
    const noProviderNoConsumerConfig = {
      domain_name: "http://localhost:3000",
      admin_email: "admin@localhost.local",
    };
    shouldThrowConfigurationErrors(
      noProviderNoConsumerConfig,
      null,
      "At least one of provider or consumer configuration is required",
      "provider/consumer",
    );
    shouldThrowConfigurationErrors(
      { ...noProviderNoConsumerConfig, provider: "string", consumer: "string" },
      "provider/consumer bad type",
      "At least one of provider or consumer configuration is required",
    );

    // Provider Config
    shouldThrowConfigurationErrors(
      validConfig,
      "provider.handleLaunch",
      "provider.handleLaunch function is required in Provider configuration",
    );
    shouldThrowConfigurationErrors(validConfig, "provider.key", "provider.key must be a string", "provider.key", 123);
    shouldThrowConfigurationErrors(
      validConfig,
      "provider.secret",
      "provider.secret must be a string",
      "provider.secret",
      123,
    );
    shouldThrowConfigurationErrors(
      validConfig,
      "provider.handleLaunch",
      "provider.handleLaunch function is required in Provider configuration",
      "provider.handleLaunch",
      "not a function",
    );
    const badProviderConfig = {
      ...validConfig,
      provider: {
        handleLaunch: () => {},
        title: {},
        description: {},
        route_prefix: {},
        icon_url: {},
        custom_params: "string",
        tool_id: {},
        privacy_level: {},
        handleDeeplink: "not a function",
        navigation: "string",
      },
    };
    shouldSuccessfullyInitializeWithConfig(badProviderConfig, "with non-function optional provider fields");

    // Consumer Config
    shouldThrowConfigurationErrors(
      validConfig,
      "consumer.postProviderGrade",
      "consumer.postProviderGrade function is required in Consumer configuration",
    );
    shouldThrowConfigurationErrors(
      validConfig,
      "consumer.deployment_name",
      "A valid deployment name is required in Consumer configuration",
      "consumer.deployment_name",
      123,
    );
    shouldThrowConfigurationErrors(
      validConfig,
      "consumer.deployment_id",
      "A valid deployment ID is required in Consumer configuration",
      "consumer.deployment_id",
      123,
    );
    shouldThrowConfigurationErrors(
      validConfig,
      "consumer.postProviderGrade",
      "consumer.postProviderGrade function is required in Consumer configuration",
      "consumer.postProviderGrade",
      "not a function",
    );
    const badConsumerConfig = {
      ...validConfig,
      consumer: {
        postProviderGrade: () => {},
        deployment_name: "LTI Toolkit Dev",
        deployment_id: "test-deployment-id",
        product_name: {},
        product_version: {},
        route_prefix: {},
      },
    };
    shouldSuccessfullyInitializeWithConfig(badConsumerConfig, "with non-function optional consumer fields");
  });

  describe("Initialize", () => {
    it("should initialize with valid provider configuration", async () => {
      try {
        const validConfig = {
          domain_name: "http://localhost:3000",
          admin_email: "admin@localhost.local",
          provider: {
            handleLaunch: async function () {},
          },
        };
        const instance = await LTIToolkit(validConfig);
        instance.should.exist;

        // Check types of return object
        instance.should.have.property("routers");
        instance.should.have.property("controllers");
        instance.routers.should.be.an("object");
        instance.routers.should.have.property("provider");
        instance.routers.provider.should.be.a("function");
        instance.controllers.should.be.an("object");
        instance.controllers.should.have.property("lti");
        instance.controllers.lti.should.be.an("object");
        instance.controllers.lti.should.have.property("provider");
        instance.controllers.lti.provider.should.be.an("object");
      } catch (error) {
        throw new Error("Initialization failed with valid configuration: " + error.message);
      }
    });

    it("should initialize with valid provider configuration and single consumer", async () => {
      try {
        const validConfig = {
          domain_name: "http://localhost:3000",
          admin_email: "admin@localhost.local",
          provider: {
            handleLaunch: async function () {},
            key: "test-provider-key",
            secret: "test-provider-secret",
          },
          test: true, // Indicate that we are in a test environment
        };
        const instance = await LTIToolkit(validConfig);
        instance.should.exist;

        // Check types of return object
        instance.should.have.property("routers");
        instance.should.have.property("controllers");
        instance.routers.should.be.an("object");
        instance.routers.should.have.property("provider");
        instance.routers.provider.should.be.a("function");
        instance.controllers.should.be.an("object");
        instance.controllers.should.have.property("consumer");
        instance.controllers.consumer.should.be.an("object");
        instance.controllers.should.have.property("lti");
        instance.controllers.lti.should.be.an("object");
        instance.controllers.lti.should.have.property("provider");
        instance.controllers.lti.provider.should.be.an("object");

        // Check that consumer exists with correct key and secret
        const consumer = await instance.controllers.consumer.getByKey("test-provider-key");
        consumer.should.exist;
        consumer.key.should.equal("test-provider-key");
        const key = await instance.controllers.consumer.getSecret(consumer.id);
        key.should.exist;
        key.key.should.equal("test-provider-key");
        key.secret.should.equal("test-provider-secret");
      } catch (error) {
        throw new Error("Initialization failed with valid configuration: " + error.message);
      }
    });

    it("should initialize with valid consumer configuration", async () => {
      try {
        const validConfig = {
          domain_name: "http://localhost:3000",
          admin_email: "admin@localhost.local",
          consumer: {
            postProviderGrade: async function () {},
            deployment_name: "LTI Toolkit Dev",
            deployment_id: "test-deployment-id",
          },
        };
        const instance = await LTIToolkit(validConfig);
        instance.should.exist;

        // Check types of return object
        instance.should.have.property("routers");
        instance.should.have.property("controllers");
        instance.routers.should.be.an("object");
        instance.routers.should.have.property("consumer");
        instance.routers.consumer.should.be.a("function");
        instance.controllers.should.be.an("object");
        instance.controllers.should.have.property("provider");
        instance.controllers.provider.should.be.an("object");
        instance.controllers.should.have.property("lti");
        instance.controllers.lti.should.be.an("object");
        instance.controllers.lti.should.have.property("consumer");
        instance.controllers.lti.consumer.should.be.an("object");
      } catch (error) {
        throw new Error("Initialization failed with valid configuration: " + error.message);
      }
    });
  });

  describe("Logger", () => {
    const throwIfLoggerMissingMethods = (config, logger, missingMethod) => {
      it("should throw an error if logger is missing method " + missingMethod, async () => {
        const badLoggerConfig = Object.assign({}, config);
        badLoggerConfig.logger = { ...logger, [missingMethod]: undefined };
        try {
          await LTIToolkit(badLoggerConfig);
          throw new Error("Should have thrown an error");
        } catch (error) {
          error.message.should.contain("Logger is missing required method: " + missingMethod);
        }

        badLoggerConfig.logger = { ...logger, [missingMethod]: "string" };
        try {
          await LTIToolkit(badLoggerConfig);
          throw new Error("Should have thrown an error");
        } catch (error) {
          error.message.should.contain("Logger is missing required method: " + missingMethod);
        }
      });
    };

    const validConfig = {
      domain_name: "http://localhost:3000",
      admin_email: "admin@localhost.local",
      provider: {
        handleLaunch: async function () {},
      },
    };

    const logger = {
      sql: () => {},
      info: () => {},
      error: () => {},
      lti: () => {},
      warn: () => {},
    };

    throwIfLoggerMissingMethods(validConfig, logger, "error");
    throwIfLoggerMissingMethods(validConfig, logger, "info");
    throwIfLoggerMissingMethods(validConfig, logger, "lti");
    throwIfLoggerMissingMethods(validConfig, logger, "sql");
    throwIfLoggerMissingMethods(validConfig, logger, "warn");

    it("should initialize successfully with a valid custom log level", async () => {
      const customLoggerConfig = {
        ...validConfig,
        log_level: "warn",
      };
      try {
        const instance = await LTIToolkit(customLoggerConfig);
        instance.should.exist;
      } catch (error) {
        throw new Error("Initialization failed with valid custom log level: " + error.message);
      }
    });
  });

  describe("Database", () => {
    it("should initialize in-memory database when test flag is set", async () => {
      try {
        const instance = await LTIToolkit({
          domain_name: "http://localhost:3000",
          admin_email: "admin@localhost.local",
          test: true,
          provider: {
            handleLaunch: async function () {},
          },
        });
        instance.should.exist;
        instance.should.have.property("test");
        instance.test.should.have.property("initializeExpiration");
      } catch (error) {
        throw new Error("Failed to initialize in-memory database: " + error.message);
      }
    });

    it("should initialize database with provided configuration", async () => {
      try {
        const instance = await LTIToolkit({
          domain_name: "http://localhost:3000",
          admin_email: "admin@localhost.local",
          db_storage: ":memory:",
          provider: {
            handleLaunch: async function () {},
          },
        });
        instance.should.exist;
      } catch (error) {
        throw new Error("Failed to initialize database with provided configuration: " + error.message);
      }
    });

    it("should throw an error if database initialization fails", async () => {
      try {
        await LTIToolkit({
          domain_name: "http://localhost:3000",
          admin_email: "admin@localhost.local",
          database: "invalid_database_config",
          provider: {
            handleLaunch: async function () {},
          },
        });
        throw new Error("Should have thrown an error");
      } catch (error) {
        error.message.should.contain("Provided database must be an instance of Sequelize");
      }
    });

    it("should accept a custom Sequelize instance", async () => {
      try {
        const sequelizeInstance = new Sequelize("sqlite::memory:");
        const instance = await LTIToolkit({
          domain_name: "http://localhost:3000",
          admin_email: "admin@localhost.local",
          database: sequelizeInstance,
          provider: {
            handleLaunch: async function () {},
          },
        });
        instance.should.exist;
      } catch (error) {
        throw new Error("Failed to initialize with custom Sequelize instance: " + error.message);
      }
    });
  });
});
