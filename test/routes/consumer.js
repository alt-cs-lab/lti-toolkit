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
      const LTIConsumerController = {
        basicOutcomesHandler: sinon.stub().resolves({
          content: "<xml>response</xml>",
          headers: "Bearer token123",
        }),
      };

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTIConsumerController, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/grade")
        .send("<xml>request</xml>")
        .set("Content-Type", "application/xml");

      // Assert controller was called with parsed XML body
      expect(LTIConsumerController.basicOutcomesHandler.calledOnce).to.be.true;
      const handlerArg = LTIConsumerController.basicOutcomesHandler.getCall(0).args[0];
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
      const LTIConsumerController = {
        basicOutcomesHandler: sinon.stub().rejects(new Error("Test error")),
      };

      // Setup Express app with router
      const app = express();
      app.use("/lti/consumer", setupConsumerRoutes(LTIConsumerController, logger));

      // Send request to route
      const res = await request(app)
        .post("/lti/consumer/grade")
        .send("<xml>request</xml>")
        .set("Content-Type", "application/xml");

      // Assert controller was called with parsed XML body
      expect(LTIConsumerController.basicOutcomesHandler.calledOnce).to.be.true;
      const handlerArg = LTIConsumerController.basicOutcomesHandler.getCall(0).args[0];
      expect(handlerArg).to.have.property("body");
      expect(handlerArg.body).to.deep.equal({ xml: "request" });

      // Assert response
      expect(res.status).to.equal(500);
      expect(res.text).to.equal("Error processing grade passback");
    });
  });
});
