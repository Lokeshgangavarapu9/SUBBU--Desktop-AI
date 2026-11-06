/**
 * integrations/agent-desktop/adapter/permissions.js
 * CommonJS permission and whitelist rules for desktop automation.
 */

const PERMITTED_LAUNCH_APPS = new Set([
  'notepad',
  'notepad.exe',
  'calc',
  'calculator',
  'calc.exe',
  'calculator.exe',
  'explorer',
  'explorer.exe',
  'chrome',
  'chrome.exe',
  'msedge',
  'msedge.exe',
  'edge',
  'code',
  'code.cmd',
]);

const BLOCKED_PATTERNS = [
  ';', '&', '|', '>', '<', '`', '$', '%',
  'powershell', 'cmd.exe', 'certutil', 'bitsadmin', 'curl', 'wget', 'rmdir', 'del'
];

function isValidRef(ref) {
  if (typeof ref !== 'string') return false;
  return /^@[a-zA-Z0-9_-]+:e\d+$/.test(ref);
}

function sanitizeArgument(arg) {
  if (typeof arg !== 'string') return '';
  for (const pattern of BLOCKED_PATTERNS) {
    if (arg.includes(pattern)) {
      throw new Error(`Argument contains disallowed safety pattern: "${pattern}"`);
    }
  }
  return arg;
}

function validateLaunchTarget(app) {
  if (!app || typeof app !== 'string') {
    throw new Error('Application name must be a non-empty string.');
  }
  const cleanApp = app.trim().toLowerCase();
  const baseName = cleanApp.split(/[\\/]/).pop();
  if (!PERMITTED_LAUNCH_APPS.has(cleanApp) && !PERMITTED_LAUNCH_APPS.has(baseName)) {
    throw new Error(`Application "${app}" is not in the permitted whitelist.`);
  }
  if (baseName === 'calculator' || baseName === 'calculator.exe') {
    return 'calc';
  }
  if (baseName === 'edge') {
    return 'msedge';
  }
  return baseName;
}

module.exports = {
  PERMITTED_LAUNCH_APPS,
  isValidRef,
  sanitizeArgument,
  validateLaunchTarget,
};

