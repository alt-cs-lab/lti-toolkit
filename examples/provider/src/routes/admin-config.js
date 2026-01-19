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
    name: req.body.name,
    lti13: true,
    client_id: req.body.client_id,
    platform_id: req.body.platform_id,
    deployment_id: req.body.deployment_id,
    keyset_url: req.body.keyset_url,
    token_url: req.body.token_url,
    auth_url: req.body.auth_url,
  };
  // Update Consumer
  try {
    await lti.controllers.consumer.updateConsumer(0, data);
  } catch (err) {
    error = "Failed to update consumer: " + err.message;
  }
  if (!error) {
    message = "Successfully updated consumer.";
  }

  // Get LTI Consumer
  const consumers = await lti.controllers.consumer.getAll();
  const consumer = consumers[0].toJSON();

  res.render("admin-config.njk", {
    title: "LTI Tool Provider - Admin Configuration View",
    consumer: consumer,
    error: error,
    message: message,
  });
}

export default AdminConfigHandler;
