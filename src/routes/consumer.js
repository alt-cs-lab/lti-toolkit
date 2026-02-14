/**
 * @file LTI Tool Consumer Router
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports router an Express router
 *
 * @swagger
 * tags:
 *   name: lti-consumer
 *   description: LTI Tool Consumer Routes
 */

// Import libraries
import express from "express";
import expressXmlBodyparser from "express-xml-bodyparser";

export default function setupConsumerRoutes(LTIConsumerController, logger) {
  // Create Express router
  const router = express.Router();

  // Parse XML body for grade passback route
  router.use(
    expressXmlBodyparser({
      explicitArray: false,
      normalize: true,
      normalizeTags: true,
    }),
  );

  /**
   * LTI 1.0 Grade Passback Target
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/consumer/grade:
   *   get,post:
   *     summary: LTI 1.0 Grade Passback
   *     description: LTI 1.0 Grade Passback Target
   *     tags: [lti-consumer]
   */
  router.all("/grade", async function (req, res, next) {
    logger.lti("Grade Passback Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    logger.silly(JSON.stringify(req.query, null, 2));
    logger.silly(JSON.stringify(req.body, null, 2));
    try {
      const result = await LTIConsumerController.basicOutcomesHandler(req);
      logger.silly("Grade Passback XML Response:");
      logger.silly(result.content);
      res.type("application/xml");
      if (result.headers) {
        res.set("Authorization", result.headers);
      }
      res.status(200).send(result.content);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Error processing grade passback");
    }
  });

  return router;
}
