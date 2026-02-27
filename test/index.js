/**
 * @file Index tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should } from "chai";
import sinon from "sinon";

// Modify Object.prototype for BDD style assertions
should();

// Import Library
import LTIToolkit from "../index.js";
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

/**
 * Check that timer is set properly
 */
const shouldInitializeExpiration = (state) => {
  it("should initialize expiration of old records", (done) => {
    const spy = sinon.spy();
    const interval = sinon.stub(global, "setInterval").returns({
      unref: spy,
    });
    state.lti.test.initializeExpiration();
    interval.calledOnce.should.be.true;
    interval.calledOnceWithMatch(sinon.match.func, 5 * 60 * 1000).should.be.true;
    spy.calledOnce.should.be.true;
    done();
  });
};

describe("Index", () => {
  const state = {};

  beforeEach(() => {
    state.lti = lti;
  });

  describe("initializeExpiration", () => {
    shouldInitializeExpiration(state);
  });
});
