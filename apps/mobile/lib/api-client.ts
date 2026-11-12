import { Platform } from "react-native";
import { getAuthTokens, saveAuthTokens, clearAuthTokens } from "./secure-store";

const DEFAULT_API_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:4000/api"
    : "http://localhost:4000/api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

class MobileApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const { accessToken } = await getAuthTokens();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes("/auth/refresh")) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.request<T>(endpoint, options);
          }
        }

        const errorMessage =
          data.message || data.error || `HTTP error ${response.status}`;
        throw new Error(
          Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage,
        );
      }

      return data as T;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  }

  /**
   * Refreshes access token with single-flight mutex.
   * Prevents parallel refresh calls from racing when multiple endpoints return 401.
   */
  async refreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const { refreshToken } = await getAuthTokens();
        if (!refreshToken) return false;

        const idempotencyKey = `mobile-${Date.now()}-${Math.random().toString(36).substring(2)}`;

        const res = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": idempotencyKey,
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          await clearAuthTokens();
          return false;
        }

        const json = await res.json();
        if (json.data?.accessToken && json.data?.refreshToken) {
          await saveAuthTokens({
            accessToken: json.data.accessToken,
            refreshToken: json.data.refreshToken,
          });
          return true;
        }
        return false;
      } catch {
        await clearAuthTokens();
        return false;
      }
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  get<T = unknown>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const mobileApiClient = new MobileApiClient(API_BASE_URL);
