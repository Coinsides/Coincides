// Preload for my scratch backends: the server listens on '<ip>' (hard-coded) and this machine's firewall is off,
// so rewrite that host to 127.0.0.1 at run time. The code under test is not touched (same-source hashes still hold).
import net from 'node:net';
const orig = net.Server.prototype.listen;
net.Server.prototype.listen = function patchedListen(...args) {
  if (typeof args[0] === 'number' && (args[1] === '<ip>' || args[1] === '::')) args[1] = '127.0.0.1';
  else if (args[0] && typeof args[0] === 'object' && (args[0].host === '<ip>' || args[0].host === '::' || args[0].host === undefined)) args[0] = { ...args[0], host: '127.0.0.1' };
  return orig.apply(this, args);
};
