/**
 * @file JWKS Client Cache Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should } from "chai";
import { JwksClient } from "jwks-rsa";

// Modify Object.prototype for BDD style assertions
should();

// Import the library to test
import { getJwksClient, clearJwksCache } from "../../src/lib/jwks-cache.js";

describe("JWKS Cache", () => {
  describe("getJwksClient", () => {
    it("should return a JwksClient instance", () => {
      const client = getJwksClient("https://example.com/jwks-cache-test-1");
      client.should.be.an.instanceof(JwksClient);
    });

    it("should return the same instance for the same URL", () => {
      const url = "https://example.com/jwks-cache-test-2";
      const first = getJwksClient(url);
      const second = getJwksClient(url);
      first.should.equal(second);
    });

    it("should return different instances for different URLs", () => {
      const first = getJwksClient("https://example.com/jwks-cache-test-3a");
      const second = getJwksClient("https://example.com/jwks-cache-test-3b");
      first.should.not.equal(second);
    });
  });

  describe("clearJwksCache", () => {
    it("should force a new instance to be created on the next call", () => {
      const url = "https://example.com/jwks-cache-test-4";
      const first = getJwksClient(url);
      clearJwksCache();
      const second = getJwksClient(url);
      first.should.not.equal(second);
    });
  });
});
