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

## Releasing

The app version tracks the underlying numbat version with a build number suffix (e.g., `1.18.7+2` for the second app release on numbat 1.18.7).

```bash
# 1. Update version in src-tauri/Cargo.toml
version = "1.18.7+1"

# 2. Update versionCode in src-tauri/tauri.conf.json (required for Play Store)
#    Formula: major*1000000 + minor*10000 + patch*100 + build
#    Example: 1.18.7+1 → 1180701
"android": { "versionCode": 1180701 }

# 3. Commit and tag (use dots in tag, not +)
git commit -am "Bump version to 1.18.7+1"
git tag v1.18.7.1
git push && git push --tags
```

CI will build and attach `numbat-1.18.7.1.apk` and `numbat-1.18.7.1.aab` to the GitHub release.
