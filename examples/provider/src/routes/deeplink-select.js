/**
 * @file LTI Deeplink Select Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports DeepLinkSelect LTI Deeplink Selection Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Deeplink Select Postback
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function DeepLinkSelect(req, res) {
  // Get LTI Launch Data and Consumer from session
  const deeplinkData = req.session.ltiDeeplinkData;
  const consumer = req.session.ltiConsumer;

  // Get ID and title from form submission
  const id = req.body.id;
  const title = req.body.title;

  // Submit Deeplink Selection
  await lti.controllers.lti.createDeepLink(res, consumer, deeplinkData.deep_link_return_url, id, title);
}

export default DeepLinkSelect;
