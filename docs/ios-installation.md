# iOS Installation Guide

This guide explains how to build and install Numbat on your iPhone or iPad.

## Prerequisites

**For building the IPA:**
- macOS with Xcode installed
- Rust toolchain with iOS target: `rustup target add aarch64-apple-ios`
- Tauri CLI: `cargo install tauri-cli`

## Important Notes

### Free Apple ID Limitations

With a free Apple ID (no paid Developer Program):
- Apps expire after **7 days** and must be reinstalled
- Maximum of 3 apps can be installed at a time
- You must re-sign the app weekly

> [!TIP]
> On the bright side: You'll never miss an update again!

### Troubleshooting

**"Untrusted Developer" error on iPhone:**
Go to Settings → General → VPN & Device Management → Trust the certificate

## Building the IPA

**First time only:** Open the Xcode project and set your Development Team:
1. `open src-tauri/gen/apple/numbat-app.xcodeproj`
2. Select target **numbat-app_iOS**
3. Go to **Signing & Capabilities**
4. Select your **Team** (Personal Team or your Apple ID)

Then build:
```bash
./build.sh --ios
```

This creates `numbat.ipa` in the project root.

## Installation Options

### Option 1: Install via Xcode (Recommended for macOS)

1. Connect your iPhone to your Mac
2. Open Xcode
3. Go to **Window** → **Devices and Simulators**
4. Select your iPhone in the left sidebar
5. Drag `numbat.ipa` into the **Installed Apps** section

The installation starts immediately. You may see a warning - this is normal for self-signed apps.

6. Trust the developer certificate on your iPhone:
   - Go to **Settings** → **General** → **VPN & Device Management**
   - Tap your developer certificate
   - Tap **Trust**

<!-- Screenshot: iPhone Settings showing trust dialog -->

### Option 2: Install via Sideloadly (Windows or macOS)

1. Download [Sideloadly](https://sideloadly.io/)
2. **macOS only:** If you see "Sideloadly cannot be opened because it is from an unidentified developer":
   - Go to **System Settings** → **Privacy & Security**
   - Scroll down and click **Open Anyway**

> [!NOTE]
> Apple just wants to make sure you *really* want to install apps on your own device.

3. Connect your iPhone
4. Drag `numbat.ipa` into Sideloadly
5. Enter your Apple ID
6. Click **Start**
7. Trust the developer certificate on your iPhone (same steps as Option 1)

### Option 3: Development Mode (for active development)

If you want to build and run directly from Xcode with hot-reload:

1. Start the Tauri dev server in a terminal:
   ```bash
   cargo tauri ios dev
   ```

2. Keep the terminal open
3. Open the Xcode project:
   ```bash
   open src-tauri/gen/apple/numbat-app.xcodeproj
   ```

4. Select your iPhone as the build target
5. Go to **Signing & Capabilities** and select your Personal Team
6. Click **Run** (Cmd+R)

### Option 4: AltStore (not tested)

[AltStore](https://altstore.io/) can automatically refresh your apps in the background when your iPhone and computer are on the same WiFi network - no manual 7-day reinstall needed.

1. Install AltServer on your Mac/PC
2. Install AltStore on your iPhone via AltServer
3. Transfer `numbat.ipa` to your iPhone
4. Open with AltStore to install

AltServer must be running on your computer for auto-refresh to work.
