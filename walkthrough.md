# Walkthrough: Krishna ERP – Lodge & Building Manager

The Lodge & Building Manager module is now fully integrated with a focus on security, ease of use, and automated management.

## 🚀 Key Features

### 1. Secure Tenant Access (New PIN System)
The room dashboard is now protected by a **Dynamic PIN System**. 
- **How it works**: When an admin checks in a tenant, a unique 4-digit PIN is generated.
- **Login**: Tenants access their dashboard via **Home > Krishna Building > Room Selection > Enter PIN**.
- **Security**: The PIN automatically expires and clears upon **Checkout**, preventing previous tenants from accessing the dashboard.

### 2. Admin Command Center
Accessible via the hidden link at the bottom of the Lodge Home screen.
- **Manage Rooms**: Check-in/Check-out tenants with a single tap.
- **Bill Control**: Add or settle Electricity and Water bills individually.
- **PIN Recovery**: Admins can see the current PIN for every room in the "Rooms" tab if a tenant forgets it.
- **Income Analytics**: The "Overview" tab now features a detailed breakdown of income from Rent, Electricity, and Water.

### 3. Smart Notifications
A system-wide **Alert Hub** monitors room status in real-time.
- **Tenant Alerts**: Persistent banners appear at the top of the app if Rent is due or bills are pending.
- **Dashboard Badges**: A pulsing red indicator appears on the "Krishna Building" button when action is required.

### 4. Emergency SOS & Quick Support
- **SOS Button**: Instant calls to the administrator for emergencies.
- **Report System**: Categorized issue reporting (Electricity, Water, Plumbing, etc.) for quick resolution tracking.
- **WhatsApp Integration**: Direct one-to-one chat link with the building manager.

## 🛠️ How to use (Quick Start)

### For Admin:
1. Go to **Lodge Home** and tap **Admin Panel** at the bottom.
2. Login with the default PIN: `1234`.
3. In the **Rooms** tab, tap "Assign Tenant" for Room 101.
4. Fill in the details and tap "Initialize". The system will **Show the Access PIN** which you should share with the tenant.

### For Tenant:
1. Go to **Lodge Home** and tap **Krishna Building**.
2. Select your room (e.g., Room 101).
3. Enter the 4-digit PIN provided by the admin.
4. You are now logged in! View your bills, pay rent via UPI, or report an issue.

## 📄 APK PDF Download Fix & Rebuild
- **Root Cause Fix**: Standard `doc.save()` links fail silently on Android WebViews. Replaced direct `doc.save()` calls across all screens (`lodgeReceiptService.js`, `residencyAcknowledgementPdf.js`, `RoomDashboard.jsx`, `LodgeBillingManager.jsx`, `LodgeAdminDashboard.jsx`) with `savePDF()`.
- **Native Android Integration**: `savePDF()` delegates file saving to `window.Android.downloadBase64File`, which saves PDF files directly to the Android `Downloads` directory (with fallbacks for Android 10+ scoped storage), triggers `MediaScannerConnection`, shows a download Toast notification, and posts a system notification allowing users to tap to open the PDF. On Capacitor native fallback, it invokes Capacitor Filesystem and Native Share sheets.

## ✅ Verification Results
- [x] PIN Generation on Check-in: **Passed**
- [x] PIN Clearing on Check-out: **Passed**
- [x] Authentication Guard for Room Dashboard: **Passed**
- [x] Admin Income Reporting: **Passed**
- [x] Automated Due Date Alerts: **Passed**
- [x] Web Frontend Build (`npm run build`): **Passed**
- [x] Capacitor Web Sync (`npx cap sync`): **Passed**
- [x] Android Debug APK Build (`gradlew assembleDebug`): **Passed**
- [x] Android Release Signed APK Build (`gradlew assembleRelease`): **Passed**

> [!TIP]
> **Release Signed APK** (Keystore: `krishna-release-new.jks` | v1.0.8 / Code 7):  
> 📍 `d:\AKHIL\krishna\release-output\krishna-v2.20-pdf-fixed-release-signed.apk`  
> 📍 `d:\AKHIL\krishna\release-output\krishna-release-signed.apk`  
>  
> **Debug APK**:  
> 📍 `d:\AKHIL\krishna\frontend\android\app\build\outputs\apk\debug\app-debug.apk`
