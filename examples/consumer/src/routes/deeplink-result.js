/**
 * @file Deep Link Result Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports handleDeeplink handleDeeplink callback for LTI Toolkit configuration
 * @exports default DeepLinkResultHandler Express route handler for displaying deep link results
 */

import { nanoid } from "nanoid";

// In-memory store mapping unique keys to deep link results.
// In a production application, use a database or session store instead.
const deepLinkStore = new Map();

/**
 * handleDeeplink callback — registered in lti.js as consumer.handleDeeplink.
 * Called by the library after verifying the LtiDeepLinkingResponse JWT.
 *
 * @param {Object[]} content_items - the content items selected by the user in the provider
 * @param {Object} context - the context stored when the deep link request was initiated
 * @returns {Promise<string>} redirect URL for the browser after processing
 */
export async function handleDeeplink(content_items, context) {
  const key = nanoid();
  deepLinkStore.set(key, { content_items, context });
  return `/deeplink-result?key=${key}`;
}

/**
 * Deep Link Result Handler — renders the received content items to the user.
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function DeepLinkResultHandler(req, res) {
  const key = req.query.key;
  if (!key) {
    return res.status(400).send("Missing deep link result key");
  }

  const result = deepLinkStore.get(key);
  if (!result) {
    return res.status(404).send("Deep link result not found or already consumed");
  }

  deepLinkStore.delete(key);

  res.render("deeplink-result.njk", {
    title: "LTI Tool Consumer - Deep Link Result",
    content_items: result.content_items,
    context: result.context,
  });
}

export default DeepLinkResultHandler;
