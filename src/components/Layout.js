import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  MessageSquare,
  Database,
  Upload,
  Moon,
  Sun,
  BrainCircuit,
  Cloud,
  ShieldCheck,
  LogOut,
  Mic,
  LayoutDashboard,   
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // const [messages, setMessages] = useState([]);
  const { permissions } = useAuth();
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark'
  );
  const [isHealthy, setIsHealthy] = useState(null);

  // 🔌 Health check (silent)
  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      const result = await apiService.checkHealth();
      if (isMounted) setIsHealthy(result.success);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 🌙 Dark mode
  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // 🔓 Logout
  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  // 🔐 RBAC Navigation
  const navigation = [];

  if (permissions.includes('chat')) {
    navigation.push({ name: 'Chat', path: '/', icon: MessageSquare });
    // Voice Assistant sits next to Chat — same 'chat' permission required
    navigation.push({ name: 'Voice Assistant', path: '/voice', icon: Mic });
  }

  if (permissions.includes('ingest')) {
    navigation.push({
      name: 'Knowledge Base',
      path: '/knowledge-base',
      icon: Database,
    });
    navigation.push({
      name: 'Upload Document',
      path: '/upload',
      icon: Upload,
    });
    navigation.push({
      name: 'SharePoint Upload',
      path: '/sharepoint',
      icon: Cloud,
    });
  }
if (permissions.includes('manage_users')) {
    // ── Dashboard (admin only) — sits above Admin Panel ──────────────
    navigation.push({ name: 'Dashboard',  path: '/dashboard', icon: LayoutDashboard });
    navigation.push({ name: 'Admin Panel',path: '/admin',     icon: ShieldCheck });
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">

      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">

        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-lg flex items-center justify-center">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                AI WorkMate
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Knowledge Assistant
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon     = item.icon;
            const isActive = location.pathname === item.path;
            // ── Section divider before Dashboard ──────────────────
            const isDashboard = item.path === '/dashboard';
 
            return (
              <React.Fragment key={item.path}>
                {isDashboard && (
                  <div className="pt-2 pb-1">
                    <p className="px-4 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                      Analytics
                    </p>
                  </div>
                )}
                <Link
                  to={item.path}
                  data-testid={`nav-${item.name.toLowerCase().replace(/ /g, '-')}`}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">

          {/* Health */}
          <div className="flex items-center space-x-2 px-4 py-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isHealthy === null
                  ? 'bg-gray-400'
                  : isHealthy
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isHealthy === null
                ? 'Checking...'
                : isHealthy
                ? 'Backend Connected'
                : 'Backend Offline'}
            </span>
          </div>

          {/* Dark Mode */}
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            data-testid="toggle-dark-mode"
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="text-sm">
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>

        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* <Outlet context={{ messages, setMessages }} /> */}
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;