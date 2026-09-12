> **Status**: active - read-only persistence checks PASS
> **Layer**: Audit / Builder evidence
> **Updated**: 2026-09-12
> **Authoritative**: No

# Browser smoke database readback

After the main builder completed real-browser operations and reloads, an independent read-only SQLite connection opened only the explicit synthetic.db created for this order. The connection used readonly:true and fileMustExist:true, with no init/migration, user table or credential access. Raw rows: [browser-readback.json](browser-readback.json).

| Persisted behavior | Observed value | Result |
|---|---|---|
| First paper paragraph | Suffix " Verified after purge." in plain_text and TextFlow unit; values agree | PASS |
| Paper wall drag | content inset left=107.0530612244898, right=72 | PASS |
| Skin selection | notes.metadata.skin.preset=warm-paper | PASS |
| Pasted image | active media NoteBlock references clipboard.png, natural dimensions 180 x 90 | PASS |
| Physical asset | Managed isolated PNG exists, stored and actual byte size both 495 | PASS |
| Board chalk drag | sticky moved from seeded (550,100) to persisted (768,252) | PASS |
| Existing paper ink | Same seeded object remains active freehand with three original points | PASS |

These values confirm persisted application state after the browser reload checks reported by the main builder. This receipt does not substitute for their screenshots or claim that this subtask operated the browser. All checks were executed by check-readback.mjs and exited zero.

## Service shutdown

After readback and the main builder's explicit completion message, only the three task services were stopped. WMI/CIM process queries were unavailable (access denied), so identity was checked through Get-Process name/start time plus native netstat listener ownership. All were node processes bound to the expected task ports, with start times matching their task launch-state file creation within 0.058 seconds:

| Service | PID | Port | Start-time delta from task receipt | Outcome |
|---|---:|---:|---:|---|
| Backend | 40708 | 51121 | 0.0067935 seconds | Stopped |
| Vite | 21480 | 51122 | 0.0028821 seconds | Stopped |
| Clipboard helper | 42236 | 63502 | 0.0576619 seconds | Stopped |

No other process, existing application service or user database was touched. Scratch fixture data remains available for audit; no recursive deletion was performed.
