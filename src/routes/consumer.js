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

export default function setupConsumerRoutes(LTIToolkitController, logger) {
  // Create Express router
  const router = express.Router();

  /**
   * LTI 1.0 Grade Passback Target
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/consumer/grade_passback:
   *   get,post:
   *     summary: LTI 1.0 Grade Passback
   *     description: LTI 1.0 Grade Passback Target
   *     tags: [lti-consumer]
   */
  router.all("/grade_passback", async function (req, res, next) {
    const result = await LTIToolkitController.basicOutcomesHandler(req);
    logger.silly("Sending XML response");
    logger.silly(result.content);
    res.type("application/xml");
    if (result.headers) {
      logger.silly("Headers - Authorization: " + result.headers);
      res.set("Authorization", result.headers);
    }
    res.status(200).send(result.content);
  });

  return router;
}
