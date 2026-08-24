import { create } from "zustand";

import {
  getCurrentUser,
  login as loginApi,
  logout as logoutApi,
  signup as signupApi,
} from "./auth.api";

import type {
  AuthUser,
  LoginPayload,
  SignupPayload,
} from "./auth.types";

const ACCESS_TOKEN_KEY = "f1_access_token";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (
    payload: LoginPayload,
  ) => Promise<AuthUser>;

  signup: (
    payload: SignupPayload,
  ) => Promise<AuthUser>;

  restoreSession: () => Promise<void>;

  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(
  (set) => ({
    user: null,
    accessToken:
      localStorage.getItem(
        ACCESS_TOKEN_KEY,
      ),
    isLoading: false,
    isInitialized: false,

    login: async (payload) => {
      set({
        isLoading: true,
      });

      try {
        const response =
          await loginApi(payload);

        localStorage.setItem(
          ACCESS_TOKEN_KEY,
          response.access_token,
        );

        set({
          user: response.user,
          accessToken:
            response.access_token,
          isLoading: false,
          isInitialized: true,
        });

        return response.user;
      } catch (error) {
        set({
          isLoading: false,
        });

        throw error;
      }
    },

    signup: async (payload) => {
      set({
        isLoading: true,
      });

      try {
        const response =
          await signupApi(payload);

        localStorage.setItem(
          ACCESS_TOKEN_KEY,
          response.access_token,
        );

        set({
          user: response.user,
          accessToken:
            response.access_token,
          isLoading: false,
          isInitialized: true,
        });

        return response.user;
      } catch (error) {
        set({
          isLoading: false,
        });

        throw error;
      }
    },

    restoreSession: async () => {
      const token =
        localStorage.getItem(
          ACCESS_TOKEN_KEY,
        );

      if (!token) {
        set({
          isInitialized: true,
          user: null,
          accessToken: null,
        });

        return;
      }

      set({
        isLoading: true,
      });

      try {
        const user =
          await getCurrentUser();

        set({
          user,
          accessToken: token,
          isLoading: false,
          isInitialized: true,
        });
      } catch {
        localStorage.removeItem(
          ACCESS_TOKEN_KEY,
        );

        set({
          user: null,
          accessToken: null,
          isLoading: false,
          isInitialized: true,
        });
      }
    },

    logout: async () => {
      set({
        isLoading: true,
      });

      try {
        await logoutApi();
      } catch {
        // Even if the backend logout fails,
        // clear the local authentication state.
      } finally {
        localStorage.removeItem(
          ACCESS_TOKEN_KEY,
        );

        set({
          user: null,
          accessToken: null,
          isLoading: false,
          isInitialized: true,
        });
      }
    },
  }),
);