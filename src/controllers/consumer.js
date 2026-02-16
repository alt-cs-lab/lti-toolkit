/**
 * @file Consumer Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ConsumerController a consumer controller
 */

// Import libraries
import { nanoid } from "nanoid";
import crypto from "crypto";

class ConsumerController {
  // Private Attributes
  #ConsumerModel;
  #ConsumerKeyModel;
  #transaction;

  /**
   * Consumer Controller
   *
   * @param {Object} models the database models
   * @param {Object} transaction the database transaction function
   */
  constructor(models, transaction) {
    this.#ConsumerModel = models.Consumer;
    this.#ConsumerKeyModel = models.ConsumerKey;
    this.#transaction = transaction;
  }

  /**
   * Get all consumers
   *
   * @return {Consumer[]} all consumers in the database
   */
  async getAll() {
    const consumers = await this.#ConsumerModel.findAll();
    return consumers;
  }

  /**
   * Get a consumer by ID
   *
   * @param {number} id the ID of the consumer
   * @return {Consumer} the consumer with the given ID
   */
  async getById(id) {
    const consumer = await this.#ConsumerModel.findByPk(id);
    return consumer;
  }

  /**
   * Get a consumer by key
   *
   * @param {string} key the key of the consumer
   * @return {Consumer} the consumer with the given key
   */
  async getByKey(key) {
    const consumer = await this.#ConsumerModel.findOne({
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
    await this.#transaction(async (t) => {
      consumer = await this.#ConsumerModel.create(
        {
          name: data.name,
          key: data.key,
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
      const { publicKey, privateKey } = await this.#generateKeys(); // Generate keys for the consumer
      await this.#ConsumerKeyModel.create(
        {
          key: consumer.key,
          secret: data.secret || nanoid(),
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
    const consumer = await this.#ConsumerModel.findByPk(id);
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
    const consumer = await this.#ConsumerModel.findByPk(id);
    if (!consumer) {
      return null;
    }
    await this.#transaction(async (t) => {
      // Delete the consumer key
      await this.#ConsumerKeyModel.destroy({
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
    const consumer = await this.#ConsumerModel.findByPk(id);
    if (!consumer) {
      return null;
    }
    const consumerkey = await this.#ConsumerKeyModel.findOne({
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
   * @param {string|null} key the new key for the consumer (if null, a new key will be generated)
   * @param {string|null} secret the new secret for the consumer (if null, a new secret will be generated)
   * @return {ConsumerKey} the updated consumer key
   */
  async updateSecret(id, key = null, secret = null) {
    const consumer = await this.#ConsumerModel.findByPk(id);
    if (!consumer) {
      return null;
    }

    let consumerkey = null;

    await this.#transaction(async (t) => {
      // Remove old key and secret for the consumer
      await this.#ConsumerKeyModel.destroy({
        where: {
          key: consumer.key,
        },
        transaction: t,
      });

      // Generate new key and secret for the consumer
      const newKey = key || nanoid();
      const newSecret = secret || nanoid();
      consumer.key = newKey;
      await consumer.save({ transaction: t });

      // Generate new keys for the consumer
      const { publicKey, privateKey } = await this.#generateKeys();

      // Save the new key, secret, and keys for the consumer
      consumerkey = await this.#ConsumerKeyModel.create(
        {
          key: newKey,
          secret: newSecret,
          public: publicKey,
          private: privateKey,
        },
        { transaction: t },
      );
    });

    return consumerkey;
  }

  /**
   * Get all public keys for all consumers
   *
   * @return {Array} an array of objects containing the key and public key for each consumer
   */
  async getAllKeys() {
    const keys = await this.#ConsumerKeyModel.findAll({
      attributes: ["key", "public"],
    });
    return keys;
  }

  /**
   * Generate keys for an LTI consumer
   *
   * @return {Object} the generated keys
   */
  async #generateKeys() {
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
    return { publicKey, privateKey };
  }
}

export default ConsumerController;
