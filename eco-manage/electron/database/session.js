const { AsyncLocalStorage } = require('async_hooks');

// Global AsyncLocalStorage instance for managing request-scoped state
const session = new AsyncLocalStorage();

module.exports = session;
