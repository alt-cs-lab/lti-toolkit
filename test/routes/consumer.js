/**
 * @file /api/lti/consumer Route Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import request from "supertest";
import { should, expect } from "chai";
import sinon from "sinon";
import express from "express";

// Modify Object.prototype for BDD style assertions
should();

// Load logger
import configureLogger from "../../src/config/logger.js";

// Load module under test
import setupConsumerRoutes from "../../src/routes/consumer.js";

describe("/routes/consumer.js", function () {
  const logger = configureLogger("error");

  describe("GET /grade", function () {
    it("should handle grade passback request and send XML response", async function () {
      // Mock controller
      const LTILMSController = {
        basicOutcomesHandler: sinon.stub().resolves({
          content: "<xml>response</xml>",
          headers: "Bearer token123",
        }),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/grade")
        .send("<xml>request</xml>")
        .set("Content-Type", "application/xml");

      // Assert controller was called with parsed XML body
      expect(LTILMSController.basicOutcomesHandler.calledOnce).to.be.true;
      const handlerArg = LTILMSController.basicOutcomesHandler.getCall(0).args[0];
      expect(handlerArg).to.have.property("body");
      expect(handlerArg.body).to.deep.equal({ xml: "request" });

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.headers).to.have.property("content-type").that.includes("application/xml");
      expect(res.headers).to.have.property("authorization", "Bearer token123");
      expect(res.text).to.equal("<xml>response</xml>");
    });

    it("should handle errors in grade passback and send 500", async function () {
      // Mock controller that throws error
      const LTILMSController = {
        basicOutcomesHandler: sinon.stub().rejects(new Error("Test error")),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/grade")
        .send("<xml>request</xml>")
        .set("Content-Type", "application/xml");

      // Assert controller was called with parsed XML body
      expect(LTILMSController.basicOutcomesHandler.calledOnce).to.be.true;
      const handlerArg = LTILMSController.basicOutcomesHandler.getCall(0).args[0];
      expect(handlerArg).to.have.property("body");
      expect(handlerArg.body).to.deep.equal({ xml: "request" });

      // Assert response
      expect(res.status).to.equal(500);
      expect(res.text).to.equal("Error processing grade passback");
    });
  });

  describe("POST /login", function () {
    it("should handle auth request and send HTML response", async function () {
      // Mock controller
      const LTILMSController = {
        authRequestHandler: sinon.stub().resolves({
          url: "https://example.com/auth",
          form: {
            name: "test",
            value: "value",
          }
        }),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/login")
        .send({ key: "value" })
        .set("Content-Type", "application/json");

      // Assert controller was called with parsed JSON body
      expect(LTILMSController.authRequestHandler.calledOnce).to.be.true;
      const handlerArg = LTILMSController.authRequestHandler.getCall(0).args[0];
      expect(handlerArg).to.have.property("body");
      expect(handlerArg.body).to.deep.equal({ key: "value" });

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.headers).to.have.property("content-type").that.includes("text/html");
      expect(res.headers).to.have.property("content-security-policy", "form-action https://example.com/auth");
      // Assert HTML response contains form with correct action URL and hidden input fields
      expect(res.text).to.include('<form method="POST" action="https://example.com/auth">');
      expect(res.text).to.include('<input type="hidden" id="name" name="name" value="test" />');
      expect(res.text).to.include('<input type="hidden" id="value" name="value" value="value" />');
    });

    it("should handle errors in auth request and send 500", async function () {
      // Mock controller that throws error
      const LTILMSController = {
        authRequestHandler: sinon.stub().rejects(new Error("Test error")),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/login")
        .send({ key: "value" })
        .set("Content-Type", "application/json");

      // Assert controller was called with parsed JSON body
      expect(LTILMSController.authRequestHandler.calledOnce).to.be.true;
      const handlerArg = LTILMSController.authRequestHandler.getCall(0).args[0];
      expect(handlerArg).to.have.property("body");
      expect(handlerArg.body).to.deep.equal({ key: "value" });

      // Assert response
      expect(res.status).to.equal(500);
      expect(res.text).to.equal("Error processing auth request");
    });
  });

  describe("GET /jwks", function () {
    it("should return JWKS response", async function () {
      // Mock controller
      const LTILMSController = {
        generateProviderJWKS: sinon.stub().resolves([
              { kty: "RSA", kid: "key1", use: "sig", n: "modulus", e: "exponent" }
          ]),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .get("/lti/consumer/jwks");

      // Assert controller was called
      expect(LTILMSController.generateProviderJWKS.calledOnce).to.be.true;

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.headers).to.have.property("content-type").that.includes("application/json");
      expect(res.body).to.deep.equal({ keys: [
          { kty: "RSA", kid: "key1", use: "sig", n: "modulus", e: "exponent" }
      ] });
    });

    it("should handle errors in JWKS generation and send 500", async function () {
      // Mock controller that throws error
      const LTILMSController = {
        generateProviderJWKS: sinon.stub().rejects(new Error("Test error")),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .get("/lti/consumer/jwks");

      // Assert controller was called
      expect(LTILMSController.generateProviderJWKS.calledOnce).to.be.true;

      // Assert response
      expect(res.status).to.equal(500);
      expect(res.text).to.equal("Server Error");
    });
  });

  describe("POST /token", function () {
    it("should return token response", async function () {
      // Mock controller
      const LTILMSController = {
        tokenRequestHandler: sinon.stub().resolves({ access_token: "token123", token_type: "Bearer", expires_in: 3600 }),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/token");

      // Assert controller was called
      expect(LTILMSController.tokenRequestHandler.calledOnce).to.be.true;

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.headers).to.have.property("content-type").that.includes("application/json");
      expect(res.body).to.deep.equal({ access_token: "token123", token_type: "Bearer", expires_in: 3600 });
    });

    it("should handle errors in token request and send 500", async function () {
      // Mock controller that throws error
      const LTILMSController = {
        tokenRequestHandler: sinon.stub().rejects(new Error("Test error")),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/token");

      // Assert controller was called
      expect(LTILMSController.tokenRequestHandler.calledOnce).to.be.true;

      // Assert response
      expect(res.status).to.equal(500);
      expect(res.text).to.equal("Error processing token request");
    });
  });

  describe("POST /ags", function () {
    it("should handle ags grade passback", async function () {
      // Mock controller
      const LTILMSController = {
        agsGradePassbackHandler: sinon.stub().resolves({ success: true, message: "Grade updated successfully" }),
      };
      const ProviderKeyModel = {};

      // Stub middleware
      const lti13TokenMiddleware = sinon.stub().callsFake((req, res, next) => {
        req.lti13Token = { sub: "user123" };
        next();
      });
      const setupLTI13TokenMiddleware = sinon.stub().returns(lti13TokenMiddleware);

      // Setup Express app with router
      const app = express();
      app.use(
        "/lti/consumer",
        setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger, { setupLTI13TokenMiddleware }),
      );

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/ags/context/resource/gradebook/scores");

      // Assert controller was called
      expect(LTILMSController.agsGradePassbackHandler.calledOnce).to.be.true;

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.headers).to.have.property("content-type").that.includes("application/json");
      expect(res.body).to.deep.equal({ success: true, message: "Grade updated successfully" });
    });

    it("should handle errors in ags grade passback and send 500", async function () {
      // Mock controller that throws error
      const LTILMSController = {
        agsGradePassbackHandler: sinon.stub().rejects(new Error("Test error")),
      };
      const ProviderKeyModel = {};

      // Stub middleware
      const lti13TokenMiddleware = sinon.stub().callsFake((req, res, next) => {
        req.lti13Token = { sub: "user123" };
        next();
      });
      const setupLTI13TokenMiddleware = sinon.stub().returns(lti13TokenMiddleware);

      // Setup Express app with router
      const app = express();
      app.use(
        "/lti/consumer",
        setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger, { setupLTI13TokenMiddleware }),
      );

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/ags/context/resource/gradebook/scores");

      // Assert controller was called
      expect(LTILMSController.agsGradePassbackHandler.calledOnce).to.be.true;

      // Assert response
      expect(res.status).to.equal(500);
      expect(res.text).to.equal("Error processing AGS grade passback");
    });
  });

  describe("GET /openid-configuration", function () {
    it("should return OpenID configuration", async function () {
      // Mock controller
      const LTILMSController = {
        getOpenIDConfiguration: sinon.stub().resolves({
          issuer: "https://example.com",
          authorization_endpoint: "https://example.com/auth",
          token_endpoint: "https://example.com/token",
          jwks_uri: "https://example.com/jwks",
        }),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .get("/lti/consumer/openid-configuration");

      // Assert controller was called
      expect(LTILMSController.getOpenIDConfiguration.calledOnce).to.be.true;

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.headers).to.have.property("content-type").that.includes("application/json");
      expect(res.body).to.deep.equal({
        issuer: "https://example.com",
        authorization_endpoint: "https://example.com/auth",
        token_endpoint: "https://example.com/token",
        jwks_uri: "https://example.com/jwks",
      });
    });

    it("should handle errors in OpenID configuration retrieval and send 500", async function () {
      // Mock controller that throws error
      const LTILMSController = {
        getOpenIDConfiguration: sinon.stub().rejects(new Error("Test error")),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .get("/lti/consumer/openid-configuration");

      // Assert controller was called
      expect(LTILMSController.getOpenIDConfiguration.calledOnce).to.be.true;

      // Assert response
      expect(res.status).to.equal(500);
      expect(res.text).to.equal("Server Error");
    });
  });

  describe("POST /register", function () {
    it("should handle dynamic registration request", async function () {
      // Mock controller
      const LTILMSController = {
        dynamicRegistrationHandler: sinon.stub().resolves({ success: true, message: "Registration successful" }),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/register")
        .send({ client_name: "Test Client" })
        .set("Content-Type", "application/json");

      // Assert controller was called with parsed JSON body
      expect(LTILMSController.dynamicRegistrationHandler.calledOnce).to.be.true;
      const handlerArg = LTILMSController.dynamicRegistrationHandler.getCall(0).args[0];
      expect(handlerArg).to.have.property("body");
      expect(handlerArg.body).to.deep.equal({ client_name: "Test Client" });

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.headers).to.have.property("content-type").that.includes("application/json");
      expect(res.body).to.deep.equal({ success: true, message: "Registration successful" });
    });

    it("should handle errors in dynamic registration and send 400", async function () {
      // Mock controller that throws error
      const LTILMSController = {
        dynamicRegistrationHandler: sinon.stub().rejects(new Error("Test error")),
      };
      const ProviderKeyModel = {};

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTILMSController, ProviderKeyModel, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/register")
        .send({ client_name: "Test Client" })
        .set("Content-Type", "application/json");

      // Assert controller was called with parsed JSON body
      expect(LTILMSController.dynamicRegistrationHandler.calledOnce).to.be.true;
      const handlerArg = LTILMSController.dynamicRegistrationHandler.getCall(0).args[0];
      expect(handlerArg).to.have.property("body");
      expect(handlerArg.body).to.deep.equal({ client_name: "Test Client" });

      // Assert response
      expect(res.status).to.equal(400);
      expect(res.body).to.deep.equal({ error: "Error processing dynamic registration request: Test error" });
    });
  });
});
