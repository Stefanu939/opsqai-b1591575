; OPSQAI-Setup.nsi
; Phase 2: installs Node runtime, PostgreSQL Portable, Caddy, and registers
; all OPSQAI Windows Services. Wizard UI (Electron) lands in Phase 3 —
; Phase 2 uses NSIS built-in pages and expects config values to be provided
; either interactively or via /S silent-install command-line switches.

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"

!ifndef VERSION
  !define VERSION "0.0.0-dev"
!endif
!ifndef PAYLOAD_DIR
  !define PAYLOAD_DIR "..\..\payload"
!endif

Name           "OPSQAI Self-Hosted"
OutFile        "..\..\build\artifacts\OPSQAI-Setup.exe"
Unicode        true
InstallDir     "$PROGRAMFILES64\OPSQAI"
InstallDirRegKey HKLM "Software\OPSQAI" "InstallDir"
RequestExecutionLevel admin
BrandingText   "OPSQAI ${VERSION}"
SetCompressor  /SOLID lzma

VIProductVersion "${VERSION}.0"
VIAddVersionKey  "ProductName"     "OPSQAI Self-Hosted"
VIAddVersionKey  "CompanyName"     "OPSQAI"
VIAddVersionKey  "FileDescription" "OPSQAI Self-Hosted Installer"
VIAddVersionKey  "FileVersion"     "${VERSION}"
VIAddVersionKey  "ProductVersion"  "${VERSION}"
VIAddVersionKey  "LegalCopyright"  "(c) OPSQAI"

!define MUI_ABORTWARNING
!define MUI_ICON   "assets\opsqai.ico"
!define MUI_UNICON "assets\opsqai.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "German"
!insertmacro MUI_LANGUAGE "Romanian"

; --- Helper macros ---------------------------------------------------------
!macro RegisterService NAME
  DetailPrint "Registering ${NAME}..."
  nsExec::ExecToStack '"$INSTDIR\winsw\${NAME}.exe" install'
  Pop $0
  ${If} $0 <> 0
    DetailPrint "${NAME} install returned $0"
  ${EndIf}
!macroend

!macro StartService NAME
  DetailPrint "Starting ${NAME}..."
  nsExec::ExecToStack '"$INSTDIR\winsw\${NAME}.exe" start'
  Pop $0
!macroend

!macro StopAndUninstallService NAME
  nsExec::ExecToStack '"$INSTDIR\winsw\${NAME}.exe" stop'
  Pop $0
  nsExec::ExecToStack '"$INSTDIR\winsw\${NAME}.exe" uninstall'
  Pop $0
!macroend

