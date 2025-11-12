/**
 * @file /api/lti/provider Route Tests
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
  provider: {
    handleLaunch: async function () {},
  },
  consumer: {
    postProviderGrade: async function () {},
    admin_email: "admin@localhost.local",
    deployment_name: "LTI Toolkit Dev",
    deployment_id: "test-deployment-id",
  },
  test: true, // Indicate that we are in a test environment
});

/**
 * Launch 1.0 should call controller and redirect
 */
const launch10Success = (state) => {
  it("should call LTIController.launch10 and redirect", (done) => {
    sinon
      .stub(lti.controllers.lti, "launch10")
      .resolves("https://example.com/redirect");
    request(state.app)
      .post("/lti/provider/launch10")
      .expect(302)
      .end((err, res) => {
        if (err) return done(err);
        res.headers.location.should.equal("https://example.com/redirect");
        expect(lti.controllers.lti.launch10.calledOnce).to.be.true;
        done();
      });
  });
};

/**
 * Launch 1.0 should return 400 on failure
 */
const launch10Fail = (state) => {
  it("should return 400 on invalid request", (done) => {
    sinon.stub(lti.controllers.lti, "launch10").resolves(null);
    request(state.app)
      .post("/lti/provider/launch10")
      .expect(400)
      .end((err, res) => {
        if (err) return done(err);
        res.text.should.equal("Invalid Request");
        expect(lti.controllers.lti.launch10.calledOnce).to.be.true;
        done();
      });
  });
};

/**
 * Redirect 1.3 should call controller and redirect
 */
const redirect13Success = (state) => {
  it("should call LTIController.redirect13 and redirect", (done) => {
    sinon
      .stub(lti.controllers.lti, "redirect13")
      .resolves("https://example.com/redirect13");
    request(state.app)
      .post("/lti/provider/redirect13")
      .expect(302)
      .end((err, res) => {
        if (err) return done(err);
        res.headers.location.should.equal("https://example.com/redirect13");
        expect(lti.controllers.lti.redirect13.calledOnce).to.be.true;
        done();
      });
  });
};

/**
 * Redirect 1.3 should return 400 on failure
 */
const redirect13Fail = (state) => {
  it("should return 400 on invalid request", (done) => {
    sinon.stub(lti.controllers.lti, "redirect13").resolves(null);
    request(state.app)
      .post("/lti/provider/redirect13")
      .expect(400)
      .end((err, res) => {
        if (err) return done(err);
        res.text.should.equal("Invalid Request");
        expect(lti.controllers.lti.redirect13.calledOnce).to.be.true;
        done();
      });
  });
};

/**
 * Login 1.3 GET should call controller and return form
 */
const login13GetSuccess = (state) => {
  it("should call LTIController.login13 and return form", (done) => {
    const result = {
      form: {
        scope: "openid",
        response_type: "id_token",
        client_id: "client_id",
        redirect_uri: "https://example.com/lti/provider/redirect13",
        login_hint: "login_hint",
        state: "state",
        response_mode: "form_post",
        nonce: "nonce",
        prompt: "none",
      },
      url: "https://example.com/login13",
      name: "Test Consumer",
    };
    sinon.stub(lti.controllers.lti, "login13").resolves(result);
    request(state.app)
      .get("/lti/provider/login13/testkey")
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(lti.controllers.lti.login13.calledOnceWith("testkey")).to.be
          .true;
        res.header["content-type"].should.include("text/html");
        res.header["content-security-policy"].should.include(
          `form-action ${result.url}`,
        );
        res.text.should.include(`<form method="POST" action="${result.url}">`);
        Object.keys(result.form).forEach((key) => {
          res.text.should.include(
            `<input type="hidden" id="${key}" name="${key}" value="${result.form[key]}" />`,
          );
        });
        done();
      });
  });
};

/**
 * Login 1.3 GET should return 400 on failure
 */
const login13GetFail = (state) => {
  it("should return 400 on invalid request", (done) => {
    sinon.stub(lti.controllers.lti, "login13").resolves(false);
    request(state.app)
      .get("/lti/provider/login13/testkey")
      .expect(400)
      .end((err, res) => {
        if (err) return done(err);
        res.text.should.equal("Invalid Request");
        expect(lti.controllers.lti.login13.calledOnceWith("testkey")).to.be
          .true;
        done();
      });
  });
};

