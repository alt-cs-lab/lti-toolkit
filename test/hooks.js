/**
 * @file Root Mocha Hooks
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports mochaHooks A Mocha Root Hooks Object
 */

// Import libraries
import sinon from "sinon";

// Root Hook Runs Before Each Test
export const mochaHooks = {
  afterEach(done) {
    // Restore Sinon mocks
    sinon.restore();
    done();
  },
};
