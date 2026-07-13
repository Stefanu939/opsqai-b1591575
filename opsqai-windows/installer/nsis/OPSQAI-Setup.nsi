; OPSQAI-Setup.nsi
; Phase 1 skeleton: silent install/uninstall, ARP entry, WinSW "hello" service.
; Wizard (Electron) is wired in Phase 3.
;
; Build:
;   makensis /DVERSION=1.0.0 /DPAYLOAD_DIR=..\..\payload OPSQAI-Setup.nsi
;
; Signing is handled by the CI pipeline (see build/ci/build-windows.yml) via
; signtool /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a OPSQAI-Setup.exe

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

; --- UI --------------------------------------------------------------------
; Phase 1 uses the built-in MUI2 pages. Phase 3 replaces InstFiles with a
; call to installer/wizard (Electron) via nsExec::ExecToStack.

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

; --- Install ---------------------------------------------------------------
Section "OPSQAI Core" SEC_CORE
  SectionIn RO

  ${If} ${RunningX64}
  ${Else}
    MessageBox MB_ICONSTOP "OPSQAI requires 64-bit Windows 10 (build 17763) or newer."
    Abort
  ${EndIf}

  SetOutPath "$INSTDIR"
  File /r "${PAYLOAD_DIR}\*.*"

  ; ProgramData layout
  CreateDirectory "$APPDATA\..\..\ProgramData\OPSQAI\config"
  CreateDirectory "$APPDATA\..\..\ProgramData\OPSQAI\logs"
  CreateDirectory "$APPDATA\..\..\ProgramData\OPSQAI\data"
  CreateDirectory "$APPDATA\..\..\ProgramData\OPSQAI\certs"

  ; --- Register WinSW "hello" service (Phase 1 smoke test) ---
  DetailPrint "Registering OpsqaiHello service..."
  nsExec::ExecToStack '"$INSTDIR\winsw\OpsqaiHello.exe" install'
  Pop $0
  ${If} $0 <> 0
    DetailPrint "WinSW install returned $0"
  ${EndIf}
  nsExec::ExecToStack '"$INSTDIR\winsw\OpsqaiHello.exe" start'
  Pop $0

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
  DetailPrint "Stopping and removing OpsqaiHello service..."
  nsExec::ExecToStack '"$INSTDIR\winsw\OpsqaiHello.exe" stop'
  Pop $0
  nsExec::ExecToStack '"$INSTDIR\winsw\OpsqaiHello.exe" uninstall'
  Pop $0

  ; Phase 1: remove application only. Phase 4 uninstaller adds the
  ; "remove data / keep DB / keep documents" dialog.
  RMDir /r "$INSTDIR"

  DeleteRegKey HKLM "Software\OPSQAI"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OPSQAI"
SectionEnd
