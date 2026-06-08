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
  await Promise.all([
    queryInterface.addColumn(
      "lti_providers",
      "client_id",
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
    queryInterface.addColumn(
      "lti_providers",
      "deployment_id",
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
    queryInterface.addColumn(
      "lti_providers",
      "keyset_url", 
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
    queryInterface.addColumn(
      "lti_providers",
      "token_url", 
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
    queryInterface.addColumn(
      "lti_providers",
      "auth_url", 
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
    queryInterface.addColumn(
      "lti_providers",
      "redirect_urls", 
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
    queryInterface.addColumn(
      "lti_providers",
      "scopes", 
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
    queryInterface.addColumn(
      "lti_providers",
      "claims", 
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
  ]);

  await Promise.all([
    queryInterface.addColumn(
      "lti_provider_keys",
      "public", 
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
    queryInterface.addColumn(
      "lti_provider_keys",
      "private", 
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    ),
  ]);

  await queryInterface.createTable("lti_provider_logins", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    client_id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    login_hint: {
      type: Sequelize.STRING,
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
}

/**
 * Roll back the migration
 *
 * @param {queryInterface} context the database context to use
 */
/* c8 ignore next 4 */
export async function down({ context: queryInterface }) {
  await queryInterface.dropTable("lti_provider_logins");

  await Promise.all([
    queryInterface.removeColumn("lti_provider_keys", "public"),
    queryInterface.removeColumn("lti_provider_keys", "private"),
  ]);
  
  await Promise.all([
    queryInterface.removeColumn("lti_providers", "client_id"),
    queryInterface.removeColumn("lti_providers", "deployment_id"),
    queryInterface.removeColumn("lti_providers", "keyset_url"),
    queryInterface.removeColumn("lti_providers", "token_url"),
    queryInterface.removeColumn("lti_providers", "auth_url"),
    queryInterface.removeColumn("lti_providers", "redirect_urls"),
    queryInterface.removeColumn("lti_providers", "scopes"),
    queryInterface.removeColumn("lti_providers", "claims"),
  ]);

}