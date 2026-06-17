/**
 * @file Consumer Delete Handler for LTI Tool Provider
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports ConsumerDeleteHandler deletes an existing LTI Tool Consumer record
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Consumer Delete Handler for LTI Tool Provider
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function ConsumerDeleteHandler(req, res) {
  const consumerId = req.params.id;

  const result = await lti.controllers.consumerRegistry.deleteConsumer(consumerId);
  if (!result) {
    return res.status(404).send("Consumer not found");
  }

  res.redirect("/admin");
}

export default ConsumerDeleteHandler;
