/**
 * @file Provider Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderHandler LTI Tool Provider Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Provider Handler for LTI Tool Consumer
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ProviderHandler(req, res) {
  const providerId = req.params.id;

  // Get Provider
  const provider = await lti.controllers.providerRegistry.getById(providerId);
  if (!provider) {
    return res.status(404).send("Provider not found");
  }

  // Get Secret
  const providerSecret = await lti.controllers.providerRegistry.getSecret(provider.id);

  // Formatted provider including secret and masked secret (last 4 chars)
  const providerData = provider.toJSON();
  providerData.secret = providerSecret.secret;
  providerData.maskedSecret = "••••••••" + providerSecret.secret.slice(-4);

  // Render provider view
  res.render("provider.njk", {
    title: `LTI Tool Consumer - Provider: ${provider.name}`,
    provider: providerData,
  });
}

export default ProviderHandler;
