/**
 * @file Consumers table migration
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
  await queryInterface.createTable("lti_oauth_nonces", {
    key: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    nonce: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
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

  await queryInterface.createTable("lti_consumers", {
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
    client_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    platform_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    deployment_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    keyset_url: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    token_url: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    auth_url: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tc_product: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tc_version: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tc_guid: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tc_name: {
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

  await queryInterface.createTable("lti_consumer_keys", {
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

  await queryInterface.createTable("lti_consumer_logins", {
    key: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    state: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    nonce: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    iss: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    client_id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    keyset_url: {
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
export async function down({ context: queryInterface }) {
  await queryInterface.dropTable("lti_consumer_logins");
  await queryInterface.dropTable("lti_consumer_keys");
  await queryInterface.dropTable("lti_consumers");
  await queryInterface.dropTable("lti_oauth_nonces");
}
