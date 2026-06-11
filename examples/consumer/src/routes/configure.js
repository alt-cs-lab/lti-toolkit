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
    lti13: req.body.lti13 === "true",
    key: req.body.key,
    secret: req.body.secret,
    launch_url: req.body.launch_url,
    domain: req.body.domain,
    custom: "",
    // use_section is optional
    use_section: req.body.use_section === "true",
    // LTI 1.3 fields (optional)
    keyset_url: req.body.keyset_url,
    auth_url: req.body.auth_url,
    redirect_urls: req.body.redirect_urls,
    scopes: req.body.scopes,
    claims: req.body.claims,
  };

  // Handle Custom Parameters
  if (req.body.custom) {
    try {
      // Parse custom parameters as JSON to check format
      const customParams = JSON.parse("{" + req.body.custom + "}");
      // Convert custom parameters to string format for storage
      data.custom = JSON.stringify(customParams);
    } catch (err) {
      error = "Invalid custom parameters: " + err.message;
    }
  }

  // Handle Redirect URLs (convert from comma-separated string to JSON array)
  if (data.redirect_urls) {
    try {
      const redirectUrls = data.redirect_urls.split(",").map((url) => url.trim());
      data.redirect_urls = JSON.stringify(redirectUrls);
    } catch (err) {
      error = "Invalid redirect URLs: " + err.message;
    }
  }

  if (!error) {
    // Check if any required fields are missing
    const requiredFields = ["name", "key", "secret", "launch_url", "domain"];
    if (data.lti13) {
      requiredFields.push("keyset_url", "auth_url");
    }
    const missingFields = requiredFields.filter((field) => !data[field] || data[field].trim() === "");
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
  }

  // Get list of configured tool providers
  const providers = await lti.controllers.provider.getAll();

  // Get secrets for each provider and convert to JSON-friendly format
  const providerData = [];
  for (const provider of providers) {
    const providerSecret = await lti.controllers.provider.getSecret(provider.id);
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
