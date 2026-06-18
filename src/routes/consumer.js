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

export default function setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger, dependencies = {}) {
  // Create Express router
  const router = express.Router();

  // Configure nunjucks once for auto-submitting form templates
  nunjucks.configure({ autoescape: true });

  // Load middleware
  const tokenMiddlewareFactory = dependencies.setupLTI13TokenMiddleware || setupLTI13TokenMiddleware;
  const lti13TokenMiddleware = tokenMiddlewareFactory(ProviderKeyModel, logger);

  // Parse XML body for grade passback route
  router.use(
    expressXmlBodyparser({
      explicitArray: false,
      normalize: true,
      normalizeTags: true,
    }),
  );

  // Parse JSON body for custom body types used in LTI 1.3 AGS
  router.use(
    express.json({
      type: [
        "application/json",
        "application/vnd.ims.lis.v1.score+json",
        "application/vnd.ims.lis.v2.lineitem+json",
        "application/vnd.ims.lis.v2.lineitemcontainer+json",
      ],
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
    logger.lti("LTI Basic Outcomes Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    logger.silly(JSON.stringify(req.query, null, 2));
    logger.silly(JSON.stringify(req.body, null, 2));
    try {
      const result = await LTILMSController.basicOutcomesHandler(req);
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
      const authResult = await LTILMSController.authRequestHandler(req);
      res.header("Content-Type", "text/html");
      res.header("Content-Security-Policy", "form-action " + authResult.url);
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
      const keys = await LTILMSController.generateProviderJWKS();
      res.json({
        keys: keys,
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
      const tokenResult = await LTILMSController.tokenRequestHandler(req);
      res.json(tokenResult);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Error processing token request");
    }
  });

  /**
   * LTI 1.3 AGS Line Items (collection)
   *
   * @swagger
   * /lti/consumer/ags/:context_key/line_items:
   *   get:
   *    summary: LTI 1.3 AGS Line Items
   *    description: LTI 1.3 AGS Line Items collection for a context. Accepts optional ?resource_link_id= filter.
   *    tags: [lti-consumer]
   */
  router.get("/ags/:context_key/line_items", lti13TokenMiddleware, async function (req, res, next) {
    logger.lti("LTI 1.3 AGS Get Line Items Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    logger.silly(JSON.stringify(req.query, null, 2));
    try {
      const result = await LTILMSController.agsGetLineItemsHandler(req);
      res.setHeader("Content-Type", "application/vnd.ims.lis.v2.lineitemcontainer+json");
      res.status(200).json(result);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Error processing AGS line items request");
    }
  });

  /**
   * LTI 1.3 AGS Get Results
   *
   * @swagger
   * /lti/consumer/ags/:context_key/:resource_key/:gradebook_key/results:
   *   get:
   *    summary: LTI 1.3 AGS Get Results
   *    description: LTI 1.3 AGS Get results for a specific line item. Accepts optional ?user_id= filter.
   *    tags: [lti-consumer]
   */
  router.get(
    "/ags/:context_key/:resource_key/:gradebook_key/results",
    lti13TokenMiddleware,
    async function (req, res, next) {
      logger.lti("LTI 1.3 AGS Get Results Request Received");
      logger.silly(JSON.stringify(req.params, null, 2));
      logger.silly(JSON.stringify(req.query, null, 2));
      try {
        const result = await LTILMSController.agsGetResultsHandler(req);
        res.setHeader("Content-Type", "application/vnd.ims.lis.v2.resultcontainer+json");
        res.status(200).json(result);
      } catch (err) {
        logger.lti(err);
        return res.status(500).send("Error processing AGS results request");
      }
    },
  );

  /**
   * LTI 1.3 AGS Get Line Item (single)
   *
   * @swagger
   * /lti/consumer/ags/:context_key/:resource_key/:gradebook_key:
   *   get:
   *    summary: LTI 1.3 AGS Get Line Item
   *    description: LTI 1.3 AGS Get a specific line item
   *    tags: [lti-consumer]
   */
  router.get("/ags/:context_key/:resource_key/:gradebook_key", lti13TokenMiddleware, async function (req, res, next) {
    logger.lti("LTI 1.3 AGS Get Line Item Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    try {
      const result = await LTILMSController.agsGetLineItemHandler(req);
      if (!result) {
        return res.status(404).send("Line item not found");
      }
      res.setHeader("Content-Type", "application/vnd.ims.lis.v2.lineitem+json");
      res.status(200).json(result);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Error processing AGS line item request");
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
   * /lti/consumer/ags/:context_key/:resource_key/:gradebook_key/scores:
   *   post:
   *    summary: LTI 1.3 AGS Grade Passback
   *    description: LTI 1.3 AGS Grade Passback Target for a specific line item
   *    tags: [lti-consumer]
   */
  router.post(
    "/ags/:context_key/:resource_key/:gradebook_key/scores",
    lti13TokenMiddleware,
    async function (req, res, next) {
      logger.lti("LTI 1.3 AGS Grade Passback Request Received");
      logger.silly(JSON.stringify(req.params, null, 2));
      logger.silly(JSON.stringify(req.query, null, 2));
      logger.silly(JSON.stringify(req.body, null, 2));
      try {
        const result = await LTILMSController.agsGradePassbackHandler(req);
        res.status(200).json(result);
      } catch (err) {
        logger.lti(err);
        return res.status(500).send("Error processing AGS grade passback");
      }
    },
  );

  /**
   * LTI 1.3 OpenID Configuration URL
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/consumer/openid-configuration:
   *   get:
   *    summary: LTI 1.3 OpenID Configuration URL
   */
  router.get("/openid-configuration", async function (req, res, next) {
    try {
      const config = await LTILMSController.getOpenIDConfiguration();
      res.json(config);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Server Error");
    }
  });

  /**
   * LTI 1.3 Dynamic Registration Handler
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/consumer/register:
   *   post:
   *    summary: LTI 1.3 Dynamic Registration Handler
   *    description: LTI 1.3 Dynamic Registration Handler for processing dynamic registration requests from LMSs
   *    tags: [lti-consumer]
   */
  router.post("/register", async function (req, res, next) {
    logger.lti("LTI 1.3 Dynamic Registration Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    logger.silly(JSON.stringify(req.query, null, 2));
    logger.silly(JSON.stringify(req.body, null, 2));

    try {
      const registrationResult = await LTILMSController.dynamicRegistrationHandler(req);
      res.json(registrationResult);
    } catch (err) {
      logger.lti(err);
      return res.status(400).json({ error: "Error processing dynamic registration request: " + err.message });
    }
  });

  /**
   * @swagger
   * /lti/consumer/deeplink/{token}:
   *   post:
   *    summary: LTI 1.3 Deep Linking Response Handler
   *    description: Receives the LtiDeepLinkingResponse JWT POSTed back by the tool provider
   *    tags: [lti-consumer]
   */
  router.post("/deeplink/:token", async function (req, res, next) {
    logger.lti("LTI 1.3 Deep Link Response Received");
    try {
      await LTILMSController.deepLinkResponseHandler(req, res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
