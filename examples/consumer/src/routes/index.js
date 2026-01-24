/**
 * @file Index Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports IndexHandler LTI Tool Consumer Index Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Index Route Handler for LTI Tool Consumer
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function IndexHandler(req, res) {
  // Get list of configured tool providers
  const providers = await lti.controllers.provider.getAll();

  // Convert to JSON-friendly format
  const providerData = [];
  for (const provider of providers) {
    providerData.push({ ...provider.toJSON() });
  }

  // Render index view
  res.render("index.njk", {
    title: "LTI Tool Consumer - Index",
    domain: process.env.DOMAIN_NAME,
    providers: providerData,
  });
}

export default IndexHandler;
