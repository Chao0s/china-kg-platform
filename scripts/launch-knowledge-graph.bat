@echo off
REM Launch the Understand-Anything knowledge-graph dashboard for this repo (Windows).
REM Double-click this file, or run it from a terminal. Requires Node.js installed.
REM It resolves dependencies and opens the interactive graph of .understand-anything\knowledge-graph.json.
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo [kg] Node.js is required but was not found on PATH. Install Node.js ^>= 18 from https://nodejs.org
  pause
  exit /b 1
)
node "%~dp0launch-knowledge-graph.mjs" %*
pause
