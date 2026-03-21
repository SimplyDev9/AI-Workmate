import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Database,
  Upload,
  Moon,
  Sun,
  BrainCircuit,
} from 'lucide-react';
import apiService from '../services/api';

const Layout = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const location = useLocation();
//   const [darkMode, setDarkMode] = useState(false);
const [darkMode, setDarkMode] = useState(() => {
  const savedTheme = localStorage.getItem('theme');
  return savedTheme === 'dark';
});
  const [isHealthy, setIsHealthy] = useState(null);

  // Check backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const result = await apiService.checkHealth();
      setIsHealthy(result.success);
    };
    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Toggle dark mode
//   useEffect(() => {
//     if (darkMode) {
//       document.documentElement.classList.add('dark');
//     } else {
//       document.documentElement.classList.remove('dark');
//     }
//   }, [darkMode]);
useEffect(() => {
  if (darkMode) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}, [darkMode]);

  const navigation = [
    { name: 'Chat', path: '/', icon: MessageSquare },
    { name: 'Knowledge Base', path: '/knowledge-base', icon: Database },
    { name: 'Upload Document', path: '/upload', icon: Upload },
  ];

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
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Health Status */}
          <div className="flex items-center space-x-2 px-4 py-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isHealthy === null
                  ? 'bg-gray-400'
                  : isHealthy
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-red-500'
              }`}
              data-testid="health-indicator"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isHealthy === null
                ? 'Checking...'
                : isHealthy
                ? 'Backend Connected'
                : 'Backend Offline'}
            </span>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            data-testid="dark-mode-toggle"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            <span className="text-sm">
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {React.cloneElement(children, { messages, setMessages })}
      </div>
    </div>
  );
};

export default Layout;