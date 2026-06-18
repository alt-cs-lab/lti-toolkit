/**
 * @file Cache of JwksClient instances, keyed by JWKS URL
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

import { JwksClient } from "jwks-rsa";

const CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

const clients = new Map();

/**
 * Get a cached JwksClient for the given JWKS URL, creating one if needed.
 * Reusing the client (rather than constructing a new one per call) lets
 * jwks-rsa's own in-memory caching actually persist across requests.
 *
 * @param {string} jwksUri - the JWKS URL to fetch signing keys from
 * @returns {JwksClient} a cached JwksClient instance for that URL
 */
function getJwksClient(jwksUri) {
  if (!clients.has(jwksUri)) {
    clients.set(
      jwksUri,
      new JwksClient({
        jwksUri,
        requestHeaders: {},
        timeout: 1000,
        cache: true,
        cacheMaxAge: CACHE_MAX_AGE_MS,
      }),
    );
  }
  return clients.get(jwksUri);
}

/**
 * Clear all cached JwksClient instances, forcing the next call to getJwksClient()
 * for any URL to construct a fresh client. Useful if a key rotation is known to have
 * happened and the cache shouldn't be trusted until the next TTL expiry.
 */
function clearJwksCache() {
  clients.clear();
}

export { getJwksClient, clearJwksCache };
