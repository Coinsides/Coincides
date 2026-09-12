> **Status**: active - executed evidence; prohibited stages and two environment failures remain explicitly disclosed
> **Layer**: Audit / Builder evidence
> **Updated**: 2026-09-12
> **Authoritative**: No

# Isolated complete application startup

The actual server/src/index.ts was launched with tsx, alongside the actual client Vite app with envFile:false and a private API proxy. This was not a component-only mock. The backend and Vite each returned HTTP 200. Ports were allocated by temporary loopback sockets before startup, without touching existing services.

- Scratch: D:/Coinsides/v2.x/Coincides/.codex-tmp/purge-final-verification/browser-lugmcA
- Backend port: 51121; PID: 40708
- Vite port: 51122; PID: 21480
- Paper entry: http://127.0.0.1:51122/__purge_bootstrap
- Board entry: http://127.0.0.1:51122/__purge_bootstrap?board

The startup created synthetic.db, separate canvas-assets/source-blobs/app-data/uploads/TEMP/TMP directories, a new synthetic user, Project, A4 paper, two editable TextFlow paragraphs, one paper freehand object, one Board, its mounted Note and a draggable sticky. Database initialization, migrations and startup sweep operated only on this new database. The local bootstrap entry set only this isolated origin's localStorage using a synthetic fixture login, then navigated into the real application. No token or signing secret was written to audit output.

The processes used spawn with windowsHide:true and detached:true. Raw seed/server/Vite logs and fixture IDs remain in scratch. Two initial failed launch attempts stopped before creating app services (Windows NODE_OPTIONS backslash parsing, then scratch TypeScript module format); both were repaired in the task-local launcher. App-data inside this repository cannot be used for provider credential settings under the existing product rule; no credential-settings test was part of the browser smoke. The unrelated final automated suite uses a new OS TEMP root to obey that rule.

A separate user-gesture synthetic clipboard helper was available at http://127.0.0.1:63502/ with PID 42236. It held no token, credential or database connection. The main builder performed browser actions; this verification subtask did not open or control a browser. Readback and shutdown evidence are recorded separately in browser-readback.json and browser-readback-checks.md.
