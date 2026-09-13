# Palette browser smoke

From the repository root:

```text
node client/scripts/paletteSmoke/verify.mjs
```

The runner starts the actual server and Vite application on ports 5197/5198. Each run creates its own SQLite database, empty dotenv source, asset directories, synthetic account, and Chrome profile beneath `.tmp/palette-validation/smoke/`. It uses the HTTP registration and creation routes to arrange the specimen, then drives production UI with CDP mouse/keyboard input and reads persistence back through the actual API. Occupied ports fail instead of reusing an existing application process. No application build or user database is needed.

Pass a browser executable as the first optional argument. Environments whose isolated browser renderer cannot start with its sandbox may use the repository's existing test-harness convention explicitly:

```text
node client/scripts/paletteSmoke/verify.mjs --isolated-chrome-no-sandbox
```

This flag applies only to the new temporary Chrome process. It does not change the tool/filesystem sandbox, the user's browser profile, or operating-system settings. The receipt records the option. The default keeps the browser sandbox enabled.

The result and final screenshots are written to `docs/audits/2026-09-13-palette-builder/smoke-receipts.json` and `smoke-*.png`. Run-specific server/browser diagnostics stay beneath `.tmp/`; application credentials are synthetic and are not included in the result. The runner closes its server, Vite, and browser on success or failure.

The narrow-viewport check resizes an already-open picker. The existing outer note appearance shell's mobile entry layout is outside this picker smoke.
