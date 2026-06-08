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
import nunjucks from "nunjucks";

// Import middleware
import setupLTI13TokenMiddleware from "../middlewares/lti13_token.js";

export default function setupConsumerRoutes(LTIConsumerController, ProviderKeyModel, logger) {
  // Create Express router
  const router = express.Router();

  // Load middleware
  const lti13TokenMiddleware = setupLTI13TokenMiddleware(ProviderKeyModel, logger);

  // Parse XML body for grade passback route
  router.use(
    expressXmlBodyparser({
      explicitArray: false,
      normalize: true,
      normalizeTags: true,
    }),
  );
  
  // Parse JSON body for custom body types used in LTI 1.3 AGS grade passback
  router.use(express.json({
    type: [
      "application/json",
      "application/vnd.ims.lis.v1.score+json"
    ]
  }));

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
    logger.lti("LTI Basic Outcomes Request Received");
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

  /**
   * LTI 1.3 Auth Request Target
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/consumer/login:
   *   post:
   *     summary: LTI 1.3 Auth Request
   *     description: LTI 1.3 Auth Request Target
   *     tags: [lti-consumer]
   */
  router.post("/login", async function (req, res, next) {
    logger.lti("LTI 1.3 Auth Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    logger.silly(JSON.stringify(req.query, null, 2));
    logger.silly(JSON.stringify(req.body, null, 2));
    try {
      const authResult = await LTIConsumerController.authRequestHandler(req);
      res.header("Content-Type", "text/html");
      res.header("Content-Security-Policy", "form-action " + authResult.url);
      nunjucks.configure({ autoescape: true });
      const output = nunjucks.renderString(
        '<!doctype html>\
<head>\
  <title>LTI Autoform</title>\
</head>\
<body onload="document.forms[0].submit()">\
  <form method="POST" action="{{ url }}">\
    {% for attr, value in form %}\
    <input type="hidden" id="{{ attr }}" name="{{ attr }}" value="{{ value }}" />\
    {% endfor %}\
  </form>\
</body>',
        authResult,
      );
      res.status(200).send(output);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Error processing auth request");
    }
  });

  /**
   * LTI 1.3 Keyset URL
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/consumer/jwks:
   *   get:
   *     summary: LTI 1.3 Keyset URL
   *     description: LTI 1.3 Keyset URL
   *     tags: [lti-consumer]
   */
  router.get("/jwks", async function (req, res, next) {
    try {
      const keys = await LTIConsumerController.generateProviderJWKS();
      res.json({
        keys: keys
      });
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Server Error");
    }
  });

  /**
   * LTI 1.3 Token URL
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/consumer/token:
   *   post:
   *     summary: LTI 1.3 Token URL
   *     description: LTI 1.3 Token URL for exchanging auth code for access token
   *     tags: [lti-consumer]
   */
  router.post("/token", async function (req, res, next) {
    logger.lti("LTI 1.3 Token Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    logger.silly(JSON.stringify(req.query, null, 2));
    logger.silly(JSON.stringify(req.body, null, 2));
    try {
      const tokenResult = await LTIConsumerController.tokenRequestHandler(req);
      res.json(tokenResult);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Error processing token request");
    }
  });

  /**
   * LTI 1.3 AGS Grade Passback
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * 
   * @swagger
   * /lti/consumer/ags/:context_key/:resource_key/:gradebook_key:
   *   post:
   *    summary: LTI 1.3 AGS Grade Passback
   *    description: LTI 1.3 AGS Grade Passback Target for a specific line item
   *    tags: [lti-consumer]
   */
  router.post("/ags/:context_key/:resource_key/:gradebook_key/scores", lti13TokenMiddleware, async function (req, res, next) {
    logger.lti("LTI 1.3 AGS Grade Passback Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    logger.silly(JSON.stringify(req.query, null, 2));
    logger.silly(JSON.stringify(req.body, null, 2));
    try {
      const result = await LTIConsumerController.agsGradePassbackHandler(req);
      res.status(200).json(result);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Error processing AGS grade passback");
    }
  });

  return router;
}
