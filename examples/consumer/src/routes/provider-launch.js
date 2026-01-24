/**
 * @file Provider Launch Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ProviderLaunchHandler LTI Tool Provider Launch Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Provider Launch Handler for LTI Tool Consumer
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ProviderLaunchHandler(req, res) {
  let error = null;
  let message = null;

  const providerId = req.params.id;

  // Get Provider
  const provider = await lti.controllers.provider.getById(providerId);
  if (!provider) {
    return res.status(404).send("Provider not found");
  }

  // Get Secret
  const providerSecret = await lti.controllers.provider.getSecret(provider.id);

  // Formatted provider including secret
  const providerData = provider.toJSON();
  providerData.secret = providerSecret.secret;

  // Get Form Data
  const data = {
    context: {
      key: req.body.context_key,
      label: req.body.context_label,
      name: req.body.context_name,
    },
    resource: {
      key: req.body.resource_key,
      name: req.body.resource_name,
    },
    user: {
      key: req.body.user_key,
      email: req.body.user_email,
      given_name: req.body.user_given_name,
      family_name: req.body.user_family_name,
      name: req.body.user_given_name + " " + req.body.user_family_name,
    },
    manager: req.body.manager === "true",
    gradebook_id: req.body.gradebook_id,
  }

  // Check if any required fields are missing
  const requiredFields = ["context.key", "context.label", "context.name", "resource.key", "resource.name", "user.key", "user.email", "user.given_name", "user.family_name", "manager", "gradebook_id"];
  const missingFields = requiredFields.filter(
    (field) => {
      // Handle nested fields
      const fieldParts = field.split(".");
      let value = data;
      for (const part of fieldParts) {
        value = value[part];
        if (value === undefined) {
          return true;
        }
      }
      return value === undefined || value === null || value.toString().trim() === "";
    }
  );
  if (missingFields.length > 0) {
    error = "Missing required fields: " + missingFields.join(", ");

    // Render provider view
    res.render("provider.njk", {
      title: `LTI Tool Consumer - Provider: ${provider.name}`,
      provider: providerData,
      error: error,
      message: message,
    });
  } else {
    // Create LTI Launch
    const launch = lti.controllers.lti.generateLTI10FormData(
      provider.key,
      providerSecret.secret,
      provider.launch_url,
      "/provider/" + provider.id,
      data.context,
      data.resource,
      data.user,
      data.manager,
      data.gradebook_id,
    );

    // Render template
    res.render("launch.njk", {
      launch,
    });
  }
}

export default ProviderLaunchHandler;