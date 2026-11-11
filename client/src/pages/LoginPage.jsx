import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success('Signed in to StockFlow.');
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@stockflow.com');
    setPassword('Admin@123');
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            <Boxes className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            Sign in to StockFlow
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Simple inventory management for your business.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@stockflow.com"
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder-neutral-400 transition-colors focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-3 pr-9 text-sm text-neutral-950 placeholder-neutral-400 transition-colors focus:border-neutral-950 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {submitting ? 'Signing in...' : 'Continue'}
              {!submitting && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </form>

          <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-900">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Fill Demo Admin Credentials
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-neutral-500 dark:text-neutral-400">
          New here?{' '}
          <Link
            to="/register"
            className="font-medium text-neutral-950 underline underline-offset-4 hover:text-neutral-700 dark:text-white dark:hover:text-neutral-300"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
