/**
 * @file LTI Admin Configuration Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports AdminConfigHandler LTI Admin Configuration Launch Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Admin Launch
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function AdminConfigHandler(req, res) {
  let error = null;
  let message = null;

  // Get Form Data
  const data = {
    lti13: true,
    client_id: req.body.client_id,
    platform_id: req.body.platform_id,
    deployment_id: req.body.deployment_id,
    keyset_url: req.body.keyset_url,
    token_url: req.body.token_url,
    auth_url: req.body.auth_url,
  };

  // Check if any required fields are missing
  const requiredFields = [
    "client_id",
    "platform_id",
    "deployment_id",
    "keyset_url",
    "token_url",
    "auth_url",
  ];
  const missingFields = requiredFields.filter(
    (field) => !data[field] || data[field].trim() === "",
  );
  if (missingFields.length > 0) {
    error = "Missing required fields: " + missingFields.join(", ");
  } else {
    // Update Consumer
    try {
      const returnValue = await lti.controllers.consumer.updateConsumer(
        1,
        data,
      );
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
  const consumers = await lti.controllers.consumer.getAll();
  const consumer = consumers[0].toJSON();

  // Get LMS Domain
  const lmsDomain =
    process.env.LTI_13_LMS_DOMAIN || "https://canvas.instructure.com";

  res.render("admin.njk", {
    title: "LTI Tool Provider - Admin Configuration View",
    consumer: consumer,
    consumers: consumers,
    lmsDomain: lmsDomain,
    domain: process.env.DOMAIN_NAME,
    key: process.env.LTI_CONSUMER_KEY,
    error: error,
    message: message,
  });
}

export default AdminConfigHandler;
