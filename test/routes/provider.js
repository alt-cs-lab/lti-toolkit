/**
 * @file /api/lti/provider Route Tests
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
import setupProviderRoutes from "../../src/routes/provider.js";

describe("/routes/provider.js", function () {
  const logger = configureLogger("error");

  describe("POST /launch", function () {
    it("should send LTI launch request and send redirect URL", async function () {
      // Create mock dependencies
      const LTILaunchController = {
        launch: sinon.stub().resolves("/redirectURL"),
      };
      const LTIRegistrationController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use(express.json());
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send POST request to /launch
      const res = await request(app).post("/lti/provider/launch").send({ some: "data" });

      // Assert response
      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/redirectURL");
      expect(LTILaunchController.launch.calledOnce).to.be.true;
    });

    it("should send invalid LTI launch request and send 400", async function () {
      // Create mock dependencies
      const LTILaunchController = {
        launch: sinon.stub().resolves(null),
      };
      const LTIRegistrationController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use(express.json());
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send POST request to /launch
      const res = await request(app).post("/lti/provider/launch").send({ some: "data" });

      // Assert response
      expect(res.status).to.equal(400);
      expect(LTILaunchController.launch.calledOnce).to.be.true;
    });

    it("should handle errors in LTI launch request and send 400", async function () {
      // Create mock dependencies
      const LTILaunchController = {
        launch: sinon.stub().rejects(new Error("Launch Error")),
      };
      const LTIRegistrationController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use(express.json());
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send POST request to /launch
      const res = await request(app).post("/lti/provider/launch").send({ some: "data" });

      // Assert response
      expect(res.status).to.equal(400);
      expect(LTILaunchController.launch.calledOnce).to.be.true;
    });
  });

  describe("GET /config.xml", function () {
    it("should send LTI 1.0 configuration XML", async function () {
      // Create mock dependencies
      const LTILaunchController = {};
      const LTIRegistrationController = { getLTI10Config: sinon.stub().resolves("<xml>Config</xml>") };

      // Create Express app and use the provider routes
      const app = express();
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send GET request to /config.xml
      const res = await request(app).get("/lti/provider/config.xml");

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.header["content-type"]).to.match(/application\/xml/);
      expect(res.text).to.equal("<xml>Config</xml>");
      expect(LTIRegistrationController.getLTI10Config.calledOnce).to.be.true;
    });

    it("should handle errors in LTI 1.0 configuration request and send 500", async function () {
      // Create mock dependencies
      const LTILaunchController = {};
      const LTIRegistrationController = { getLTI10Config: sinon.stub().rejects(new Error("Config Error")) };

      // Create Express app and use the provider routes
      const app = express();
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send GET request to /config.xml
      const res = await request(app).get("/lti/provider/config.xml");

      // Assert response
      expect(res.status).to.equal(500);
      expect(LTIRegistrationController.getLTI10Config.calledOnce).to.be.true;
    });
  });

  describe("GET /login", function () {
    it("should handle LTI 1.3 login request and send auto form", async function () {
      // Create mock dependencies
      const LTILaunchController = {
        login13: sinon.stub().resolves({
          form: {
            attribute1: "value1",
            attribute2: "value2",
          },
          url: "https://redirectURL",
        }),
      };
      const LTIRegistrationController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use(express.json());
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send GET request to /login
      const res = await request(app).get("/lti/provider/login").send({ some: "data" });

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.header["content-type"]).to.match(/text\/html/);
      expect(res.header["content-security-policy"]).to.match(/form-action https:\/\/redirectURL/);

      // Check form fields in response body
      expect(res.text).to.include('<form method="POST" action="https://redirectURL">');
      expect(res.text).to.include('<input type="hidden" id="attribute1" name="attribute1" value="value1" />');
      expect(res.text).to.include('<input type="hidden" id="attribute2" name="attribute2" value="value2" />');
      expect(LTILaunchController.login13.calledOnce).to.be.true;
    });

    it("should handle errors in LTI 1.3 login request and send 400", async function () {
      // Create mock dependencies
      const LTILaunchController = {
        login13: sinon.stub().rejects(new Error("Login Error")),
      };
      const LTIRegistrationController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use(express.json());
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send GET request to /login
      const res = await request(app).get("/lti/provider/login").send({ some: "data" });

      // Assert response
      expect(res.status).to.equal(400);
      expect(LTILaunchController.login13.calledOnce).to.be.true;
    });
  });

  describe("POST /login", function () {
    it("should handle LTI 1.3 login request and send auto form", async function () {
      // Create mock dependencies
      const LTILaunchController = {
        login13: sinon.stub().resolves({
          form: {
            attribute1: "value1",
            attribute2: "value2",
          },
          url: "https://redirectURL",
        }),
      };
      const LTIRegistrationController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use(express.json());
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send POST request to /login
      const res = await request(app).post("/lti/provider/login").send({ some: "data" });

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.header["content-type"]).to.match(/text\/html/);
      expect(res.header["content-security-policy"]).to.match(/form-action https:\/\/redirectURL/);

      // Check form fields in response body
      expect(res.text).to.include('<form method="POST" action="https://redirectURL">');
      expect(res.text).to.include('<input type="hidden" id="attribute1" name="attribute1" value="value1" />');
      expect(res.text).to.include('<input type="hidden" id="attribute2" name="attribute2" value="value2" />');
      expect(LTILaunchController.login13.calledOnce).to.be.true;
    });

    it("should handle errors in LTI 1.3 login request and send 400", async function () {
      // Create mock dependencies
      const LTILaunchController = {
        login13: sinon.stub().rejects(new Error("Login Error")),
      };
      const LTIRegistrationController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use(express.json());
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send POST request to /login
      const res = await request(app).post("/lti/provider/login").send({ some: "data" });

      // Assert response
      expect(res.status).to.equal(400);
      expect(LTILaunchController.login13.calledOnce).to.be.true;
    });
  });

  describe("GET /jwks", function () {
    it("should send JWKS JSON", async function () {
      // Create mock dependencies
      const keys = [
        {
          kty: "RSA",
          kid: "key1",
          use: "sig",
          n: "modulus",
          e: "exponent",
        },
        {
          kty: "RSA",
          kid: "key2",
          use: "sig",
          n: "modulus2",
          e: "exponent2",
        },
      ];
      const LTILaunchController = {
        generateConsumerJWKS: sinon.stub().resolves(keys),
      };
      const LTIRegistrationController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send GET request to /jwks
      const res = await request(app).get("/lti/provider/jwks").send();

      // Assert response
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(keys);
      expect(LTILaunchController.generateConsumerJWKS.calledOnce).to.be.true;
    });

    it("should handle errors in JWKS request and send 500", async function () {
      // Create mock dependencies
      const LTILaunchController = {
        generateConsumerJWKS: sinon.stub().rejects(new Error("JWKS Error")),
      };
      const LTIRegistrationController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send GET request to /jwks
      const res = await request(app).get("/lti/provider/jwks").send();

      // Assert response
      expect(res.status).to.equal(500);
      expect(LTILaunchController.generateConsumerJWKS.calledOnce).to.be.true;
    });
  });

  describe("GET /register", function () {
    it("should send LTI 1.3 registration response", async function () {
      // Create mock dependencies
      const LTIRegistrationController = {
        dynamicRegistration: sinon.stub().resolves(),
      };
      const LTILaunchController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use(express.json());
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send GET request to /register
      const res = await request(app).get("/lti/provider/register").send({ some: "data" });

      // Assert response
      expect(res.status).to.equal(200);
      expect(LTIRegistrationController.dynamicRegistration.calledOnce).to.be.true;
      expect(res.header["content-type"]).to.match(/text\/html/);

      // Check form fields in response body
      expect(res.text).to.include(
        '(window.opener || window.parent).postMessage({subject:"org.imsglobal.lti.close"}, "*");',
      );
    });

    it("should handle errors in LTI 1.3 registration request and send 500", async function () {
      // Create mock dependencies
      const LTIRegistrationController = {
        dynamicRegistration: sinon.stub().rejects(new Error("Registration Error")),
      };
      const LTILaunchController = {};

      // Create Express app and use the provider routes
      const app = express();
      app.use(express.json());
      app.use("/lti/provider", setupProviderRoutes(LTILaunchController, LTIRegistrationController, logger));

      // Send GET request to /register
      const res = await request(app).get("/lti/provider/register").send({ some: "data" });

      // Assert response
      expect(res.status).to.equal(500);
      expect(LTIRegistrationController.dynamicRegistration.calledOnce).to.be.true;
    });
  });
});
