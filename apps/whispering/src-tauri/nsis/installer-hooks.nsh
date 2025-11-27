; Whispering NSIS Installer Hooks
; This file is included by the Tauri NSIS installer to handle custom installation tasks

; NSIS_HOOK_POSTINSTALL
; Called after all files are installed to $INSTDIR
; We need to move vulkan-1.dll from resources/ to the exe directory
; because Windows needs DLLs next to the executable for load-time linking
!macro NSIS_HOOK_POSTINSTALL
  ; Check if the DLL exists in resources and copy it to exe directory
  ${If} ${FileExists} "$INSTDIR\resources\vulkan-1.dll"
    CopyFiles /SILENT "$INSTDIR\resources\vulkan-1.dll" "$INSTDIR\vulkan-1.dll"
    Delete "$INSTDIR\resources\vulkan-1.dll"
  ${EndIf}
!macroend

; NSIS_HOOK_POSTUNINSTALL
; Called after uninstallation to clean up any remaining files
!macro NSIS_HOOK_POSTUNINSTALL
  ; Clean up the DLL if it exists
  Delete "$INSTDIR\vulkan-1.dll"
!macroend
