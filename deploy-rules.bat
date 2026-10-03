@echo off
echo ============================================================
echo   Deploying Firestore Security Rules to Firebase
echo ============================================================
echo.
echo Step 1: Authorizing Firebase CLI with your Google Account...
call npx -y firebase-tools login
echo.
echo Step 2: Deploying rules to project "my-mobile-shop-app"...
call npx -y firebase-tools deploy --only firestore:rules --project my-mobile-shop-app
echo.
echo ============================================================
echo   Rules deployed! You can now refresh your Admin Dashboard.
echo ============================================================
pause
