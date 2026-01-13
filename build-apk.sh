#!/bin/bash

set -euo pipefail

export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$HOME/Android/Sdk/ndk/26.1.10909125"

cargo tauri android build --target aarch64 --apk true

$HOME/Android/Sdk/platform-tools/adb install src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk
