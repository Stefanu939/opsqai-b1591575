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

  ; --- Register services (order matters for dependency graph) ---
  ; Database first so Platform can depend on it.
  !insertmacro RegisterService "OpsqaiDatabase"
  !insertmacro RegisterService "OpsqaiPlatform"
  !insertmacro RegisterService "OpsqaiWorker"
  !insertmacro RegisterService "OpsqaiCaddy"
  !insertmacro RegisterService "OpsqaiUpdater"

  ; Phase 3 wizard hands values to bootstrap; Phase 2 stub creates a minimal
  ; config so services can start. NSIS runs bootstrap only if /S was NOT used
  ; without required parameters — otherwise the wizard supplies them later.
  DetailPrint "Running bootstrap..."
  nsExec::ExecToStack '"$INSTDIR\runtime\node\node.exe" "$INSTDIR\services\bootstrap\init.js" --admin-email "admin@localhost" --admin-password "changeme" --company "OPSQAI"'
  Pop $0
  ${If} $0 <> 0
    DetailPrint "bootstrap returned $0"
  ${EndIf}

  ; Start services in dependency order.
  !insertmacro StartService "OpsqaiDatabase"
  !insertmacro StartService "OpsqaiPlatform"
  !insertmacro StartService "OpsqaiWorker"
  !insertmacro StartService "OpsqaiCaddy"
  !insertmacro StartService "OpsqaiUpdater"

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
Section "Uninstall"
  ; Stop in reverse dependency order.
  !insertmacro StopAndUninstallService "OpsqaiUpdater"
  !insertmacro StopAndUninstallService "OpsqaiCaddy"
  !insertmacro StopAndUninstallService "OpsqaiWorker"
  !insertmacro StopAndUninstallService "OpsqaiPlatform"
  !insertmacro StopAndUninstallService "OpsqaiDatabase"

  ; Phase 4 uninstaller adds the "keep DB / keep documents" dialog.
  ; Phase 2 removes application binaries only; %ProgramData%\OPSQAI is preserved.
  RMDir /r "$INSTDIR"

  DeleteRegKey HKLM "Software\OPSQAI"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI"
SectionEnd
