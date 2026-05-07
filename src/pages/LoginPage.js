import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  Mail,
  Lock,
  Loader2,
  BrainCircuit,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  MessageSquare,
  Database,
  ShieldCheck,
} from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value) => /\S+@\S+\.\S+/.test(value);
  // const showError = (msg) => {
  //   setError(msg);
  //   setTimeout(() => setError(''), 5000); // clears after 5 seconds
  // };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      // showError('Please fill in all fields.');
      setError('Please fill in all fields.');
      return;
    }
    if (!validateEmail(email)) {
      // showError('Please enter a valid email.');
      setError('Please enter a valid email.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await apiService.login(email, password);

      if (result?.success) {
        // api.js already stored token; now sync AuthContext from server
        await refresh();
        navigate('/');
      } else {
        // showError(result?.error || 'Login failed. Please try again.');
        setError(result?.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      // showError('Something went wrong. Please try again later.');
      setError('Something went wrong. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex bg-gray-50 dark:bg-gray-950"
      data-testid="login-page"
    >
      {/* LEFT — Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600">
        {/* Decorative blurs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] bg-indigo-400/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-fuchsia-500/20 rounded-full blur-3xl" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">AI WorkMate</p>
              <p className="text-xs text-white/70">Knowledge Assistant</p>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-6 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Powered by RAG + Enterprise AI
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Your team's smartest knowledge
              <span className="block bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-transparent">
                companion.
              </span>
            </h1>
            <p className="text-white/80 text-base leading-relaxed">
              Connect documents from SharePoint, upload PDFs, and chat with your
              entire knowledge base — secured by role-based access control.
            </p>

            {/* Feature list */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              {[
                { icon: MessageSquare, text: 'AI-powered conversations with sources' },
                { icon: Database, text: 'Centralized knowledge base' },
                { icon: ShieldCheck, text: 'Enterprise-grade RBAC security' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-white/85">{f.text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} AI WorkMate. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center mb-4">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI WorkMate
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Sign in to continue to your workspace.
            </p>
          </div>

          {error && (
            <div
              className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3"
              data-testid="login-error"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="login-email-input"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white text-sm transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  data-testid="login-password-input"
                  className="w-full pl-11 pr-11 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white text-sm transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit-button"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-indigo-400 disabled:to-indigo-400 text-white font-medium py-3 rounded-lg transition-all text-sm shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              data-testid="signup-link"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;