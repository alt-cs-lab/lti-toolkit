/**
 * @file Provider Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderController a provider controller
 */

class ProviderController {
  // Private Attributes
  #ProviderModel;
  #ProviderKeyModel;
  #transaction;

  /**
   * Provider Controller
   * @param {Object} models the database models
   * @param {Object} transaction the database transaction function
   */
  constructor(models, transaction){
    this.#ProviderModel = models.Provider;
    this.#ProviderKeyModel = models.ProviderKey;
    this.#transaction = transaction;
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
   * Update an existing provider
   *
   * @param {number} id the ID of the provider to update
   * @param {Object} data the provider data to update
   * @returns {Provider} the updated provider
   */
  async updateProvider(id, data) {
    let provider = null;
    await this.#transaction(async (t) => {
      provider = await this.#ProviderModel.findByPk(id);
      if (!provider) {
        return null;
      }
      const oldKey = provider.key;
      await provider.update(
        {
          name: data.name,
          lti13: data.lti13 || false,
          key: data.key,
          launch_url: data.launch_url,
          domain: data.domain,
          custom: data.custom,
          use_section: data.use_section || false,
        },
        { transaction: t },
      );
      // If the key or secret has changed, update the provider key and secret
      if (oldKey !== data.key || data.secret) {
        await this.#ProviderKeyModel.update(
          {
            key: data.key,
            secret: data.secret,
          },
          {
            where: {
              key: oldKey,
            },
            transaction: t,
          },
        );
      }
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
    await this.#transaction(async (t) => {
      provider = await this.#ProviderModel.create({
        name: data.name,
        lti13: data.lti13 || false,
        key: data.key,
        launch_url: data.launch_url,
        domain: data.domain,
        custom: data.custom,
        use_section: data.use_section || false,
      }, { transaction: t });
      // Generate keys for the provider
      await this.#ProviderKeyModel.create({
        key: provider.key,
        secret: data.secret,
      }, { transaction: t });
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
    await this.#transaction(async (t) => {
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
}

export default ProviderController;
