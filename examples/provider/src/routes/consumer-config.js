/**
 * @file LTI Consumer Configuration Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports AdminConfigHandler LTI Admin Configuration Launch Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Consumer Configuration
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ConsumerConfigHandler(req, res) {
  let error = null;
  let message = null;

  // Get Form Data
  const data = {
    name: req.body.name,
    lti13: true,
    client_id: req.body.client_id,
    platform_id: req.body.platform_id,
    deployment_id: req.body.deployment_id,
    keyset_url: req.body.keyset_url,
    token_url: req.body.token_url,
    auth_url: req.body.auth_url,
  };

  // Check if any required fields are missing
  const requiredFields = ["name", "client_id", "platform_id", "deployment_id", "keyset_url", "token_url", "auth_url"];
  const missingFields = requiredFields.filter((field) => !data[field] || data[field].trim() === "");
  if (missingFields.length > 0) {
    error = "Missing required fields: " + missingFields.join(", ");
  } else {
    // Update Consumer
    try {
      const returnValue = await lti.controllers.consumerRegistry.updateConsumer(req.params.id, data);
      if (!returnValue) {
        throw new Error("Consumer not found");
      }
    } catch (err) {
      error = "Failed to update consumer: " + err.message;
    }
    if (!error) {
      message = "Successfully updated consumer.";
    }
  }

  // Get Updated LTI Consumer
  const consumers = await lti.controllers.consumerRegistry.getAll();

  // Get LMS Domain
  const lmsDomain = process.env.LTI_13_LMS_DOMAIN || "https://canvas.instructure.com";

  res.render("admin.njk", {
    title: "LTI Tool Provider - Admin Configuration View",
    consumers: consumers,
    lmsDomain: lmsDomain,
    domain: process.env.DOMAIN_NAME,
    error: error,
    message: message,
  });
}

export default ConsumerConfigHandler;
