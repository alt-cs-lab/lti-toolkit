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

export default function setupProviderRoutes(
  LTILaunchController,
  LTIRegistrationController,
  logger,
) {
  // Create Express router
  const router = express.Router();

  /**
   * LTI Launch Target
   * 
   * All LTI launch requests (1.0 and 1.3) will be sent to this endpoint. 
   * The controller will determine the version and handle accordingly.
   * This endpoint also handles LTI 1.3 deeplink requests.
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/launch:
   *   post:
   *     summary: LTI Launch
   *     description: LTI Launch Target
   *     tags: [lti-provider]
   */
  router.post("/launch", async function (req, res, next) {
    try {
      logger.lti("Launch Request Received");
      logger.silly(JSON.stringify(req.params, null, 2));
      logger.silly(JSON.stringify(req.query, null, 2));
      logger.silly(JSON.stringify(req.body, null, 2));
      const result = await LTILaunchController.launch(req);
      if (result && typeof result === "string") {
        res.redirect(result);
      } else {
        res.status(400).send("Invalid Request");
      }
    } catch (err) {
      logger.lti(err);
      return res.status(400).send("Invalid Request");
    }
  });

  /**
   * LIT 1.0 Configuration URL
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/config.xml:
   *   get:
   *     summary: LTI 1.0 Configuration
   *     description: LTI 1.0 Configuration URL
   *     tags: [lti-provider]
   */
  router.get("/config.xml", async function (req, res, next) {
    try {
      const config = await LTIRegistrationController.getLTI10Config();
      res.header("Content-Type", "application/xml");
      res.status(200).send(config);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Server Error");
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
   * /lti/provider/login:
   *   post:
   *     summary: LTI 1.3 Login
   *     description: LTI 1.3 Login Target
   *     tags: [lti-provider]
   *
   * @swagger
   * /lti/provider/login:
   *   get:
   *     summary: LTI 1.3 Login
   *     description: LTI 1.3 Login Target
   *     tags: [lti-provider]
   */
  router.get("/login", handleLogin);
  router.post("/login", handleLogin);
  async function handleLogin(req, res, next) {
    logger.lti("Login Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    logger.silly(JSON.stringify(req.query, null, 2));
    logger.silly(JSON.stringify(req.body, null, 2));
    try {
      const authResult = await LTILaunchController.login13(req);
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
      return res.status(400).send("Invalid Request");
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
   * /lti/provider/jwks:
   *   get:
   *     summary: LTI 1.3 Keyset URL
   *     description: LTI 1.3 Keyset URL
   *     tags: [lti-provider]
   */
  router.get("/jwks", async function (req, res, next) {
    try {
      const keys = await LTILaunchController.generateConsumerJWKS();
      res.json(keys);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Server Error");
    }
  });

  /**
   * LTI 1.3 Deep Linking
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/deeplink:
   *   post:
   *     summary: LTI 1.3 Deep Linking URL
   *     description: LTI 1.3 Deep Linking URL
   *     tags: [lti-provider]
   */
  // router.post("/deeplink", async function (req, res, next) {
  //   logger.lti("Deep Link 1.3 Request Received");
  //   logger.lti(JSON.stringify(req.params));
  //   logger.lti(JSON.stringify(req.body));
  //   res.status(200).send("Deep Link 1.3");
  // });

  /**
   * LTI 1.3 Editor Button
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/editor:
   *   post:
   *     summary: LTI 1.3 Editor URL
   *     description: LTI 1.3 Editor URL
   *     tags: [lti-provider]
   */
  // router.post("/editor", async function (req, res, next) {
  //   logger.lti("Editor 1.3 Request Received");
  //   logger.lti(JSON.stringify(req.params));
  //   logger.lti(JSON.stringify(req.body));
  //   res.status(200).send("Editor 1.3");
  // });

  /**
   * LTI 1.3 Course Navigation Button
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/navigate:
   *   post:
   *     summary: LTI 1.3 Course Navigation URL
   *     description: LTI 1.3 Course Navigation URL
   *     tags: [lti-provider]
   */
  // router.post("/navigate", async function (req, res, next) {
  //   logger.lti("Navigation 1.3 Request Received");
  //   logger.lti(JSON.stringify(req.params));
  //   logger.lti(JSON.stringify(req.body));
  //   res.status(200).send("Navigation 1.3");
  // });

  /**
   * LTI 1.3 Dynamic Registration
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @swagger
   * /lti/provider/register:
   *   post:
   *     summary: LTI 1.3 Dynamic Registration URL
   *     description: LTI 1.3 Dynamic Registration URL
   *     tags: [lti-provider]
   */
  router.all("/register", async function (req, res, next) {
    logger.lti("Login Request Received");
    logger.silly(JSON.stringify(req.params, null, 2));
    logger.silly(JSON.stringify(req.query, null, 2));
    logger.silly(JSON.stringify(req.body, null, 2));

    try {
      await LTIRegistrationController.dynamicRegistration(req.query);
      nunjucks.configure({ autoescape: true });
      const output = nunjucks.renderString(
        '<!doctype html>\
  <head>\
  <title>LTI Dynamic Registration</title>\
  </head>\
  <body>\
    Registration Successful. You can close this window.\
    <script type="text/javascript">\
      (window.opener || window.parent).postMessage({subject:"org.imsglobal.lti.close"}, "*");\
    </script>\
  </body>',
      );
      res.status(200).send(output);
    } catch (err) {
      logger.lti(err);
      return res.status(500).send("Server Error");
    }
  });

  return router;
}