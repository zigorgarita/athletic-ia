' ============================================================================
' ATHLETIC IA - LANZADOR SILENCIOSO RFEF BRIDGE (P3.7)
' Ejecuta scripts\start-rfef-bridge.bat en segundo plano sin ventana de consola
' ============================================================================

Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strBatPath = strScriptDir & "\start-rfef-bridge.bat"

objShell.Run "%comspec% /c " & Chr(34) & strBatPath & Chr(34), 0, False
