/**
 * @file LTI Provider Configuration Handler
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderConfigHandler LTI Provider Configuration Launch Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Tool Provider Configuration
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ProviderConfigHandler(req, res) {
  let error = null;
  let message = null;

  // Get Form Data
  const data = {
    name: req.body.name,
    // LTI 1.3 is not supported
    lti13: false,
    key: req.body.key,
    secret: req.body.secret,
    launch_url: req.body.launch_url,
    domain: req.body.domain,
    // custom values are unsupported in this example
    custom: "",
    // use_section is optional
    use_section: req.body.use_section === "true",
  };

  // Check if any required fields are missing
  const requiredFields = ["name", "key", "secret", "launch_url", "domain"];
  const missingFields = requiredFields.filter(
    (field) => !data[field] || data[field].trim() === "",
  );
  if (missingFields.length > 0) {
    error = "Missing required fields: " + missingFields.join(", ");
  } else {
    // Create Provider
    try {
      await lti.controllers.provider.createProvider(data);
    } catch (err) {
      error = "Failed to create provider: " + err.message;
    }
    if (!error) {
      message = "Successfully created provider.";
    }
  }

  // Get list of configured tool providers
  const providers = await lti.controllers.provider.getAll();

  // Get secrets for each provider and convert to JSON-friendly format
  const providerData = [];
  for (const provider of providers) {
    const providerSecret = await lti.controllers.provider.getSecret(
      provider.id,
    );
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

export default ProviderConfigHandler;
