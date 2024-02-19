#!/bin/bash

set -euo pipefail

export JAVA_HOME="$HOME/android-studio/jbr"
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$HOME/Android/Sdk/ndk/26.2.11394342"

cargo tauri android build --target aarch64 --apk

$HOME/Android/Sdk/platform-tools/adb install src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
