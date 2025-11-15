@echo off
echo Deploying database...
call npx cds deploy --to sqlite
echo Database deployed!
pause
