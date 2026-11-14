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
  getSession,
  onAuthStateChange,
  signOut,
} from './authClient';
import {
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
        showToast(
          getAuthErrorMessage(
            {
              code: callbackError.code,
              message: callbackError.description,
            },
            AUTH_MESSAGES.authCallbackFailed,
          ),
          'error',
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

    void getSession()
      .then((session) => {
        if (!active) return;

        if (passwordRecoveryRef.current) {
          setIsInitializing(false);
          return;
        }

        if (session?.user) {
          void processSession(session.user, false);
        } else {
          finishWithoutSession();
        }
      })
      .catch((error: unknown) => {
        if (!active) return;

        console.error('Could not retrieve Supabase session:', error);

        if (passwordRecoveryRef.current) {
          setIsInitializing(false);
          return;
        }

        finishWithoutSession();

        const friendlyMessage = getAuthErrorMessage(error, '');

        if (friendlyMessage) {
          showToast(friendlyMessage, 'error');
        }
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