/**
 * Login 1.3 POST should call controller and return form
 */
const login13PostSuccess = (state) => {
  it("should call LTIController.login13 and return form", (done) => {
    const result = {
      form: {
        scope: "openid",
        response_type: "id_token",
        client_id: "client_id",
        redirect_uri: "https://example.com/lti/provider/redirect13",
        login_hint: "login_hint",
        state: "state",
        response_mode: "form_post",
        nonce: "nonce",
        prompt: "none",
      },
      url: "https://example.com/login13",
      name: "Test Consumer",
    };
    sinon.stub(lti.controllers.lti, "login13").resolves(result);
    request(state.app)
      .post("/lti/provider/login13/testkey")
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(lti.controllers.lti.login13.calledOnceWith("testkey")).to.be
          .true;
        res.header["content-type"].should.include("text/html");
        res.header["content-security-policy"].should.include(
          `form-action ${result.url}`,
        );
        res.text.should.include(`<form method="POST" action="${result.url}">`);
        Object.keys(result.form).forEach((key) => {
          res.text.should.include(
            `<input type="hidden" id="${key}" name="${key}" value="${result.form[key]}" />`,
          );
        });
        done();
      });
  });
};

/**
 * Login 1.3 POST should return 400 on failure
 */
const login13PostFail = (state) => {
  it("should return 400 on invalid request", (done) => {
    sinon.stub(lti.controllers.lti, "login13").resolves(false);
    request(state.app)
      .post("/lti/provider/login13/testkey")
      .expect(400)
      .end((err, res) => {
        if (err) return done(err);
        res.text.should.equal("Invalid Request");
        expect(lti.controllers.lti.login13.calledOnceWith("testkey")).to.be
          .true;
        done();
      });
  });
};

/**
 * LTI 1.3 Keys should return keys
 */
const keysSuccess = (state) => {
  it("should return keys for LTI 1.3", (done) => {
    const result = [
      {
        kty: "RSA",
        use: "sig",
        kid: "test-key-id",
        n: "test-n",
        e: "AQAB",
      },
    ];
    sinon.stub(lti.controllers.lti, "generateConsumerJWKS").resolves(result);
    request(state.app)
      .get("/lti/provider/key13")
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(lti.controllers.lti.generateConsumerJWKS.calledOnce).to.be.true;
        res.header["content-type"].should.include("application/json");
        res.body.should.deep.equal(result);
        done();
      });
  });
};

/**
 * Dummy test for unused routes
 */
const dummyTest = (state, route, description) => {
  it(`!!DUMMY TEST!! handle ${description} route`, (done) => {
    request(state.app)
      .post(`/lti/provider/${route}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        res.text.should.include(description);
        done();
      });
  });
};

describe("/lti/provider - !!CONTROLLER IS STUBBED!!", () => {
  const state = {};

  beforeEach(() => {
    const app = express();
    app.use("/lti/provider", lti.routers.provider);
    state.app = app;
  });

  describe("POST /launch10", () => {
    launch10Success(state);
    launch10Fail(state);
  });

  describe("POST /redirect13", () => {
    redirect13Success(state);
    redirect13Fail(state);
  });

  describe("GET /login13/{key}", () => {
    login13GetSuccess(state);
    login13GetFail(state);
  });

  describe("POST /login13/{key}", () => {
    login13PostSuccess(state);
    login13PostFail(state);
  });

  describe("GET /key13", () => {
    keysSuccess(state);
  });

  describe("POST /launch13", () => {
    dummyTest(state, "launch13", "Launch 1.3");
  });

  describe("POST /editor13", () => {
    dummyTest(state, "editor13", "Editor 1.3");
  });

  describe("POST /deeplink13", () => {
    dummyTest(state, "deeplink13", "Deep Link 1.3");
  });

  describe("POST /navigate13", () => {
    dummyTest(state, "navigate13", "Navigation 1.3");
  });
});
