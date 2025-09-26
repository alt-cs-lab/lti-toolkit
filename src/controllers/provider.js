/**
 * @file Provider Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderController a provider controller
 */

class ProviderController {
  /**
   * Provider Controller
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
   * Get all providers
   *
   * @return {Provider[]} all providers in the database
   */
  async getAll() {
    const providers = await this.models.Provider.findAll({
      attributes: { exclude: ["section_id"] },
    });
    return providers;
  }

  /**
   * Get the secret for an LTI provider
   *
   * @param {number} id the ID of the provider
   * @return {ProviderKey} the updated provider key
   */
  async getSecret(id) {
    const provider = await this.models.Provider.findByPk(id);
    if (!provider) {
      return null;
    }
    const providerkey = await this.models.ProviderKey.findOne({
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
    await this.database.transaction(async (t) => {
      provider = await this.models.Provider.findByPk(id);
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
      // If the key has changed, update the provider key and secret
      if (oldKey !== data.key) {
        await this.models.ProviderKey.update(
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
    const provider = await this.models.Provider.create({
      name: data.name,
      lti13: data.lti13 || false,
      key: data.key,
      launch_url: data.launch_url,
      domain: data.domain,
      custom: data.custom,
      use_section: data.use_section || false,
    });
    // Generate keys for the provider
    await this.models.ProviderKey.create({
      key: provider.key,
      secret: data.secret,
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
    const provider = await this.models.Provider.findByPk(id);
    if (!provider) {
      return null;
    }
    await this.database.transaction(async (t) => {
      // Delete the provider key
      await this.models.ProviderKey.destroy({
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
