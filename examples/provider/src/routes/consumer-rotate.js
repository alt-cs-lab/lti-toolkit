/**
 * @file Consumer Rotate Handler for LTI Tool Provider
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ConsumerRotateHandler rotates the secret/key pair for an existing LTI Tool Consumer
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Consumer Rotate Handler for LTI Tool Provider
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ConsumerRotateHandler(req, res) {
  const consumerId = req.params.id;

  let error = null;

  try {
    const result = await lti.controllers.consumerRegistry.updateSecret(consumerId);
    if (!result) {
      return res.status(404).send("Consumer not found");
    }
  } catch (err) {
    error = "Failed to rotate secret: " + err.message;
  }

  // Get LMS Domain
  const lmsDomain = process.env.LTI_13_LMS_DOMAIN || "https://canvas.instructure.com";

  // Reload consumer with new secret
  const consumer = await lti.controllers.consumerRegistry.getById(consumerId);
  const consumerSecret = await lti.controllers.consumerRegistry.getSecret(consumer.id);
  const consumerData = consumer.toJSON();
  consumerData.secret = consumerSecret.secret;
  consumerData.maskedSecret = "••••••••" + consumerSecret.secret.slice(-4);

  res.render("consumer.njk", {
    title: `LTI Tool Consumer - Consumer: ${consumerData.name}`,
    consumer: consumerData,
    lmsDomain: lmsDomain,
    error: error,
    message: error ? null : "Secret and key pair rotated successfully.",
  });
}

export default ConsumerRotateHandler;
