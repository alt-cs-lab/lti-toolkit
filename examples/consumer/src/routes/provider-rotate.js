/**
 * @file Provider Rotate Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderRotateHandler rotates the secret/key pair for an existing LTI Tool Provider
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Provider Rotate Handler for LTI Tool Consumer
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ProviderRotateHandler(req, res) {
  const providerId = req.params.id;

  let error = null;

  try {
    const result = await lti.controllers.providerRegistry.updateSecret(providerId);
    if (!result) {
      return res.status(404).send("Provider not found");
    }
  } catch (err) {
    error = "Failed to rotate secret: " + err.message;
  }

  // Reload provider with new secret
  const provider = await lti.controllers.providerRegistry.getById(providerId);
  const providerSecret = await lti.controllers.providerRegistry.getSecret(provider.id);
  const providerData = provider.toJSON();
  providerData.secret = providerSecret.secret;
  providerData.maskedSecret = "••••••••" + providerSecret.secret.slice(-4);

  res.render("provider.njk", {
    title: `LTI Tool Consumer - Provider: ${providerData.name}`,
    provider: providerData,
    error: error,
    message: error ? null : "Secret and key pair rotated successfully.",
  });
}

export default ProviderRotateHandler;
