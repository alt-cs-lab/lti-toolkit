/**
 * @file Configuration information for Sequelize database ORM
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports sequelize a Sequelize instance
 */

// Import libraries
import Sequelize from "sequelize";

export default function configureDatabase(logger, storage = "lti-toolkit.db") {
  // Create Sequelize instance
  return new Sequelize({
    dialect: "sqlite",
    storage: storage,
    logging: logger.sql.bind(logger),
    pool: { max: 1, idle: Infinity, maxUses: Infinity },
  });
}
