/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
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
      return new Proxy(originalStorage, {
        get(targetStorage, propStorage, receiverStorage) {
          if (propStorage === 'from') {
            return (bucket: string) => {
              const originalBucket = targetStorage.from(bucket);
              return new Proxy(originalBucket, {
                get(targetBucket, propBucket, receiverBucket) {
                  if (propBucket === 'upload') {
                    return (path: string, file: any, options?: any) => {
                      verifyWrite();
                      return targetBucket.upload(path, file, options);
                    };
                  }
                  if (propBucket === 'remove' || propBucket === 'empty' || propBucket === 'move' || propBucket === 'copy') {
                    // Also protect other write operations in storage just in case
                    return (...args: any[]) => {
                      verifyWrite();
                      return (targetBucket as any)[propBucket](...args);
                    };
                  }
                  const val = Reflect.get(targetBucket, propBucket, receiverBucket);
                  if (typeof val === 'function') {
                    return val.bind(targetBucket);
                  }
                  return val;
                }
              });
            };
          }
          const valStorage = Reflect.get(targetStorage, propStorage, receiverStorage);
          if (typeof valStorage === 'function') {
            return valStorage.bind(targetStorage);
          }
          return valStorage;
        }
      });
    }

    // Bind functions to target to preserve `this` context binding
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
}) as unknown as typeof originalClient;

