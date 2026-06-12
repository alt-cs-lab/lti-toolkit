/**
 * @file Provider Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderController a provider controller
 */

// Import libraries
import { nanoid } from "nanoid";
import crypto from "crypto";

class ProviderController {
  // Private Attributes
  #ProviderModel;
  #ProviderKeyModel;
  #database;

  /**
   * Provider Controller
   * @param {Object} models the database models
   * @param {Object} database the database instance
   */
  constructor(models, database) {
    this.#ProviderModel = models.Provider;
    this.#ProviderKeyModel = models.ProviderKey;
    this.#database = database;
  }

  /**
   * Get all providers
   *
   * @return {Provider[]} all providers in the database
   */
  async getAll() {
    const providers = await this.#ProviderModel.findAll();
    return providers;
  }

  /**
   * Get a provider by ID
   *
   * @param {number} id the ID of the provider
   * @return {Provider} the provider with the given ID
   */
  async getById(id) {
    const provider = await this.#ProviderModel.findByPk(id);
    return provider;
  }

  /**
   * Get a provider by key
   *
   * @param {string} key the key of the provider
   * @return {Provider} the provider with the given key
   */
  async getByKey(key) {
    const provider = await this.#ProviderModel.findOne({
      where: {
        key: key,
      },
    });
    return provider;
  }

  /**
   * Get a provider by name
   *
   * @param {string} name the name of the provider
   * @return {Provider} the provider with the given name
   */
  async getByName(name) {
    const provider = await this.#ProviderModel.findOne({
      where: {
        name: name,
      },
    });
    return provider;
  }

  /**
   * Create a new provider
   *
   * @param {Object} data the provider data to create
   * @returns {Provider} the created provider
   */
  async createProvider(data) {
    let provider = null;
    await this.#database.transaction(async (t) => {
      if (!data.key) {
        data.key = nanoid();
      }
      if (!data.secret) {
        data.secret = nanoid();
      }
      provider = await this.#ProviderModel.create(
        {
          name: data.name,
          lti13: data.lti13 || false,
          key: data.key,
          launch_url: data.launch_url,
          domain: data.domain,
          custom: data.custom,
          use_section: data.use_section || false,
          keyset_url: data.keyset_url,
          auth_url: data.auth_url,
          redirect_urls: data.redirect_urls,
          scopes: data.scopes,
          claims: data.claims,
          // client_id and deployment_id will be generated automatically by the model hooks for LTI 1.3 providers
        },
        { transaction: t },
      );
      const { publicKey, privateKey } = await this.#generateKeys(); // Generate keys for the consumer// Generate keys for the provider
      await this.#ProviderKeyModel.create(
        {
          key: provider.key,
          secret: data.secret,
          public: publicKey,
          private: privateKey,
        },
        { transaction: t },
      );
    });
    return provider;
  }

  /**
   * Update an existing provider
   *
   * @param {number} id the ID of the provider to update
   * @param {Object} data the provider data to update
   * @returns {Provider} the updated provider
   */
  async updateProvider(id, data) {
    const provider = await this.#ProviderModel.findByPk(id);
    if (!provider) {
      return null;
    }
    await provider.update({
      name: data.name,
      lti13: data.lti13 || false,
      key: data.key,
      launch_url: data.launch_url,
      domain: data.domain,
      custom: data.custom,
      use_section: data.use_section || false,
      keyset_url: data.keyset_url,
      auth_url: data.auth_url,
      redirect_urls: data.redirect_urls,
      scopes: data.scopes,
      claims: data.claims,
    });
    return provider;
  }

  /**
   * Delete a provider
   *
   * @param {number} id the ID of the provider to delete
   * @returns {boolean} true if the provider was deleted, false otherwise
   */
  async deleteProvider(id) {
    const provider = await this.#ProviderModel.findByPk(id);
    if (!provider) {
      return null;
    }
    await this.#database.transaction(async (t) => {
      // Delete the provider key
      await this.#ProviderKeyModel.destroy({
        where: {
          key: provider.key,
        },
        transaction: t,
      });
      // Delete the provider
      await provider.destroy({ transaction: t });
    });
    return true;
  }

  /**
   * Get the secret for an LTI provider
   *
   * @param {number} id the ID of the provider
   * @return {ProviderKey} the updated provider key
   */
  async getSecret(id) {
    const provider = await this.#ProviderModel.findByPk(id);
    if (!provider) {
      return null;
    }
    const providerkey = await this.#ProviderKeyModel.findOne({
      attributes: ["key", "secret"],
      where: {
        key: provider.key,
      },
    });
    if (!providerkey) {
      return null;
    }
    return providerkey;
  }

  /**
   * Update the secret for an LTI provider
   *
   * @param {number} id the ID of the provider
   * @param {string|null} key the new key for the provider (if null, a new key will be generated)
   * @param {string|null} secret the new secret for the provider (if null, a new secret will be generated)
   * @return {ProviderKey} the updated provider key
   */
  async updateSecret(id, key = null, secret = null) {
    const provider = await this.#ProviderModel.findByPk(id);
    if (!provider) {
      return null;
    }

    let providerkey = null;

    await this.#database.transaction(async (t) => {
      // Remove old key and secret for the provider
      await this.#ProviderKeyModel.destroy({
        where: {
          key: provider.key,
        },
        transaction: t,
      });

      // Generate new key and secret for the provider
      const newKey = key || nanoid();
      const newSecret = secret || nanoid();
      provider.key = newKey;
      await provider.save({ transaction: t });

      // Generate new keys for the provider
      const { publicKey, privateKey } = await this.#generateKeys();

      // Save the new key, secret, and keys for the provider
      providerkey = await this.#ProviderKeyModel.create(
        {
          key: newKey,
          secret: newSecret,
          public: publicKey,
          private: privateKey,
        },
        { transaction: t },
      );
    });

    return providerkey;
  }

  /**
   * Get all public keys for all providers
   *
   * @return {Array} an array of objects containing the key and public key for each provider
   */
  async getAllKeys() {
    const keys = await this.#ProviderKeyModel.findAll({
      attributes: ["key", "public"],
    });
    return keys;
  }

  /**
   * Generate keys for an LTI provider
   *
   * @return {Object} the generated keys
   */
  async #generateKeys() {
    let publicKey;
    let privateKey;
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

export default ProviderController;
