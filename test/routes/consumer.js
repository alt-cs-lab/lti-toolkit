/**
 * @file /api/lti/consumer Route Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import request from "supertest";
import { use, should, expect } from "chai";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import chaiJsonSchemaAjv from "chai-json-schema-ajv";
import chaiShallowDeepEqual from "chai-shallow-deep-equal";
import sinon from "sinon";
import express from "express";

// Configure Chai and AJV
const ajv = new Ajv();
addFormats(ajv);
use(chaiJsonSchemaAjv.create({ ajv, verbose: false }));
use(chaiShallowDeepEqual);

// Modify Object.prototype for BDD style assertions
should();

// Import Library
import LTIToolkit from "../../index.js";
const lti = await LTIToolkit({
  domain_name: "http://localhost:3000",
  admin_email: "admin@localhost.local",
  provider: {
    handleLaunch: async function () {},
  },
  consumer: {
    postProviderGrade: async function () {},
    deployment_name: "LTI Toolkit Dev",
    deployment_id: "test-deployment-id",
  },
  test: true, // Indicate that we are in a test environment
});

const gradePassbackCallsController = (state) => {
  it("should call LTIController.basicOutcomesHandler and properly handle the response", (done) => {
    request(state.app)
      .post("/lti/consumer/grade")
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        res.type.should.equal("application/xml");
        res.text.should.equal("<xml>Response</xml>");
        res.headers.authorization.should.equal("TestHeader");
        expect(lti.controllers.lti.basicOutcomesHandler.calledOnce).to.be.true;
        done();
      });
  });
};

describe("/lti/consumer - !!CONTROLLER IS STUBBED!!", () => {
  const state = {};

  beforeEach(() => {
    state.stub = sinon
      .stub(lti.controllers.lti, "basicOutcomesHandler")
      .resolves({
        content: "<xml>Response</xml>",
        headers: "TestHeader",
      });
    const app = express();
    app.use("/lti/consumer", lti.routers.consumer);
    state.app = app;
  });

  describe("ALL /grade", () => {
    gradePassbackCallsController(state);
  });
});
