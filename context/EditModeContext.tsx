'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type UserRole = 'admin' | 'editor' | 'reader';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  canEdit: boolean;
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

const AUTHORIZED_USERS: Record<string, { pass: string; name: string; role: UserRole }> = {
  zigor: {
    pass: process.env.NEXT_PUBLIC_EDIT_PASSWORD_ZIGOR || 'indautxuzigor2026',
    name: 'Zigor',
    role: 'admin',
  },
  aitor: {
    pass: process.env.NEXT_PUBLIC_EDIT_PASSWORD_AITOR || 'indautxuaitor2026',
    name: 'Aitor',
    role: 'editor',
  },
};

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
    const authData = AUTHORIZED_USERS[userLower];

    if (authData && authData.pass === pass) {
      const profile: UserProfile = {
        id: userLower,
        name: authData.name,
        role: authData.role,
        canEdit: authData.role === 'admin' || authData.role === 'editor',
      };
      setCurrentUser(profile);
      
      // Start/reset the inactivity timer
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lockEditing();
      }, INACTIVITY_TIMEOUT);

      return { success: true };
    }

    return { success: false, error: 'Usuario o contraseña incorrectos' };
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
