/**
 * @file Configuration information for Umzug migration engine
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports umzug an Umzug instance
 */

// Import Libraries
import { Umzug, SequelizeStorage } from "umzug";
const __dirname = import.meta.dirname;

export default function configureMigrations(database, logger) {
  // Create Umzug instance
  return new Umzug({
    migrations: { glob: ["../migrations/*.js", { cwd: __dirname }] },
    context: database.getQueryInterface(),
    storage: new SequelizeStorage({
      sequelize: database,
      modelName: "lti_migrations",
    }),
    logger: logger,
  });
}
