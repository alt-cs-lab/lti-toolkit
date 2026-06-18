/**
 * @file Deep Link Launch Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports DeepLinkHandler initiates an LTI 1.3 Deep Linking request to a provider
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Deep Link Launch Handler for LTI Tool Consumer
 * Builds the OIDC login form that kicks off an LTI 1.3 Deep Linking request.
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function DeepLinkHandler(req, res) {
  const providerId = req.params.id;

  // Get Provider
  const provider = await lti.controllers.providerRegistry.getById(providerId);
  if (!provider || !provider.lti13) {
    return res.status(404).send("LTI 1.3 Provider not found");
  }

  const context = {
    key: req.body.context_key,
    label: req.body.context_label,
    name: req.body.context_name,
  };

  const user = {
    key: req.body.user_key,
    email: req.body.user_email,
  };

  const launch = await lti.controllers.consumer.generateLTI13DeepLinkFormData(
    provider.key,
    provider.client_id,
    provider.deployment_id,
    provider.launch_url,
    "/provider/" + provider.id,
    context,
    user,
  );

  res.render("launch.njk", { launch });
}

export default DeepLinkHandler;
