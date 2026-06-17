/**
 * @file Provider Delete Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderDeleteHandler deletes an existing LTI Tool Provider record
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Provider Delete Handler for LTI Tool Consumer
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ProviderDeleteHandler(req, res) {
  const providerId = req.params.id;

  const result = await lti.controllers.providerRegistry.deleteProvider(providerId);
  if (!result) {
    return res.status(404).send("Provider not found");
  }

  res.redirect("/");
}

export default ProviderDeleteHandler;
