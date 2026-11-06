/**
 * integrations/agent-desktop/adapter/index.js
 * CommonJS export interface for SUBBU Agent Desktop integration.
 */

const { AgentDesktopNodeClient, executeRaw, EXECUTABLE, LAUNCHER_EXE } = require('./client');
const { AgentDesktopNodeAdapter } = require('./adapter');
const permissions = require('./permissions');

module.exports = {
  AgentDesktopNodeClient,
  AgentDesktopNodeAdapter,
  executeRaw,
  EXECUTABLE,
  LAUNCHER_EXE,
  ...permissions,
};

