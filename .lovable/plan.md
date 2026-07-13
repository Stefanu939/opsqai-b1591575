## Plan

1. **Make `install.exe` stay open on Windows**
   - Add a Windows-only “press Enter to close” pause at the end of the installer.
   - Also pause before exiting on errors, so users can read why it stopped instead of the CMD window disappearing.

2. **Improve Windows launch behavior**
   - Keep the normal console output when run from CMD/PowerShell.
   - When double-clicked, make the installer show the final success/error message and wait for input.

3. **Clean up Windows console output**
   - Disable ANSI color escape codes on Windows so messages don’t show strange characters in CMD.

4. **Keep macOS/Linux unchanged**
   - Do not add pauses on macOS/Linux, because terminal users expect the command to exit normally.

5. **Rebuild/package path**
   - Update the Go installer source and build script behavior if needed so the next generated ZIP contains the corrected Windows `install.exe`.
   - Note: the existing uploaded binary asset may need to be regenerated/re-uploaded after this code change so production ZIPs include the fixed executable.

## Technical details

- The likely cause is that Windows accepts and launches `install.exe`, but double-click execution opens a temporary console that closes immediately when the process exits or errors.
- I will implement this in the Go installer, focused on `main.go` / utility helpers, without changing unrelated app features.