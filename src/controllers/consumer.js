/**
 * @file Consumer Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ConsumerController a consumer controller
 */

// Import libraries
import { nanoid } from "nanoid";
import crypto from "crypto";

class ConsumerController {
  /**
   * Consumer Controller
   *
   * @param {Object} models the database models
   * @param {Object} logger the logger instance
   * @param {Object} database the database instance
   */
  constructor(models, logger, database) {
    this.models = models;
    this.logger = logger;
    this.database = database;
  }

  /**
   * Get all consumers
   *
   * @return {Consumer[]} all consumers in the database
   */
  async getAll() {
    const consumers = await this.models.Consumer.findAll();
    return consumers;
  }

  /**
   * Get a consumer by ID
   *
   * @param {number} id the ID of the consumer
   * @return {Consumer} the consumer with the given ID
   */
  async getById(id) {
    const consumer = await this.models.Consumer.findByPk(id);
    return consumer;
  }

  /**
   * Get a consumer by key
   *
   * @param {string} key the key of the consumer
   * @return {Consumer} the consumer with the given key
   */
  async getByKey(key) {
    const consumer = await this.models.Consumer.findOne({
      where: {
        key: key,
      },
    });
    return consumer;
  }

  /**
   * Create a new consumer
   *
   * @param {Object} data the consumer data to create
   * @returns {Consumer} the created consumer
   */
  async createConsumer(data) {
    let consumer = null;
    await this.database.transaction(async (t) => {
      consumer = await this.models.Consumer.create(
        {
          name: data.name,
          lti13: data.lti13,
          client_id: data.client_id,
          platform_id: data.platform_id,
          deployment_id: data.deployment_id,
          keyset_url: data.keyset_url,
          token_url: data.token_url,
          auth_url: data.auth_url,
        },
        { transaction: t },
      );
      let publicKey = null;
      let privateKey = null;
      // Generate keys for the consumer
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
      await this.models.ConsumerKey.create(
        {
          key: consumer.key,
          secret: nanoid(),
          public: publicKey,
          private: privateKey,
        },
        { transaction: t },
      );
    });
    return consumer;
  }

  /**
   * Update an existing consumer
   *
   * @param {number} id the ID of the consumer to update
   * @param {Object} data the consumer data to update
   * @returns {Consumer} the updated consumer
   */
  async updateConsumer(id, data) {
    const consumer = await this.models.Consumer.findByPk(id);
    if (!consumer) {
      return null;
    }
    await consumer.update({
      name: data.name,
      lti13: data.lti13,
      client_id: data.client_id,
      platform_id: data.platform_id,
      deployment_id: data.deployment_id,
      keyset_url: data.keyset_url,
      token_url: data.token_url,
      auth_url: data.auth_url,
    });
    return consumer;
  }

  /**
   * Delete a consumer
   *
   * @param {number} id the ID of the consumer to delete
   * @returns {boolean} true if the consumer was deleted, false otherwise
   */
  async deleteConsumer(id) {
    const consumer = await this.models.Consumer.findByPk(id);
    if (!consumer) {
      return null;
    }
    await this.database.transaction(async (t) => {
      // Delete the consumer key
      await this.models.ConsumerKey.destroy({
        where: {
          key: consumer.key,
        },
        transaction: t,
      });
      // Delete the consumer
      await consumer.destroy({ transaction: t });
    });
    return true;
  }

  /**
   * Get the secret for an LTI consumer
   *
   * @param {number} id the ID of the consumer
   * @return {ConsumerKey} the updated consumer key
   */
  async getSecret(id) {
    const consumer = await this.models.Consumer.findByPk(id);
    if (!consumer) {
      return null;
    }
    const consumerkey = await this.models.ConsumerKey.findOne({
      attributes: ["key", "secret"],
      where: {
        key: consumer.key,
      },
    });
    if (!consumerkey) {
      return null;
    }
    return consumerkey;
  }

  /**
   * Update the secret for an LTI consumer
   *
   * @param {number} id the ID of the consumer
   * @return {ConsumerKey} the updated consumer key
   */
  async updateSecret(id) {
    const consumer = await this.models.Consumer.findByPk(id);
    if (!consumer) {
      return null;
    }
    // Generate new keys
    const newKey = nanoid();
    const newSecret = nanoid();

    let publicKey = null;
    let privateKey = null;
    // Generate keys for the consumer
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

    await this.models.ConsumerKey.destroy({
      where: {
        key: consumer.key,
      },
    });

    consumer.key = newKey;
    await consumer.save();

    const consumerkey = await this.models.ConsumerKey.create({
      key: newKey,
      secret: newSecret,
      public: publicKey,
      private: privateKey,
    });

    return consumerkey;
  }
}

export default ConsumerController;
