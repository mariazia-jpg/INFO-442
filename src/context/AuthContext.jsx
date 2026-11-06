import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, logIn, logOut, signUp, subscribe } from '../services/accounts.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => subscribe(() => setUser(getCurrentUser())), []);

  const value = useMemo(() => ({ user, signUp, logIn, logOut }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** { user, signUp, logIn, logOut } — user is null when logged out. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
