/**
 * @file LTI Tool Provider Router
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports router an Express router
 *
 * @swagger
 * tags:
 *   name: lti-provider
 *   description: LTI Tool Provider Routes
 */

// Import libraries
import express from "express";
import nunjucks from "nunjucks";

export default async function setupProviderRoutes(
  LTIToolkitController,
  logger,
) {
  // Create Express router
  const router = express.Router();

  /**
   * LTI 1.0 Launch Target
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/launch10:
   *   post:
   *     summary: LTI 1.0 Launch
   *     description: LTI 1.0 Launch Target
   *     tags: [lti-provider]
   */
  router.post("/launch10", async function (req, res, next) {
    const result = await LTIToolkitController.launch10(req);
    if (result) {
      res.redirect(result);
    } else {
      res.status(400).send("Invalid Request");
    }
  });

  /**
   * LTI 1.3 Launch Target
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/launch13:
   *   post:
   *     summary: LTI 1.3 Launch
   *     description: LTI 1.3 Launch Target
   *     tags: [lti-provider]
   */
  router.post("/launch13", async function (req, res, next) {
    logger.lti("Launch 1.3 Request Received");
    logger.lti(JSON.stringify(req.params));
    logger.lti(JSON.stringify(req.body));
    res.status(200).send("Launch 1.3");
  });

  /**
   * LTI 1.3 Redirect
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/redirect13:
   *   post:
   *     summary: LTI 1.3 Redirect
   *     description: LTI 1.3 Redirect Target
   *     tags: [lti-provider]
   */
  router.post("/redirect13", async function (req, res, next) {
    const result = await LTIToolkitController.redirect13(req);
    if (result) {
      res.redirect(result);
    } else {
      res.status(400).send("Invalid Request");
    }
  });

  /**
   * LTI 1.3 Login
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/login13:
   *   post:
   *     summary: LTI 1.3 Login
   *     description: LTI 1.3 Login Target
   *     tags: [lti-provider]
   *
   * @swagger
   * /lti/provider/login13:
   *   get:
   *     summary: LTI 1.3 Login
   *     description: LTI 1.3 Login Target
   *     tags: [lti-provider]
   */
  router.get("/login13/:key", handleLogin);
  router.post("/login13/:key", handleLogin);
  async function handleLogin(req, res, next) {
    const authResult = await LTIToolkitController.login13(req.params.key, req);
    if (authResult === false) {
      res.status(400).send("Invalid Request");
    } else {
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
    }
  }

  /**
   * LTI 1.3 Keyset URL
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/key13:
   *   get:
   *     summary: LTI 1.3 Keyset URL
   *     description: LTI 1.3 Keyset URL
   *     tags: [lti-provider]
   */
  router.get("/key13", async function (req, res, next) {
    logger.lti("Key 1.3 Request Received");
    const keys = await LTIToolkitController.generateConsumerJWKS();
    res.json(keys);
  });

  /**
   * LTI 1.3 Deep Linking
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/deeplink13:
   *   post:
   *     summary: LTI 1.3 Deep Linking URL
   *     description: LTI 1.3 Deep Linking URL
   *     tags: [lti-provider]
   */
  router.post("/deeplink13", async function (req, res, next) {
    logger.lti("Deep Link 1.3 Request Received");
    logger.lti(JSON.stringify(req.params));
    logger.lti(JSON.stringify(req.body));
    res.status(200).send("Deep Link 1.3");
  });

  /**
   * LTI 1.3 Editor Button
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/editor13:
   *   post:
   *     summary: LTI 1.3 Editor URL
   *     description: LTI 1.3 Editor URL
   *     tags: [lti-provider]
   */
  router.post("/editor13", async function (req, res, next) {
    logger.lti("Editor 1.3 Request Received");
    logger.lti(JSON.stringify(req.params));
    logger.lti(JSON.stringify(req.body));
    res.status(200).send("Editor 1.3");
  });

  /**
   * LTI 1.3 Course Navigation Button
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/navigate13:
   *   post:
   *     summary: LTI 1.3 Course Navigation URL
   *     description: LTI 1.3 Course Navigation URL
   *     tags: [lti-provider]
   */
  router.post("/navigate13", async function (req, res, next) {
    logger.lti("Navigation 1.3 Request Received");
    logger.lti(JSON.stringify(req.params));
    logger.lti(JSON.stringify(req.body));
    res.status(200).send("Navigation 1.3");
  });

  return router;
}
