#!/bin/bash
set -e

echo "🚀 Starting Official Android APK Build..."

BUILD_DIR="/tmp/apk_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/classes"
mkdir -p "$BUILD_DIR/gen"

ANDROID_JAR="/opt/android-sdk/platforms/android-28/android.jar"
MANIFEST="android/app/src/main/AndroidManifest.xml"
RES_DIR="android/app/src/main/res"
ASSETS_DIR="android/app/src/main/assets"
JAVA_SRC="android/app/src/main/java"

# 1. Generate R.java
echo "⚙️ [1/6] Running aapt to generate R.java..."
aapt package -f -m \
  -J "$BUILD_DIR/gen" \
  -M "$MANIFEST" \
  -S "$RES_DIR" \
  -I "$ANDROID_JAR"

# 2. Compile Java sources with javac
echo "⚙️ [2/6] Compiling Java classes with javac (Java 8 compatibility for all Android versions)..."
javac -source 8 -target 8 \
  -bootclasspath "$ANDROID_JAR" \
  -cp "$ANDROID_JAR:$BUILD_DIR/gen" \
  -d "$BUILD_DIR/classes" \
  $(find "$JAVA_SRC" "$BUILD_DIR/gen" -name "*.java")

# 3. Convert bytecode to Dalvik classes.dex
echo "⚙️ [3/6] Running dx to generate classes.dex..."
dx --dex --output="$BUILD_DIR/classes.dex" "$BUILD_DIR/classes"

# 4. Package resources and assets into unaligned APK
echo "⚙️ [4/6] Packaging resources, assets and binary AndroidManifest.xml with aapt..."
aapt package -f \
  -M "$MANIFEST" \
  -S "$RES_DIR" \
  -A "$ASSETS_DIR" \
  -I "$ANDROID_JAR" \
  -F "$BUILD_DIR/unaligned.apk"

cd "$BUILD_DIR"
aapt add unaligned.apk classes.dex
cd - > /dev/null

# 5. Run zipalign 4-byte alignment
echo "⚙️ [5/6] Aligning package with zipalign..."
zipalign -p -f 4 "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/aligned.apk"

# 6. Generate Keystore and Sign APK with apksigner (v1 + v2 + v3 signatures)
echo "⚙️ [6/6] Cryptographically signing APK with apksigner..."
KEYSTORE="/tmp/ishak_release.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias ishak_bot \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass ishak123456 \
    -keypass ishak123456 \
    -dname "CN=Ishak AI Bot, OU=Quotex Automation, O=Ishak AI Pro, L=Dhaka, ST=Dhaka, C=BD"
fi

OUTPUT_APK="public/Ishak_AI_Bot_Quotex_Trader.apk"
OUTPUT_APK2="public/Ishak_AI_Trading_Bot.apk"

apksigner sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:ishak123456 \
  --ks-key-alias ishak_bot \
  --key-pass pass:ishak123456 \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --out "$OUTPUT_APK" \
  "$BUILD_DIR/aligned.apk"

cp "$OUTPUT_APK" "$OUTPUT_APK2"

echo "🔍 Verifying APK signatures..."
apksigner verify --verbose "$OUTPUT_APK"

echo "✅ SUCCESS! Built genuine signed Android APK:"
ls -lh "$OUTPUT_APK"
