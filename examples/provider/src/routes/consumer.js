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
  const consumer = await lti.controllers.consumer.getById(consumerId);
  if (!consumer) {
    return res.status(404).send("Consumer not found");
  }

  // Get Secret
  const consumerSecret = await lti.controllers.consumer.getSecret(consumer.id);

  // Formatted consumer including secret
  const consumerData = consumer.toJSON();
  consumerData.secret = consumerSecret.secret;

  // Render consumer view
  res.render("consumer.njk", {
    title: `LTI Tool Consumer - Consumer: ${consumer.name}`,
    consumer: consumerData,
  });
}

export default ConsumerHandler;
