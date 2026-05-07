import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext({
  permissions: [],
  roles: [],
  loading: true,
  refresh: () => {},
});

export function AuthProvider({ children }) {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles]             = useState([]);
  const [loading, setLoading]         = useState(true);

  const refresh = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    const res = await apiService.getMe();

    if (res.success) {
      const perms = res.data.permissions || [];
      const rs    = res.data.roles || [];
      setPermissions(perms);
      setRoles(rs);
      // keep sessionStorage consistent (UI convenience only — NOT used for auth)
      sessionStorage.setItem('permissions', JSON.stringify(perms));
      sessionStorage.setItem('roles', JSON.stringify(rs));
    } else {
      // token invalid or user deactivated — force logout
      sessionStorage.clear();
      setPermissions([]);
      setRoles([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ permissions, roles, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);