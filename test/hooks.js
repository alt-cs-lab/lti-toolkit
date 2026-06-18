/**
 * @file Root Mocha Hooks
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports mochaHooks A Mocha Root Hooks Object
 */

// Import libraries
import sinon from "sinon";
import { clearJwksCache } from "../src/lib/jwks-cache.js";

// Root Hook Runs Before Each Test
export const mochaHooks = {
  afterEach(done) {
    // Restore Sinon mocks
    sinon.restore();
    // Clear cached JwksClient instances so each test gets a fresh client,
    // constructed after that test's own stubs are in place
    clearJwksCache();
    done();
  },
};
