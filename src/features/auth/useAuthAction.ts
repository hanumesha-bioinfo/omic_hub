import { useCallback, useState } from 'react';
import { useToast } from '../../shared/ui/Toast';
import { getAuthErrorMessage } from './messages';

export type AuthToastType = 'success' | 'error' | 'info';

export interface AuthActionOptions<T> {
  fallbackError: string;
  successMessage?: string | ((result: T) => string);
  successType?: AuthToastType | ((result: T) => AuthToastType);
  onSuccess?: (result: T) => void;
  keepLoadingOnSuccess?: boolean;
  errorLogLabel?: string;
}

export function useAuthAction() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const run = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: AuthActionOptions<T>,
    ): Promise<T | undefined> => {
      setIsLoading(true);

      try {
        const result = await action();

        if (options.successMessage) {
          const message =
            typeof options.successMessage === 'function'
              ? options.successMessage(result)
              : options.successMessage;
          const type =
            typeof options.successType === 'function'
              ? options.successType(result)
              : options.successType ?? 'success';

          showToast(message, type);
        }

        options.onSuccess?.(result);

        if (!options.keepLoadingOnSuccess) {
          setIsLoading(false);
        }

        return result;
      } catch (error: unknown) {
        if (options.errorLogLabel) {
          console.error(options.errorLogLabel, error);
        }

        showToast(getAuthErrorMessage(error, options.fallbackError), 'error');
        setIsLoading(false);
        return undefined;
      }
    },
    [showToast],
  );

  return { isLoading, run };
}
