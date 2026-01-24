/**
 * @file Index Handler for LTI Tool Provider
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports IndexHandler LTI Tool Provider Index Handler
 */

/**
 * Index Route Handler for LTI Tool Provider
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function IndexHandler(req, res) {
  // Render index view
  res.render("index.njk", {
    title: "LTI Tool Provider - Index",
    domain: process.env.DOMAIN_NAME,
    key: process.env.LTI_CONSUMER_KEY,
    secret: process.env.LTI_CONSUMER_SECRET,
  });
}

export default IndexHandler;
