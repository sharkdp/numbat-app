#!/bin/bash

set -euo pipefail

# Default to APK
BUILD_BUNDLE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--bundle)
            BUILD_BUNDLE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -b, --bundle    Build AAB (Android App Bundle) instead of APK"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$HOME/Android/Sdk/ndk/26.1.10909125"


# Signing configuration - source from external file for security
if [ -f "$HOME/.numbat-signing.env" ]; then
    source "$HOME/.numbat-signing.env"
else
    echo "ERROR: Missing signing config. Create ~/.numbat-signing.env with:"
    echo '  export KEYSTORE_PATH="/path/to/keystore"'
    echo '  export KEYSTORE_PASSWORD="your_password"'
    echo '  export KEY_ALIAS="numbat"'
    echo '  export KEY_PASSWORD="your_password"'
    exit 1
fi

if [ "$BUILD_BUNDLE" = true ]; then
    cargo tauri android build --target aarch64
    BUNDLE_PATH="src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab"
    cp "$BUNDLE_PATH" ./numbat.aab
    echo ""
    echo "Signed release AAB: $(realpath "./numbat.aab")"
else
    cargo tauri android build --target aarch64 --apk true
    APK_PATH="src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk"
    cp "$APK_PATH" ./numbat.apk
    echo ""
    echo "Signed release APK: $(realpath "./numbat.apk")"
fi
