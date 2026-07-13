
## Problem

On Windows, `install-windows.cmd` prints:

```
[opsqai] install.exe is missing from this folder.
[opsqai] Extract the ZIP again and run install-windows.cmd from the extracted folder.
```

This is the wrapper's own guard, not a bug in `install.exe`. It fires when the `.cmd` is executed from a directory that does **not** contain `install.exe`. On Windows the near-universal cause is:

- The user double-clicked `install-windows.cmd` while still inside the Windows Explorer **ZIP preview**. Explorer silently extracts only that single file into a temporary path such as `C:\Users\<name>\AppData\Local\Temp\Temp1_opsqai-1.0.0-....zip\`, and `install.exe` is not in that temp folder.
- Less commonly, the user copied only `install-windows.cmd` out of the archive.

So the fix is not to remove the guard, but to make the message actionable and detect the ZIP-preview case explicitly.

## Plan

1. **Improve the `.cmd` wrapper** (`INSTALL_WINDOWS_CMD` in `src/lib/installation-package.server.ts`):
   - When `install.exe` is not next to the `.cmd`, detect whether the current directory path contains `\AppData\Local\Temp\` or matches the `Temp1_` / `Temp2_` prefix that Windows uses for ZIP-preview extraction, and print a dedicated message:
     > "It looks like you double-clicked this file from inside the ZIP preview. Right-click the downloaded ZIP → **Extract All…** first, then open the extracted folder and double-click `install-windows.cmd` there."
   - Otherwise fall back to today's generic "Extract the ZIP again…" message.
   - Keep the `pause` and non-zero exit code so the CMD window stays open.

2. **Update the README quick-start** (`renderReadme` in the same file) to state explicitly, as step 1:
   - "Right-click the downloaded ZIP → **Extract All…** — do NOT double-click files inside the Windows ZIP preview, they will not find their siblings."
   - Reorder the Windows bullet so `install-windows.cmd` is the recommended entry point and `install.exe` is a fallback.

3. **No changes** to `install.exe` / Go installer, `install-macos`, `install-linux`, `install.sh`, or the ZIP contents. This is purely a wrapper + docs clarification, and the ZIP already contains `install.exe` (verified in `assembleInstallationPackage`).

4. **Update the test** `src/lib/__tests__/installation-package.test.ts` if it snapshots the wrapper contents, so the new branch is covered.

## Technical details

- Detecting the ZIP-preview temp path in a `.cmd` is a substring check on `%CD%` / `%~dp0`:
  ```bat
  echo %~dp0 | findstr /i "\\AppData\\Local\\Temp\\ Temp1_ Temp2_" >nul
  if not errorlevel 1 ( REM show ZIP-preview message ) else ( REM show generic message )
  ```
- No other files or server functions need to change; the wrapper string is embedded as `INSTALL_WINDOWS_CMD` and re-baked into every generated installation ZIP, so the next download picks up the fix automatically.
- The user will need to re-download the installation package once this ships.
