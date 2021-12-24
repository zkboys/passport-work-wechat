/**
 * Module dependencies.
 */
const Strategy = require('./lib/strategy');
const AccessToken = require('./lib/access_token');

/**
 * Expose `Strategy` directly from package.
 */
exports = module.exports = Strategy;

/**
 * Export constructors.
 */
exports.Strategy = Strategy;

/**
 * Export AccessToken
 */
exports.AccessToken = AccessToken;
