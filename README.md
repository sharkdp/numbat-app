# Numbat App

A mobile/desktop app for [Numbat](https://numbat.dev).

You can find prebuilt APKs for Android [here](https://github.com/sharkdp/numbat-app/releases).

<img src="https://github.com/user-attachments/assets/2374b7c7-9129-4d49-927a-a8babd06c08c" width="300">


## Building

**Desktop:**
```bash
cargo tauri dev        # Development
cargo tauri build      # Release
```

**Android** (requires Android SDK/NDK):
```bash
./build.sh             # Build APK
./build.sh --bundle    # Build AAB for Play Store
```

**iOS** (requires macOS + Xcode):
```bash
./build.sh --ios       # Build IPA
```
See [iOS Installation Guide](docs/ios-installation.md) for detailed instructions.

## Releasing

See [Release Process](docs/release-process.md) for detailed instructions.

## Contributing (iOS)

If you're working on iOS, install the pre-commit hook to prevent accidentally committing your personal Development Team ID:

```bash
pip install pre-commit
pre-commit install
```
