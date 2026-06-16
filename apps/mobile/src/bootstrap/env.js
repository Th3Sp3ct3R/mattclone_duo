import Constants from 'expo-constants';

export function bootstrapEnv() {
  // Ensure `process.env` exists in RN runtime.
  if (!globalThis.process) globalThis.process = { env: {} };
  if (!globalThis.process.env) globalThis.process.env = {};

  const fromExtra = Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL;
  if (fromExtra && !globalThis.process.env.EXPO_PUBLIC_API_URL) {
    globalThis.process.env.EXPO_PUBLIC_API_URL = String(fromExtra);
  }
}


