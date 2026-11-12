import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "bdmart_access_token";
const REFRESH_TOKEN_KEY = "bdmart_refresh_token";

// In-memory fallback if native SecureStore is unavailable
const memoryStorage: Record<string, string> = {};

export async function saveItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS !== "web" && (await SecureStore.isAvailableAsync())) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    }
  } catch {
    // fallback to memory
  }
  memoryStorage[key] = value;
}

export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS !== "web" && (await SecureStore.isAvailableAsync())) {
      return await SecureStore.getItemAsync(key);
    }
  } catch {
    // fallback to memory
  }
  return memoryStorage[key] || null;
}

export async function deleteItem(key: string): Promise<void> {
  try {
    if (Platform.OS !== "web" && (await SecureStore.isAvailableAsync())) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
  } catch {
    // fallback
  }
  delete memoryStorage[key];
}

export async function saveAuthTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  await Promise.all([
    saveItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    saveItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function getAuthTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
  ]);
}
