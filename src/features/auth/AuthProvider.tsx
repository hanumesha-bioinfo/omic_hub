import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AuthUser } from '@supabase/supabase-js';
import {
  initialLocationHash,
  initialLocationSearch,
} from '../../lib/supabase';
import { DEFAULT_USER, StorageService } from '../../services/storage';
import { useToast } from '../../shared/ui/Toast';
import type { UserProfile } from '../../types';
import {
  clearAuthCallbackParams,
  onAuthStateChange,
  resolveInitialSession,
  signOut,
} from './authClient';
import {
  getAuthCallbackKind,
  isPasswordRecoveryCallback,
  parseAuthCallbackError,
} from './callback';
import {
  clearDemoRecruiterSession,
  getDemoRecruiterSession,
  isDemoRecruiterProfile,
  markDemoRecruiterSession,
} from './demoRecruiter';
import { AUTH_MESSAGES, getAuthErrorMessage } from './messages';
import {
  deriveProfileFromAuthUser,
  loadOrCreateProfile,
  mapProfileToUserProfile,
} from './profile';

export type AuthStatus =
  | 'initializing'
  | 'authenticated'
  | 'unauthenticated'
  | 'password-recovery';

export interface LoginOptions {
  demo?: boolean;
}

export interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  login: (user: UserProfile, options?: LoginOptions) => void;
  logout: () => Promise<void>;
  completePasswordRecovery: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface ApplyUserOptions {
  demo?: boolean;
  recordActivity?: boolean;
  announce?: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { showToast } = useToast();
  const initialRecovery = isPasswordRecoveryCallback(
    initialLocationHash,
    initialLocationSearch,
  );
  const [isPasswordRecovery, setIsPasswordRecovery] =
    useState(initialRecovery);
  const passwordRecoveryRef = useRef(initialRecovery);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const processedAuthUserId = useRef<string | null>(null);
  const announcedUserId = useRef<string | null>(null);
  const callbackErrorHandled = useRef(false);
  const callbackNoticeShown = useRef(false);

  const applyUser = useCallback(
    (authenticatedUser: UserProfile, options: ApplyUserOptions = {}) => {
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      setIsInitializing(false);
      StorageService.saveUser(authenticatedUser);
      StorageService.setAuthenticated(true);

      if (options.demo) {
        markDemoRecruiterSession(authenticatedUser);
      } else {
        clearDemoRecruiterSession();
      }

      if (options.recordActivity) {
        StorageService.addActivity({
          type: 'resume',
          title: 'Signed In to Omic Hub',
          description: `Authenticated as ${authenticatedUser.name} (${authenticatedUser.role})`,
          badge: 'Session Active',
        });
      }

      if (
        options.announce &&
        announcedUserId.current !== authenticatedUser.id
      ) {
        announcedUserId.current = authenticatedUser.id;
        showToast(
          AUTH_MESSAGES.welcomeUser(authenticatedUser.name),
          'success',
        );
      }
    },
    [showToast],
  );

  const login = useCallback(
    (authenticatedUser: UserProfile, options: LoginOptions = {}) => {
      applyUser(authenticatedUser, {
        demo: options.demo,
        recordActivity: true,
        announce: true,
      });
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    let remoteError: unknown = null;

    try {
      await signOut();
    } catch (error: unknown) {
      remoteError = error;
    }

    if (remoteError) {
      console.error('Supabase sign-out error:', remoteError);
    }

    clearDemoRecruiterSession();
    clearAuthCallbackParams();
    passwordRecoveryRef.current = false;
    processedAuthUserId.current = null;
    announcedUserId.current = null;
    setIsPasswordRecovery(false);
    setIsAuthenticated(false);
    setIsInitializing(false);
    setUser(DEFAULT_USER);
    StorageService.setAuthenticated(false);
    showToast(AUTH_MESSAGES.signedOut, 'info');
  }, [showToast]);

  const completePasswordRecovery = useCallback(async () => {
    try {
      await signOut();
    } catch (error: unknown) {
      console.error('Sign-out after password recovery failed:', error);
    }

    clearDemoRecruiterSession();
    clearAuthCallbackParams();
    passwordRecoveryRef.current = false;
    processedAuthUserId.current = null;
    announcedUserId.current = null;
    setIsPasswordRecovery(false);
    setIsAuthenticated(false);
    setIsInitializing(false);
    setUser(DEFAULT_USER);
    StorageService.setAuthenticated(false);
  }, []);

  useEffect(() => {
    let active = true;
    let initializationResolved = false;
    const callbackKind = getAuthCallbackKind(
      initialLocationHash,
      initialLocationSearch,
    );
    const hasAuthCallback = callbackKind !== 'none';
    let callbackInProgress = hasAuthCallback;

    const notifyCallbackFailure = (message: string) => {
      if (callbackNoticeShown.current) return;

      callbackNoticeShown.current = true;
      showToast(message, 'error');
    };

    const finishWithoutSession = () => {
      if (!active || initializationResolved) return;

      if (processedAuthUserId.current || passwordRecoveryRef.current) {
        setIsInitializing(false);
        return;
      }

      initializationResolved = true;

      const storedDemo = getDemoRecruiterSession();
      const legacyDemo =
        !storedDemo && StorageService.isAuthenticated()
          ? StorageService.getUser()
          : null;
      const demoProfile =
        storedDemo ??
        (isDemoRecruiterProfile(legacyDemo) ? legacyDemo : null);

      if (demoProfile) {
        applyUser(demoProfile, {
          demo: true,
          recordActivity: false,
          announce: false,
        });
        return;
      }

      setUser(DEFAULT_USER);
      setIsAuthenticated(false);
      setIsInitializing(false);
    };

    const processSession = async (
      authUser: AuthUser,
      announce: boolean,
    ) => {
      if (processedAuthUserId.current === authUser.id) return;

      processedAuthUserId.current = authUser.id;
      initializationResolved = true;

      try {
        const profile = await loadOrCreateProfile(authUser);

        if (!active) return;

        applyUser(mapProfileToUserProfile(authUser, profile), {
          recordActivity: announce,
          announce,
        });
      } catch (error: unknown) {
        if (!active) return;

        console.error('Supabase session/profile error:', error);

        const fallbackProfile = deriveProfileFromAuthUser(authUser);

        applyUser(mapProfileToUserProfile(authUser, fallbackProfile), {
          recordActivity: false,
          announce: false,
        });
        showToast(
          getAuthErrorMessage(error, AUTH_MESSAGES.profileLoadFailed),
          'error',
        );
      }
    };

    if (!callbackErrorHandled.current) {
      callbackErrorHandled.current = true;

      const callbackError = parseAuthCallbackError(
        initialLocationHash,
        initialLocationSearch,
      );

      if (callbackError) {
        clearAuthCallbackParams();
        notifyCallbackFailure(
          getAuthErrorMessage(
            {
              code: callbackError.code,
              message: callbackError.description,
            },
            AUTH_MESSAGES.authCallbackFailed,
          ),
        );
      }
    }

    const {
      data: { subscription },
    } = onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryRef.current = true;
        initializationResolved = true;
        setIsPasswordRecovery(true);
        setIsInitializing(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (callbackInProgress) {
          callbackInProgress = false;
          notifyCallbackFailure(AUTH_MESSAGES.authCallbackFailed);
        }

        clearDemoRecruiterSession();
        clearAuthCallbackParams();
        passwordRecoveryRef.current = false;
        processedAuthUserId.current = null;
        announcedUserId.current = null;
        initializationResolved = true;
        setIsPasswordRecovery(false);
        setIsAuthenticated(false);
        setIsInitializing(false);
        setUser(DEFAULT_USER);
        StorageService.setAuthenticated(false);
        return;
      }

      if (passwordRecoveryRef.current) return;

      if (event === 'USER_UPDATED') {
        processedAuthUserId.current = null;
      }

      if (!session?.user) {
        if (event === 'INITIAL_SESSION') {
          finishWithoutSession();
        }
        return;
      }

      const shouldAnnounce = event === 'SIGNED_IN';

      setTimeout(() => {
        if (active && !passwordRecoveryRef.current) {
          void processSession(session.user, shouldAnnounce);
        }
      }, 0);
    });

    void resolveInitialSession()
      .then((session) => {
        callbackInProgress = false;

        if (!active) return;

        if (hasAuthCallback) {
          clearAuthCallbackParams();
        }

        if (passwordRecoveryRef.current) {
          if (session?.user) {
            setIsInitializing(false);
            return;
          }

          // A recovery link that produced no session cannot continue; leaving
          // the recovery screen up would strand the user.
          passwordRecoveryRef.current = false;
          setIsPasswordRecovery(false);
          notifyCallbackFailure(AUTH_MESSAGES.resetLinkExpired);
          finishWithoutSession();
          return;
        }

        if (session?.user) {
          // PKCE recovery callbacks arrive as `?code=...`; the recovery type is
          // carried by the stored verifier and surfaced through the
          // PASSWORD_RECOVERY event, not the URL. Defer one macrotask so that
          // event can switch the UI to the reset screen before we load the
          // profile for the normal authenticated shell.
          if (hasAuthCallback) {
            setTimeout(() => {
              if (active && !passwordRecoveryRef.current) {
                void processSession(session.user, false);
              }
            }, 0);
          } else {
            void processSession(session.user, false);
          }
          return;
        }

        finishWithoutSession();

        // supabase-js silently ignores a `?code=` callback when it cannot find
        // the matching verifier (for example when the link was opened in a
        // different browser). Treat a callback URL without a session as an
        // incomplete sign-in instead of bouncing back to the sign-in page.
        if (callbackKind === 'pkce' || callbackKind === 'implicit') {
          notifyCallbackFailure(AUTH_MESSAGES.oauthIncomplete);
        }
      })
      .catch((error: unknown) => {
        callbackInProgress = false;

        if (!active) return;

        if (hasAuthCallback) {
          clearAuthCallbackParams();
        }

        console.error('Could not retrieve Supabase session:', error);

        if (passwordRecoveryRef.current) {
          passwordRecoveryRef.current = false;
          setIsPasswordRecovery(false);
          notifyCallbackFailure(
            getAuthErrorMessage(error, AUTH_MESSAGES.resetLinkExpired),
          );
          finishWithoutSession();
          return;
        }

        finishWithoutSession();
        notifyCallbackFailure(
          getAuthErrorMessage(
            error,
            hasAuthCallback
              ? AUTH_MESSAGES.authCallbackFailed
              : AUTH_MESSAGES.sessionRestoreFailed,
          ),
        );
      });

    return () => {
      active = false;
      processedAuthUserId.current = null;
      subscription.unsubscribe();
    };
  }, [applyUser, showToast]);

  const status: AuthStatus = isPasswordRecovery
    ? 'password-recovery'
    : isInitializing
      ? 'initializing'
      : isAuthenticated
        ? 'authenticated'
        : 'unauthenticated';

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isAuthenticated,
      isPasswordRecovery,
      user,
      setUser,
      login,
      logout,
      completePasswordRecovery,
    }),
    [
      status,
      isAuthenticated,
      isPasswordRecovery,
      user,
      login,
      logout,
      completePasswordRecovery,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
