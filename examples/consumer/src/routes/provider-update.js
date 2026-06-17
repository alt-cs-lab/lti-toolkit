/**
 * @file Provider Update Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderUpdateHandler updates an existing LTI Tool Provider record
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Provider Update Handler for LTI Tool Consumer
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ProviderUpdateHandler(req, res) {
  const providerId = req.params.id;

  // Get Provider
  const provider = await lti.controllers.providerRegistry.getById(providerId);
  if (!provider) {
    return res.status(404).send("Provider not found");
  }

  let error = null;

  const data = {
    name: req.body.name,
    launch_url: req.body.launch_url,
    domain: req.body.domain,
    custom: req.body.custom || null,
    lti13: provider.lti13,
    key: provider.key,
    use_section: provider.use_section,
    keyset_url: provider.keyset_url,
    auth_url: provider.auth_url,
    redirect_urls: provider.redirect_urls,
    scopes: provider.scopes,
    claims: provider.claims,
  };

  const requiredFields = ["name", "launch_url", "domain"];
  const missingFields = requiredFields.filter((f) => !data[f] || data[f].trim() === "");
  if (missingFields.length > 0) {
    error = "Missing required fields: " + missingFields.join(", ");
  } else {
    try {
      const result = await lti.controllers.providerRegistry.updateProvider(providerId, data);
      if (!result) {
        throw new Error("Provider not found");
      }
    } catch (err) {
      error = "Failed to update provider: " + err.message;
    }
  }

  // Reload provider after update
  const updatedProvider = await lti.controllers.providerRegistry.getById(providerId);
  const providerSecret = await lti.controllers.providerRegistry.getSecret(updatedProvider.id);
  const providerData = updatedProvider.toJSON();
  providerData.secret = providerSecret.secret;
  providerData.maskedSecret = "••••••••" + providerSecret.secret.slice(-4);

  res.render("provider.njk", {
    title: `LTI Tool Consumer - Provider: ${providerData.name}`,
    provider: providerData,
    error: error,
    message: error ? null : "Provider updated successfully.",
  });
}

export default ProviderUpdateHandler;
