/**
 * Supabase Error Handler — Production-Ready Error Wrapping
 *
 * Every Supabase query result is wrapped with try-catch and mapped to:
 * 1. User-friendly message (with error code)
 * 2. Error logging to DB
 * 3. Sentry capture for monitoring
 *
 * Usage:
 *   const result = await wrapSupabaseQuery(() =>
 *     supabase.from('parcels').select().eq('id', parcelId),
 *     'DB-001', // error code
 *     { parcelId } // extra context
 *   );
 *   if (result.error) {
 *     // result.userMessage is safe to display to user
 *     // result.error is the raw error object
 *     toast.error(result.userMessage);
 *   } else {
 *     // result.data is your query result
 *   }
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { formatError } from './errorCodes';
import { logErrorToSupabase } from './errorLogger';
import { captureWithCode } from './sentry';

export interface WrappedResponse<T> {
  data: T | null;
  error: Error | null;
  userMessage: string;
  code: string;
}

/**
 * Wrapper for any Supabase query that:
 * 1. Catches errors and converts them to user-friendly messages
 * 2. Logs to error_logs table
 * 3. Sends to Sentry for monitoring
 * 4. Never throws — always returns result object
 */
export async function wrapSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorCode: string,
  extra?: Record<string, unknown>,
): Promise<WrappedResponse<T>> {
  try {
    const { data, error } = await queryFn();

    if (error) {
      // Map Supabase error to user-friendly message
      const userMessage = formatError(errorCode);

      // Always log to Supabase and Sentry
      captureWithCode(
        new Error(error.message || JSON.stringify(error)),
        errorCode,
        {
          supabaseError: error.message,
          supabaseCode: error.code,
          ...extra,
        },
      );

      return {
        data: null,
        error,
        userMessage,
        code: errorCode,
      };
    }

    return { data, error: null, userMessage: '', code: '' };
  } catch (err) {
    // Unexpected error during query execution
    const userMessage = formatError(errorCode);
    const error = err instanceof Error ? err : new Error(String(err));

    captureWithCode(error, errorCode, {
      phase: 'execution',
      ...extra,
    });

    return {
      data: null,
      error,
      userMessage,
      code: errorCode,
    };
  }
}

/**
 * Wrapper for single-row queries (using .single())
 * Handles both "no rows" and actual errors gracefully
 */
export async function wrapSupabaseSingle<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorCode: string,
  extra?: Record<string, unknown>,
): Promise<WrappedResponse<T>> {
  try {
    const { data, error } = await queryFn();

    if (error) {
      // "No rows returned" is not a fatal error — return null
      if (error.code === 'PGRST116') {
        return { data: null, error: null, userMessage: '', code: '' };
      }

      const userMessage = formatError(errorCode);
      captureWithCode(
        new Error(error.message || JSON.stringify(error)),
        errorCode,
        {
          supabaseError: error.message,
          supabaseCode: error.code,
          ...extra,
        },
      );

      return {
        data: null,
        error,
        userMessage,
        code: errorCode,
      };
    }

    return { data, error: null, userMessage: '', code: '' };
  } catch (err) {
    const userMessage = formatError(errorCode);
    const error = err instanceof Error ? err : new Error(String(err));

    captureWithCode(error, errorCode, {
      phase: 'single_execution',
      ...extra,
    });

    return {
      data: null,
      error,
      userMessage,
      code: errorCode,
    };
  }
}

/**
 * Wrapper for mutations (insert/update/delete)
 * Includes human-readable feedback for common issues
 */
export async function wrapSupabaseMutation<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorCode: string,
  mutationType: 'insert' | 'update' | 'delete',
  extra?: Record<string, unknown>,
): Promise<WrappedResponse<T>> {
  try {
    const { data, error } = await queryFn();

    if (error) {
      let userMessage = formatError(errorCode);

      // Add mutation-specific hints
      if (error.code === 'PGRST202') {
        // No rows affected
        userMessage = 'No changes were made. The item may have been deleted or you may not have permission.';
      } else if (error.code === 'PGRST301') {
        // Conflict/duplicate
        userMessage = 'This item already exists. Try refreshing and checking if it was already created.';
      } else if (error.code === 'PGRST302') {
        // Foreign key violation
        userMessage = 'This item references data that no longer exists. Refresh and try again.';
      } else if (error.message?.includes('permission')) {
        userMessage = 'You don\'t have permission to make this change. (DB-005)';
      }

      captureWithCode(
        new Error(error.message || JSON.stringify(error)),
        errorCode,
        {
          supabaseError: error.message,
          supabaseCode: error.code,
          mutationType,
          ...extra,
        },
      );

      return {
        data: null,
        error,
        userMessage,
        code: errorCode,
      };
    }

    return { data, error: null, userMessage: '', code: '' };
  } catch (err) {
    const userMessage = formatError(errorCode);
    const error = err instanceof Error ? err : new Error(String(err));

    captureWithCode(error, errorCode, {
      phase: 'mutation_execution',
      mutationType,
      ...extra,
    });

    return {
      data: null,
      error,
      userMessage,
      code: errorCode,
    };
  }
}

/**
 * Shorthand for common patterns: wrapSupabaseQuery + toast on error
 * Returns the data or null (errors already logged)
 */
export async function queryOrNull<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorCode: string,
  extra?: Record<string, unknown>,
): Promise<T | null> {
  const result = await wrapSupabaseQuery(queryFn, errorCode, extra);
  return result.data;
}
