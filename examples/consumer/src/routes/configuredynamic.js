/**
 * @file LTI Provider Dynamic Registration Handler
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderConfigDynamicHandler LTI Provider Dynamic Registration Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Tool Provider Configuration
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ProviderConfigDynamicHandler(req, res) {
  let error = null;
  let message = null;

  // Get Form Data
  const data = {
    url: req.body.url,
  };

  if (!error) {
    // Check if any required fields are missing
    const requiredFields = ["url"];
    const missingFields = requiredFields.filter((field) => !data[field] || data[field].trim() === "");
    if (missingFields.length > 0) {
      error = "Missing required fields: " + missingFields.join(", ");
    } else {
      // Create Provider
      try {
        await lti.controllers.consumer.lti13dynamicregistration(data.url);
      } catch (err) {
        error = "Failed to create provider: " + err.message;
      }
      if (!error) {
        message = "Successfully created provider.";
      }
    }
  }

  // Get list of configured tool providers
  const providers = await lti.controllers.providerRegistry.getAll();

  // Get secrets for each provider and convert to JSON-friendly format
  const providerData = [];
  for (const provider of providers) {
    const providerSecret = await lti.controllers.providerRegistry.getSecret(provider.id);
    providerData.push({ ...provider.toJSON(), secret: providerSecret });
  }

  // Render index view
  res.render("index.njk", {
    title: "LTI Tool Consumer - Index",
    domain: process.env.DOMAIN_NAME,
    providers: providerData,
    error,
    message,
  });
}

export default ProviderConfigDynamicHandler;
