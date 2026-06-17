/**
 * @file Consumer Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ConsumerHandler LTI Tool Consumer Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Consumer Handler for LTI Tool Consumer
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ConsumerHandler(req, res) {
  const consumerId = req.params.id;

  // Get Consumer
  const consumer = await lti.controllers.consumerRegistry.getById(consumerId);
  if (!consumer) {
    return res.status(404).send("Consumer not found");
  }

  // Get Secret
  const consumerSecret = await lti.controllers.consumerRegistry.getSecret(consumer.id);

  // Get LMS Domain
  const lmsDomain = process.env.LTI_13_LMS_DOMAIN || "https://canvas.instructure.com";

  // Formatted consumer including secret and masked secret (last 4 chars)
  const consumerData = consumer.toJSON();
  consumerData.secret = consumerSecret.secret;
  consumerData.maskedSecret = "••••••••" + consumerSecret.secret.slice(-4);

  // Render consumer view
  res.render("consumer.njk", {
    title: `LTI Tool Consumer - Consumer: ${consumer.name}`,
    consumer: consumerData,
    lmsDomain: lmsDomain,
  });
}

export default ConsumerHandler;
