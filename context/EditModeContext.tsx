'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type UserRole = 'admin' | 'editor' | 'reader';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  canEdit: boolean;
  pass?: string;
}

interface EditModeContextType {
  isEditMode: boolean;
  currentUser: UserProfile | null;
  unlockEditing: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  lockEditing: () => void;
  reportWriteAction: () => void;
  verifyWritePermission: () => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const lockEditing = useCallback(() => {
    setCurrentUser(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reportWriteAction = useCallback(() => {
    if (!currentUser?.canEdit) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      lockEditing();
      console.log('Sesión de edición cerrada por inactividad.');
    }, INACTIVITY_TIMEOUT);
  }, [currentUser, lockEditing]);

  const unlockEditing = useCallback(async (username: string, pass: string) => {
    const userLower = username.trim().toLowerCase();

    // Verificación de credenciales 100% del lado del servidor (seguridad garantizada sin expesión en cliente)
    try {
      const res = await fetch('/api/auth/verify-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userLower, pass }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.profile) {
        const profile: UserProfile = {
          id: data.profile.id,
          name: data.profile.name,
          role: data.profile.role,
          canEdit: data.profile.canEdit,
          pass: pass,
        };
        setCurrentUser(profile);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          lockEditing();
        }, INACTIVITY_TIMEOUT);

        return { success: true };
      }

      return { success: false, error: data.error || 'Usuario o contraseña incorrectos' };
    } catch {
      return { success: false, error: 'Error de conexión con el servidor de autenticación' };
    }
  }, [lockEditing]);

  const verifyWritePermission = useCallback(() => {
    if (!currentUser || !currentUser.canEdit) {
      throw new Error('No autorizado. La aplicación está en modo solo lectura.');
    }
    reportWriteAction();
  }, [currentUser, reportWriteAction]);

  // Clean up timer on unmount and register write permission checker
  useEffect(() => {
    import('@/lib/supabase').then(({ registerWritePermissionChecker }) => {
      registerWritePermissionChecker(() => {
        verifyWritePermission();
      });
    });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [verifyWritePermission]);

  const isEditMode = !!(currentUser && currentUser.canEdit);

  return (
    <EditModeContext.Provider
      value={{
        isEditMode,
        currentUser,
        unlockEditing,
        lockEditing,
        reportWriteAction,
        verifyWritePermission,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}
