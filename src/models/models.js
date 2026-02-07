/**
 * @file Database models for LTI toolkit
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Import Library
import { Op } from "sequelize";
import { nanoid } from "nanoid";

// Import Schemas
import {
  ConsumerSchema,
  ConsumerKeySchema,
  ConsumerLoginSchema,
  OauthNonceSchema,
  ProviderSchema,
  ProviderKeySchema,
} from "./schemas.js";

export default function configureModels(database, logger) {
  // Create OauthNonce Model
  const OauthNonce = database.define(
    // Model Name
    "OauthNonce",
    // Schema
    OauthNonceSchema,
    // Other options
    {
      tableName: "lti_oauth_nonces",
    },
  );

  // Create Consumer Model
  const Consumer = database.define(
    // Model Name
    "Consumer",
    // Schema
    ConsumerSchema,
    // Other options
    {
      tableName: "lti_consumers",
    },
  );

  // Create Consumer Key Model
  const ConsumerKey = database.define(
    // Model Name
    "ConsumerKey",
    // Schema
    ConsumerKeySchema,
    // Other options
    {
      tableName: "lti_consumer_keys",
      timestamps: false,
    },
  );

  // Create Consumer Login Model
  const ConsumerLogin = database.define(
    // Model Name
    "ConsumerLogin",
    // Schema
    ConsumerLoginSchema,
    // Other options
    {
      tableName: "lti_consumer_logins",
    },
  );

  // Create Provider Model
  const Provider = database.define(
    // Model Name
    "Provider",
    // Schema
    ProviderSchema,
    // Other options
    {
      tableName: "lti_providers",
    },
  );

  // Create ProviderKey Model
  const ProviderKey = database.define(
    // Model Name
    "ProviderKey",
    // Schema
    ProviderKeySchema,
    // Other options
    {
      tableName: "lti_provider_keys",
      timestamps: false,
      underscored: true,
    },
  );

  Consumer.beforeValidate((consumer) => {
    // Generate a unique key for the consumer
    if (consumer.isNewRecord && !consumer.key) {
      consumer.setDataValue("key", nanoid());
    }
  });

  // Expiration Interval
  const expireAfter = 15 * 60 * 1000; // 15 minutes
  const checkExpire = 5 * 60 * 1000; // 5 minutess

  function clearExpired() {
    try {
      OauthNonce.destroy({
        where: { createdAt: { [Op.lte]: new Date(Date.now() - expireAfter) } },
      }).then((count) => {
        logger.lti("Removed " + count + " Expired OAuth Nonces");
      });
      ConsumerLogin.destroy({
        where: { createdAt: { [Op.lte]: new Date(Date.now() - expireAfter) } },
      }).then((count) => {
        logger.lti("Removed " + count + " Expired Consumer Logins");
      });
      /* c8 ignore next 4 */
    } catch (error) {
      logger.error("Error Expiring Old OAuth Nonces & Login Sessions");
      logger.error(error);
    }
  }

  function initializeExpiration() {
    logger.info("LTI Session Expiration Enabled!");
    const expirationInterval = setInterval(clearExpired, checkExpire);
    // allow to terminate the node process even if this interval is still running
    expirationInterval.unref();
  }

  return {
    models: {
      OauthNonce,
      Consumer,
      ConsumerKey,
      ConsumerLogin,
      Provider,
      ProviderKey,
    },
    initializeExpiration,
  };
}
