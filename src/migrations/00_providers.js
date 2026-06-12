/**
 * @file Providers table migration
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports up the Up migration
 * @exports down the Down migration
 */

// Import Libraries
import { Sequelize } from "sequelize";

/**
 * Apply the migration
 *
 * @param {queryInterface} context the database context to use
 */
export async function up({ context: queryInterface }) {
  await queryInterface.createTable("lti_providers", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    lti13: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    key: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    launch_url: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    domain: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    custom: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    use_section: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    client_id: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    },
    deployment_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    keyset_url: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    auth_url: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    redirect_urls: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    scopes: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    claims: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await queryInterface.createTable("lti_provider_keys", {
    key: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    secret: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    public: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    private: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  });

  await queryInterface.createTable("lti_provider_logins", {
    client_id: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    login_hint: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    data: {
      type: Sequelize.JSON,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await queryInterface.createTable("lti_provider_registrations", {
    token: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    url: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
}

/**
 * Roll back the migration
 *
 * @param {queryInterface} context the database context to use
 */
/* c8 ignore next 6 */
export async function down({ context: queryInterface }) {
  await queryInterface.dropTable("lti_provider_registrations");
  await queryInterface.dropTable("lti_provider_logins");
  await queryInterface.dropTable("lti_provider_keys");
  await queryInterface.dropTable("lti_providers");
}
