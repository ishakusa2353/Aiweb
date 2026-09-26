import { execSync } from 'child_process';
import path from 'path';

console.log('🚀 Running genuine Android APK generation pipeline...');
execSync('node scripts/generate-overlay-html.js', { stdio: 'inherit' });
execSync('bash scripts/compile-native-apk.sh', { stdio: 'inherit' });
console.log('🎉 Genuine native signed APK build complete!');
