import { create } from "zustand";

import {
  getCurrentUser,
  login as loginApi,
  logout as logoutApi,
  signup as signupApi,
  googleLogin as googleLoginApi,
} from "./auth.api";

import { signInWithGoogleFirebase } from "./firebase.auth";
import { signOutFirebase } from "./firebase.auth";
import type { User as FirebaseUser } from "firebase/auth";

import type {
  AuthUser,
  LoginPayload,
  SignupPayload,
 } from "./auth.types";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  authProvider: "password" | "google" | "oauth" | null;
  firebaseWasSignedIn: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  login: (
    payload: LoginPayload,
  ) => Promise<AuthUser>;

  signup: (
    payload: SignupPayload,
  ) => Promise<AuthUser>;

  googleLogin: () => Promise<AuthUser>;

  restoreSession: () => Promise<void>;
  syncFirebaseUser: (
    firebaseUser: FirebaseUser | null,
  ) => Promise<void>;

  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(
  (set) => ({
    user: null,
    accessToken: null,
    authProvider: null,
    firebaseWasSignedIn: false,

    isLoading: false,

    isInitialized: false,

    login: async (payload) => {
      set({
        isLoading: true,
      });

      try {
        const response =
          await loginApi(payload);

        set({
          user: response.user,
          accessToken: null,
          authProvider: "password",
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

        set({
          user: response.user,
          accessToken: null,
          authProvider: "password",
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

    googleLogin: async () => {
      set({
        isLoading: true,
      });

      try {
        const { idToken } =
          await signInWithGoogleFirebase();

        const response =
          await googleLoginApi({
            id_token: idToken,
          });

        set({
          user: response.user,
          accessToken: null,
          authProvider: "google",
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
      set({
        isLoading: true,
      });

      try {
        const user =
          await getCurrentUser();

        set({
          user,
          accessToken: null,
          isLoading: false,
          isInitialized: true,
        });
      } catch {
        set({
          user: null,
          accessToken: null,
          isLoading: false,
          isInitialized: true,
        });
      }
    },

    syncFirebaseUser: async (firebaseUser) => {
      const currentProvider =
        useAuthStore.getState().authProvider;

      if (firebaseUser) {
        set({
          firebaseWasSignedIn: true,
        });

        if (currentProvider === "google") {
          return;
        }

        const idToken =
          await firebaseUser.getIdToken();
        const response =
          await googleLoginApi({
            id_token: idToken,
          });

        set({
          user: response.user,
          accessToken: null,
          authProvider: "google",
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      const firebaseWasSignedIn =
        useAuthStore.getState().firebaseWasSignedIn;

      if (
        currentProvider === "google" ||
        firebaseWasSignedIn
      ) {
        try {
          await logoutApi();
        } finally {
          set({
            user: null,
            accessToken: null,
            authProvider: null,
            firebaseWasSignedIn: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      }
    },

    logout: async () => {
      set({
        isLoading: true,
      });

      try {
        await logoutApi();
      } catch {
      }

      set({
        authProvider: null,
        firebaseWasSignedIn: false,
      });

      try {
        await signOutFirebase();
      } catch {
      } finally {
        set({
          user: null,
          accessToken: null,
          authProvider: null,
          firebaseWasSignedIn: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    },
  }),
);