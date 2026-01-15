# Numbat App

A mobile/desktop app for [Numbat](https://numbat.dev).

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

# 2. Commit and tag (use dots in tag, not +)
git commit -am "Bump version to 1.18.7+1"
git tag v1.18.7.1
git push && git push --tags
```

CI will build and attach `numbat-1.18.7.1.apk` to the GitHub release.
