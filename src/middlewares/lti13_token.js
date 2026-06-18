import jwt from "jsonwebtoken";

function setupLTI13TokenMiddleware(ProviderKeys, logger) {
  /**
   * Middleware to validate a JWT LTI 1.3 token issued by the lti13.js library.
   * Uses the `kid` from the token header to look up the signing key in ProviderKeys.
   */
  return async function lti13Token(req, res, next) {
    logger.lti("LTI 1.3 Token Middleware Invoked");
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.debug("Missing or invalid Authorization header");
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
      }

      const token = authHeader.slice(7);

      // Decode without verifying to extract the header
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header) {
        logger.debug("Invalid JWT format");
        return res.status(401).json({ error: "Invalid JWT format" });
      }

      const { kid } = decoded.header;
      if (!kid) {
        logger.debug("JWT missing kid in header");
        return res.status(401).json({ error: "JWT missing kid in header" });
      }

      // Look up the signing key by kid in ProviderKeys
      const providerKey = await ProviderKeys.findOne({ where: { key: kid } });
      if (!providerKey) {
        logger.debug(`No key found for kid: ${kid}`);
        return res.status(401).json({ error: `No key found for kid: ${kid}` });
      }

      const publicKey = providerKey.public;
      if (!publicKey) {
        logger.debug("Provider key has no public key");
        return res.status(401).json({ error: "Provider key has no public key" });
      }

      // Verify the token with the retrieved public key
      const verified = jwt.verify(token, publicKey, { algorithms: ["RS256"] });

      req.lti13Token = verified;
      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        logger.debug("JWT has expired");
        return res.status(401).json({ error: "JWT has expired" });
      }
      if (err.name === "JsonWebTokenError") {
        logger.debug(`JWT validation failed: ${err.message}`);
        return res.status(401).json({ error: `JWT validation failed: ${err.message}` });
      }
      logger.error("Error processing LTI 1.3 token:");
      logger.error(err);
      next(err);
    }
  };
}

export default setupLTI13TokenMiddleware;
