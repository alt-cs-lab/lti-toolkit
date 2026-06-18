/**
 * @file Encryption Utility Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should } from "chai";

// Modify Object.prototype for BDD style assertions
should();

// Import the library to test
import { encrypt, decrypt } from "../../src/lib/encryption.js";

const KEY = Buffer.from("0123456789abcdef".repeat(4), "hex");
const OTHER_KEY = Buffer.from("fedcba9876543210".repeat(4), "hex");

describe("Encryption", () => {
  describe("encrypt/decrypt", () => {
    it("should round-trip a plaintext value", () => {
      const plaintext = "this is a secret value";
      const encrypted = encrypt(plaintext, KEY);
      encrypted.should.not.equal(plaintext);
      const decrypted = decrypt(encrypted, KEY);
      decrypted.should.equal(plaintext);
    });

    it("should produce a different ciphertext for the same plaintext on each call", () => {
      const plaintext = "this is a secret value";
      const first = encrypt(plaintext, KEY);
      const second = encrypt(plaintext, KEY);
      first.should.not.equal(second);
    });

    it("should fail to decrypt with the wrong key", () => {
      const plaintext = "this is a secret value";
      const encrypted = encrypt(plaintext, KEY);
      (() => decrypt(encrypted, OTHER_KEY)).should.throw();
    });

    it("should fail to decrypt a tampered ciphertext", () => {
      const plaintext = "this is a secret value";
      const encrypted = encrypt(plaintext, KEY);
      const [iv, authTag, ciphertext] = encrypted.split(":");
      const tampered = [iv, authTag, ciphertext.slice(0, -2) + (ciphertext.slice(-2) === "00" ? "ff" : "00")].join(":");
      (() => decrypt(tampered, KEY)).should.throw();
    });
  });
});