; --- Install ---------------------------------------------------------------
Section "OPSQAI Core" SEC_CORE
  SectionIn RO

  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "OPSQAI requires 64-bit Windows 10 (build 17763) or newer."
    Abort
  ${EndIf}

  SetOutPath "$INSTDIR"
  File /r "${PAYLOAD_DIR}\*.*"

  ; --- ProgramData layout ---
  ; NSIS $APPDATA points to CurrentUser; we need ProgramData for machine-wide state.
  ReadEnvStr $R0 "ProgramData"
  ${If} $R0 == ""
    StrCpy $R0 "C:\ProgramData"
  ${EndIf}
  CreateDirectory "$R0\OPSQAI\config"
  CreateDirectory "$R0\OPSQAI\logs"
  CreateDirectory "$R0\OPSQAI\data\pgsql"
  CreateDirectory "$R0\OPSQAI\data\storage"
  CreateDirectory "$R0\OPSQAI\certs"

  ; Register services (order matters for dependency graph).
  !insertmacro RegisterService "OpsqaiDatabase"
  !insertmacro RegisterService "OpsqaiPlatform"
  !insertmacro RegisterService "OpsqaiWorker"
  !insertmacro RegisterService "OpsqaiCaddy"
  !insertmacro RegisterService "OpsqaiUpdater"

  ; Launch the OPSQAI Setup Wizard (Electron, 10 steps) unless the operator
  ; passed /S. For silent installs, an unattended-config JSON file may be
  ; supplied via /CONFIG=<path>. See docs/unattended-install.md.
  IfSilent silent_bootstrap
    DetailPrint "Launching OPSQAI Setup Wizard..."
    ; ExecWait (not nsExec::ExecToLog) — the wizard is a GUI Electron app.
    ; nsExec captures stdio into a pipe and blocks the installer forever
    ; because Electron never drains it (symptom: NSIS hangs on "Launching
    ; OPSQAI Setup Wizard..." with no window ever appearing).
    ExecWait '"$INSTDIR\wizard\OPSQAI-Wizard.exe"' $0
    ${If} $0 <> 0
      DetailPrint "Wizard exited with code $0 — installation not completed"
      Abort "OPSQAI setup was cancelled or failed. See %ProgramData%\OPSQAI\logs for details."
    ${EndIf}
    Goto bootstrap_done
  silent_bootstrap:
    ${GetParameters} $R1
    ${GetOptions} $R1 "/CONFIG=" $R2
    ${If} ${Errors}
      DetailPrint "Silent install: no /CONFIG provided, using placeholders."
      nsExec::ExecToLog '"$INSTDIR\runtime\node\node.exe" "$INSTDIR\services\bootstrap\init.js" --admin-email "admin@localhost" --admin-password "ChangeMe-Silent-1234" --company "OPSQAI"'
      Pop $0
    ${Else}
      DetailPrint "Silent install: applying unattended config from $R2"
      nsExec::ExecToLog '"$INSTDIR\runtime\node\node.exe" "$INSTDIR\services\bootstrap\unattended.js" --config "$R2"'
      Pop $0
    ${EndIf}
    ${If} $0 <> 0
      DetailPrint "bootstrap returned $0 (check %ProgramData%\OPSQAI\logs)"
    ${EndIf}
  bootstrap_done:

  ; --- Desktop + Start Menu shortcuts ---------------------------------------
  ; The shortcut targets the OPSQAI Desktop Shell (Electron) which opens
  ; a native window backed by the local platform, NOT the system browser.
  CreateDirectory "$SMPROGRAMS\OPSQAI"
  CreateShortCut "$SMPROGRAMS\OPSQAI\OPSQAI.lnk" \
    "$INSTDIR\desktop-shell\OPSQAI.exe" "" \
    "$INSTDIR\desktop-shell\OPSQAI.exe" 0 SW_SHOWNORMAL "" \
    "OPSQAI Self-Hosted"
  CreateShortCut "$SMPROGRAMS\OPSQAI\OPSQAI Doctor (logs).lnk" \
    "$INSTDIR\tools\bin\opsqai.cmd" "doctor" \
    "$INSTDIR\assets\opsqai.ico" 0 SW_SHOWMINIMIZED "" \
    "OPSQAI diagnostics"
  CreateShortCut "$SMPROGRAMS\OPSQAI\Uninstall OPSQAI.lnk" \
    "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0

  ; Desktop shortcut for the end user.
  CreateShortCut "$DESKTOP\OPSQAI.lnk" \
    "$INSTDIR\desktop-shell\OPSQAI.exe" "" \
    "$INSTDIR\desktop-shell\OPSQAI.exe" 0 SW_SHOWNORMAL "" \
    "OPSQAI Self-Hosted"

  ; OPSQAI tools are installed under $INSTDIR\tools\bin. Operators can run
  ; them by full path; avoiding a PATH mutation keeps the installer independent
  ; of optional NSIS plugins on clean CI runners.

  ; --- ARP / Uninstall entry ---
  WriteRegStr HKLM "Software\OPSQAI" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\OPSQAI" "Version"    "${VERSION}"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI" \
      "DisplayName"     "OPSQAI Self-Hosted"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI" \
      "DisplayVersion"  "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI" \
      "Publisher"       "OPSQAI"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI" \
      "DisplayIcon"     "$INSTDIR\assets\opsqai.ico"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI" \
      "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI" \
      "QuietUninstallString" "$\"$INSTDIR\Uninstall.exe$\" /S"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI" \
      "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI" \
      "NoRepair" 1

  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI" \
      "EstimatedSize" "$0"
SectionEnd

; --- Uninstall -------------------------------------------------------------
Var KEEP_DATA

Function un.onInit
  StrCpy $KEEP_DATA "1"
  IfSilent skip_prompt 0
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Keep OPSQAI application data (database, uploaded files, configuration) in %ProgramData%\OPSQAI?$\r$\n$\r$\nChoose 'No' to permanently delete everything." \
    IDYES keep IDNO nuke
  keep:
    StrCpy $KEEP_DATA "1"
    Goto skip_prompt
  nuke:
    StrCpy $KEEP_DATA "0"
  skip_prompt:
FunctionEnd

Section "Uninstall"
  ; Stop in reverse dependency order.
  !insertmacro StopAndUninstallService "OpsqaiUpdater"
  !insertmacro StopAndUninstallService "OpsqaiCaddy"
  !insertmacro StopAndUninstallService "OpsqaiWorker"
  !insertmacro StopAndUninstallService "OpsqaiPlatform"
  !insertmacro StopAndUninstallService "OpsqaiDatabase"

  ; Remove shortcuts.
  Delete "$DESKTOP\OPSQAI.lnk"
  RMDir /r "$SMPROGRAMS\OPSQAI"

  RMDir /r "$INSTDIR"

  ${If} $KEEP_DATA == "0"
    ReadEnvStr $R0 "ProgramData"
    ${If} $R0 == ""
      StrCpy $R0 "C:\ProgramData"
    ${EndIf}
    RMDir /r "$R0\OPSQAI"
  ${EndIf}

  DeleteRegKey HKLM "Software\OPSQAI"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI"
SectionEnd
