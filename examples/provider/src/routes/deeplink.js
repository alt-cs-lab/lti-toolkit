/**
 * @file Deeplink Handler for LTI Deeplinks
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports DeepLinkHandler LTI Deeplink Handler
 */

/**
 * Handle LTI Admin Launch
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function DeepLinkHandler(req, res) {
  // Get LTI Launch Data and Consumer from session
  const deeplinkData = req.session.ltiDeeplinkData;
  const consumer = req.session.ltiConsumer;

  // Render the page
  res.render("deeplink.njk", {
    title: "LTI Tool Provider - Deeplink Selector",
    consumer,
    deeplinkData
  });
}

export default DeepLinkHandler;