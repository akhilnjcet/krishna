---
description: How to rebuild the Android APK after making code changes
---

# Update APK After Code Changes

Run these 3 commands from the `frontend` folder:

// turbo-all

## Step 1: Build the latest web code
```
cd d:\AKHIL\krishna\frontend
npm.cmd run build
```

## Step 2: Sync the new build into the Android project
```
cd d:\AKHIL\krishna\frontend
npx.cmd cap sync
```

## Step 3: Generate the updated APK
```
cd d:\AKHIL\krishna\frontend\android
.\gradlew.bat assembleDebug
```

The updated APK will be at:
`d:\AKHIL\krishna\frontend\android\app\build\outputs\apk\debug\app-debug.apk`
