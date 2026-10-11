// Sandbox shim: inside restricted sandboxes (e.g. codex workspace-write on
// Windows), libuv's uv_os_get_passwd can fail with a spurious ENOMEM, which
// crashes anything calling os.userInfo() at import time (tsx's temp-dir
// module does). Wrap userInfo with an env-based fallback. Loaded via
// NODE_OPTIONS=--require at builder-dispatch time only; inert when the real
// call succeeds.
const os = require('node:os');
const original = os.userInfo.bind(os);
os.userInfo = function userInfoWithSandboxFallback(options) {
  try {
    return original(options);
  } catch {
    return {
      uid: -1,
      gid: -1,
      username: process.env.USERNAME || process.env.USER || 'coincides-builder',
      homedir: process.env.USERPROFILE || process.env.HOME || os.tmpdir(),
      shell: null,
    };
  }
};
