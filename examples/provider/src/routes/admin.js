/**
 * @file LTI Admin Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports AdminHandler LTI Admin Launch Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Admin Launch
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function AdminHandler(req, res) {
  // Get LTI Consumer
  const consumers = await lti.controllers.consumer.getAll();
  const consumer = consumers[0].toJSON();

  res.render("admin.njk", {
    title: "LTI Tool Provider - Admin View",
    consumer: consumer,
  });
}

export default AdminHandler;