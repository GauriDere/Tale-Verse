@echo off
echo Stopping any existing TaleVerse server on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

echo Cleaning build output...
if not exist "target\classes" mkdir target\classes
del /S /Q target\classes\* 2>nul

echo Compiling Java code...
javac -cp "lib/*" -d target/classes src/main/java/backend/*.java
if %errorlevel% neq 0 (
    echo Compilation failed.
    exit /b %errorlevel%
)

echo Starting TaleVerse Server...
java -cp "target/classes;lib/*" backend.TaleverseBackend
