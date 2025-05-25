@echo off
echo Changing to RollodexApp directory...
cd /d "d:\rollodexNEW\RollodexApp"

echo.
echo ===== Git Status =====
git status

echo.
echo ===== Adding all changes to staging =====
git add .

echo.
echo ===== Committing changes =====
git commit -m "Update: UI improvements and bug fixes"

echo.
echo ===== Pushing to remote repository =====
git push origin main

echo.
echo ===== GitHub upload complete! =====
pause
