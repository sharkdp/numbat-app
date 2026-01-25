# Release Process

This document describes how to prepare a new release of numbat-app.

## Version Scheme

The app version tracks the underlying Numbat version with a build number suffix:
- Format: `MAJOR.MINOR.PATCH+BUILD` (e.g., `1.20.0+1`)
- The build number resets to 1 when bumping to a new Numbat version

Android uses a numeric version code calculated as:
```
versionCode = major*1000000 + minor*10000 + patch*100 + build
```
Example: `1.20.0+1` → `1200001`

## Files to Update

When preparing a release, update the version in these files:

| File | Fields |
|------|--------|
| `src-tauri/Cargo.toml` | `version`, `numbat` dependency version |
| `src-tauri/tauri.conf.json` | `bundle.android.versionCode` |
| `src-tauri/gen/android/app/tauri.properties` | `tauri.android.versionName`, `tauri.android.versionCode` |
| `src-tauri/gen/apple/numbat-app_iOS/Info.plist` | `CFBundleShortVersionString`, `CFBundleVersion` |
| `src-tauri/gen/apple/project.yml` | `CFBundleShortVersionString`, `CFBundleVersion` |

## Steps

1. **Update Numbat dependency** in `src-tauri/Cargo.toml`:
   ```toml
   numbat = { version = "1.20", ... }
   ```

2. **Update app version** in `src-tauri/Cargo.toml`:
   ```toml
   version = "1.20.0+1"
   ```

3. **Update Cargo.lock**:
   ```bash
   cargo update -p numbat
   ```

4. **Update Android version** in `src-tauri/tauri.conf.json`:
   ```json
   "versionCode": 1200001
   ```

5. **Update Android properties** in `src-tauri/gen/android/app/tauri.properties`:
   ```properties
   tauri.android.versionName=1.20.0+1
   tauri.android.versionCode=1200001
   ```

6. **Update iOS version** in both:
   - `src-tauri/gen/apple/numbat-app_iOS/Info.plist`
   - `src-tauri/gen/apple/project.yml`

   Set `CFBundleShortVersionString` and `CFBundleVersion` to `1.20.0`

7. **Verify the build**:
   ```bash
   cargo check --manifest-path src-tauri/Cargo.toml
   ```

8. **Commit and tag** (use dots in tag, not +):
   ```bash
   git commit -am "Bump version to 1.20.0+1"
   git tag v1.20.0.1
   git push && git push --tags
   ```

CI will build and attach `numbat-1.20.0.1.apk` and `numbat-1.20.0.1.aab` to the GitHub release.
