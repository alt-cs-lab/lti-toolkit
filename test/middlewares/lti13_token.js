/**
 * @file /middlewares/lti13_token.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should, expect } from "chai";
import sinon from "sinon";
import jwt from "jsonwebtoken";

// Load module under test
import lti13token from "../../src/middlewares/lti13_token.js";

// Modify Object.prototype for BDD style assertions
should();

describe("/middlewares/lti13_token.js", () => {
  it("should return 401 if Authorization header is missing", async () => {
    // Create mock dependencies
    const ProviderKeys = { findOne: sinon.stub() };
    const logger = { lti: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };

    // Create instance of middleware
    const middleware = lti13token(ProviderKeys, logger);

    // Create mock request and response objects
    const req = { headers: {} };
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    const next = sinon.stub();

    // Call middleware
    await middleware(req, res, next);

    // Assertions
    expect(logger.lti.calledOnce).to.be.true;
    expect(logger.debug.calledWith("Missing or invalid Authorization header")).to.be.true;
    expect(res.status.calledOnceWith(401)).to.be.true;
    expect(res.json.calledOnceWith({ error: "Missing or invalid Authorization header" })).to.be.true;
  });

  it("should return 401 if JWT is invalid", async () => {
    // Create mock dependencies
    const ProviderKeys = { findOne: sinon.stub() };
    const logger = { lti: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };

    // Create instance of middleware
    const middleware = lti13token(ProviderKeys, logger);

    // Create mock request and response objects
    const req = { headers: { authorization: "Bearer invalid.jwt.token" } };
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    const next = sinon.stub();

    // Call middleware
    await middleware(req, res, next);

    // Assertions
    expect(logger.lti.calledOnce).to.be.true;
    expect(logger.debug.calledWith("Invalid JWT format")).to.be.true;
    expect(res.status.calledOnceWith(401)).to.be.true;
    expect(res.json.calledOnceWith({ error: "Invalid JWT format" })).to.be.true;
  });

  it("should return 401 if JWT is valid but no matching key is found", async () => {
    // Create mock dependencies
    const ProviderKeys = { findOne: sinon.stub().resolves(null) };
    const logger = { lti: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };

    // Create instance of middleware
    const middleware = lti13token(ProviderKeys, logger);

    // Create a valid JWT with a kid in the header
    const token = jwt.sign({ sub: "test" }, "secret", { algorithm: "HS256", header: { kid: "test-kid" } });

    // Create mock request and response objects
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    const next = sinon.stub();

    // Call middleware
    await middleware(req, res, next);

    // Assertions
    expect(logger.lti.calledOnce).to.be.true;
    expect(logger.debug.calledWith("No key found for kid: test-kid")).to.be.true;
    expect(res.status.calledOnceWith(401)).to.be.true;
    expect(res.json.calledOnceWith({ error: "No key found for kid: test-kid" })).to.be.true;
  });

  it("should return 401 if the JWT is missing a kid in the header", async () => {
    // Create mock dependencies
    const ProviderKeys = { findOne: sinon.stub() };
    const logger = { lti: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };

    // Create instance of middleware
    const middleware = lti13token(ProviderKeys, logger);

    // Create a valid JWT without a kid in the header
    const token = jwt.sign({ sub: "test" }, "secret", { algorithm: "HS256" });

    // Create mock request and response objects
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    const next = sinon.stub();

    // Call middleware
    await middleware(req, res, next);

    // Assertions
    expect(logger.lti.calledOnce).to.be.true;
    expect(logger.debug.calledWith("JWT missing kid in header")).to.be.true;
    expect(res.status.calledOnceWith(401)).to.be.true;
    expect(res.json.calledOnceWith({ error: "JWT missing kid in header" })).to.be.true;
  });

  it("should return 401 if there is no public key in the provider key record", async () => {
    // Create mock dependencies
    const ProviderKeys = { findOne: sinon.stub().resolves({ public: null }) };
    const logger = { lti: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };

    // Create instance of middleware
    const middleware = lti13token(ProviderKeys, logger);

    // Create a valid JWT with a kid in the header
    const token = jwt.sign({ sub: "test" }, "secret", { algorithm: "HS256", header: { kid: "test-kid" } });

    // Create mock request and response objects
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    const next = sinon.stub();

    // Call middleware
    await middleware(req, res, next);

    // Assertions
    expect(logger.lti.calledOnce).to.be.true;
    expect(logger.debug.calledWith("Provider key has no public key")).to.be.true;
    expect(res.status.calledOnceWith(401)).to.be.true;
    expect(res.json.calledOnceWith({ error: "Provider key has no public key" })).to.be.true;
  });

  it("should call next with an error if there is an unexpected error during processing", async () => {
    // Create mock dependencies
    const ProviderKeys = { findOne: sinon.stub().throws(new Error("Database error")) };
    const logger = { lti: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };

    // Create instance of middleware
    const middleware = lti13token(ProviderKeys, logger);

    // Create a valid JWT with a kid in the header
    const token = jwt.sign({ sub: "test" }, "secret", { algorithm: "HS256", header: { kid: "test-kid" } });

    // Create mock request and response objects
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    const next = sinon.stub();

    // Call middleware
    await middleware(req, res, next);

    // Assertions
    expect(logger.lti.calledOnce).to.be.true;
    expect(logger.error.calledWith("Error processing LTI 1.3 token:")).to.be.true;
    expect(logger.error.calledWith(sinon.match.instanceOf(Error).and(sinon.match.has("message", "Database error")))).to.be.true;
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error").with.property("message", "Database error");
  });

  it("should call next with the decoded token if the JWT is valid and the key is found", async () => {
    // Create mock dependencies
    const ProviderKeys = { findOne: sinon.stub().resolves({ public: "public-key" }) };
    const logger = { lti: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };

    // Create instance of middleware
    const middleware = lti13token(ProviderKeys, logger);

    // Create a valid JWT with a kid in the header
    const token = jwt.sign({ sub: "test" }, "public-key", { algorithm: "HS256", header: { kid: "test-kid" } });

    // Stub jwt.verify to return the decoded token
    sinon.stub(jwt, "verify").returns({ sub: "test", iat: Math.floor(Date.now() / 1000) });

    // Create mock request and response objects
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    const next = sinon.stub();

    // Call middleware
    await middleware(req, res, next);

    // Assertions
    expect(logger.lti.calledOnce).to.be.true;
    expect(jwt.verify.calledOnceWith(token, "public-key", { algorithms: ["RS256"] })).to.be.true;
    expect(req).to.have.property("lti13Token").that.is.an("object").with.property("sub", "test");
    expect(next.calledOnceWith()).to.be.true;
  });

  it("should return 401 if the JWT has expired", async () => {
    // Create mock dependencies
    const ProviderKeys = { findOne: sinon.stub().resolves({ public: "public-key" }) };
    const logger = { lti: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };

    // Create instance of middleware
    const middleware = lti13token(ProviderKeys, logger);

    // Create a valid JWT with a kid in the header that is already expired
    const token = jwt.sign({ sub: "test", exp: Math.floor(Date.now() / 1000) - 60 }, "public-key", { algorithm: "HS256", header: { kid: "test-kid" } });

    // Stub jwt.verify to throw a TokenExpiredError
    sinon.stub(jwt, "verify").throws(new jwt.TokenExpiredError("jwt expired", new Date()));

    // Create mock request and response objects
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    const next = sinon.stub();

    // Call middleware
    await middleware(req, res, next);

    // Assertions
    expect(logger.lti.calledOnce).to.be.true;
    expect(logger.debug.calledWith("JWT has expired")).to.be.true;
    expect(res.status.calledOnceWith(401)).to.be.true;
    expect(res.json.calledOnceWith({ error: "JWT has expired" })).to.be.true;
  });

  it("should return 401 if the JWT is invalid during verification", async () => {
    // Create mock dependencies
    const ProviderKeys = { findOne: sinon.stub().resolves({ public: "public-key" }) };
    const logger = { lti: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };

    // Create instance of middleware
    const middleware = lti13token(ProviderKeys, logger);

    // Create a valid JWT with a kid in the header
    const token = jwt.sign({ sub: "test" }, "public-key", { algorithm: "HS256", header: { kid: "test-kid" } });

    // Stub jwt.verify to throw a JsonWebTokenError
    sinon.stub(jwt, "verify").throws(new jwt.JsonWebTokenError("Invalid token"));

    // Create mock request and response objects
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    const next = sinon.stub();

    // Call middleware
    await middleware(req, res, next);

    // Assertions
    expect(logger.lti.calledOnce).to.be.true;
    expect(logger.debug.calledWith("JWT validation failed: Invalid token")).to.be.true;
    expect(res.status.calledOnceWith(401)).to.be.true;
    expect(res.json.calledOnceWith({ error: "JWT validation failed: Invalid token" })).to.be.true;
  });
});