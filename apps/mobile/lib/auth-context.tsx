import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  UserProfileResponse,
  RegisterUserDto,
  UpdateProfileDto,
} from "@bdmart/contracts";
import { mobileApiClient } from "./api-client";
import { saveAuthTokens, clearAuthTokens, getAuthTokens } from "./secure-store";

interface MobileOtpVerifyResponse {
  isNewUser?: boolean;
  user?: UserProfileResponse;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

interface MobileRegisterResponse {
  data?: {
    user?: UserProfileResponse;
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

interface MobileAuthContextType {
  user: UserProfileResponse | null;
  isLoading: boolean;
  error: string | null;
  requestOtp: (
    phone: string,
    purpose?: string,
  ) => Promise<{ success: boolean; cooldownSeconds?: number }>;
  verifyOtp: (
    phone: string,
    otp: string,
  ) => Promise<{ isNewUser: boolean; user?: UserProfileResponse }>;
  register: (data: RegisterUserDto) => Promise<UserProfileResponse>;
  updateProfile: (data: UpdateProfileDto) => Promise<UserProfileResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const MobileAuthContext = createContext<MobileAuthContextType | undefined>(
  undefined,
);

export function MobileAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { accessToken } = await getAuthTokens();
      if (!accessToken) {
        setUser(null);
        return;
      }
      const res = await mobileApiClient.get<{ data: UserProfileResponse }>(
        "/v1/users/me",
      );
      if (res.data) {
        setUser(res.data);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const requestOtp = async (phone: string, purpose = "LOGIN") => {
    setError(null);
    try {
      const res = await mobileApiClient.post<{
        success: boolean;
        cooldownSeconds?: number;
      }>("/v1/auth/otp/request", { phone, purpose });
      return { success: true, cooldownSeconds: res.cooldownSeconds || 60 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    setError(null);
    try {
      const res = await mobileApiClient.post<MobileOtpVerifyResponse>(
        "/v1/auth/otp/verify",
        { phone, otp },
      );
      if (res.tokens?.accessToken && res.tokens?.refreshToken) {
        await saveAuthTokens({
          accessToken: res.tokens.accessToken,
          refreshToken: res.tokens.refreshToken,
        });
      }
      if (res.user) {
        setUser(res.user);
      }
      return {
        isNewUser: Boolean(res.isNewUser),
        user: res.user,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    }
  };

  const register = async (data: RegisterUserDto) => {
    setError(null);
    try {
      const res = await mobileApiClient.post<MobileRegisterResponse>(
        "/v1/auth/register",
        data,
      );
      if (res.data?.tokens?.accessToken && res.data?.tokens?.refreshToken) {
        await saveAuthTokens({
          accessToken: res.data.tokens.accessToken,
          refreshToken: res.data.tokens.refreshToken,
        });
      }
      if (res.data?.user) {
        setUser(res.data.user);
        return res.data.user;
      }
      throw new Error("Registration succeeded but no profile returned.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    }
  };

  const updateProfile = async (data: UpdateProfileDto) => {
    setError(null);
    try {
      const res = await mobileApiClient.patch<{ data: UserProfileResponse }>(
        "/v1/users/me",
        data,
      );
      if (res.data) {
        setUser(res.data);
        return res.data;
      }
      throw new Error("Failed to update profile.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await mobileApiClient.post("/v1/auth/logout");
    } finally {
      await clearAuthTokens();
      setUser(null);
    }
  };

  return (
    <MobileAuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        requestOtp,
        verifyOtp,
        register,
        updateProfile,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </MobileAuthContext.Provider>
  );
}

export function useMobileAuth() {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error("useMobileAuth must be used within MobileAuthProvider");
  }
  return context;
}
