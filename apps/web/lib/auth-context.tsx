"use client";

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
import { apiClient } from "./api-client";

interface OtpVerifyResponse {
  isNewUser?: boolean;
  user?: UserProfileResponse;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

interface RegisterResponse {
  user: UserProfileResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface AuthContextType {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get<UserProfileResponse>("/v1/users/me");
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
      const res = await apiClient.post<{
        success: boolean;
        cooldownSeconds?: number;
      }>("/v1/auth/otp/request", { phone, purpose });
      const cooldown =
        typeof res.cooldownSeconds === "number" ? res.cooldownSeconds : 60;
      return { success: true, cooldownSeconds: cooldown };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    setError(null);
    try {
      const res = await apiClient.post<OtpVerifyResponse>(
        "/v1/auth/otp/verify",
        { phone, otp },
      );
      const verifyData = res as unknown as OtpVerifyResponse;
      if (verifyData.tokens?.accessToken) {
        apiClient.setToken(verifyData.tokens.accessToken);
      }
      if (verifyData.user) {
        setUser(verifyData.user);
      }
      return {
        isNewUser: Boolean(verifyData.isNewUser),
        user: verifyData.user,
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
      const res = await apiClient.post<RegisterResponse>(
        "/v1/auth/register",
        data,
      );
      const regData = res.data as RegisterResponse | undefined;
      if (regData?.tokens?.accessToken) {
        apiClient.setToken(regData.tokens.accessToken);
      }
      if (regData?.user) {
        setUser(regData.user);
        return regData.user;
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
      const res = await apiClient.patch<UserProfileResponse>(
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
      await apiClient.post("/v1/auth/logout");
    } finally {
      apiClient.setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
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
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
