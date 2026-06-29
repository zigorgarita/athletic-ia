/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Please check your environment variables.'
  );
}

const originalClient = createClient(supabaseUrl, supabaseAnonKey);

let writePermissionChecker: (() => void) | null = null;

export function registerWritePermissionChecker(checker: () => void | null) {
  writePermissionChecker = checker;
}

function verifyWrite() {
  if (writePermissionChecker) {
    writePermissionChecker();
  } else {
    // Default to blocking if no context is registered yet
    throw new Error('No autorizado. La aplicación está en modo solo lectura.');
  }
}

// Proxied supabase client enforcing write protections using Proxy to preserve prototype methods
export const supabase = new Proxy(originalClient, {
  get(target, prop, receiver) {
    if (prop === 'rpc') {
      return (fn: string, args?: any, options?: any) => {
        verifyWrite();
        return target.rpc(fn, args, options);
      };
    }
    if (prop === 'storage') {
      const originalStorage = target.storage;
      return {
        ...originalStorage,
        from(bucket: string) {
          const originalBucket = originalStorage.from(bucket);
          return {
            ...originalBucket,
            upload(path: string, file: any, options?: any) {
              verifyWrite();
              return originalBucket.upload(path, file, options);
            }
          };
        }
      };
    }

    // Bind functions to target to preserve `this` context binding
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
}) as unknown as typeof originalClient;

