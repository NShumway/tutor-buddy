'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-slate-800 rounded-lg shadow-xl border border-slate-700">
        <div>
          <h2 className="text-3xl font-bold text-center text-slate-100">AI Study Companion</h2>
          <p className="mt-2 text-center text-slate-400">Sign in to continue</p>
        </div>
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-slate-600 rounded bg-slate-700 text-slate-100 focus:border-blue-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-slate-600 rounded bg-slate-700 text-slate-100 focus:border-blue-500 focus:outline-none"
              placeholder="Enter your password"
            />
          </div>
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-slate-400 text-center mt-4">
          Don't have an account?{' '}
          <a href="/signup" className="text-blue-400 hover:text-blue-300">
            Sign up
          </a>
        </p>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-400 text-center mb-3">Demo Accounts (password: password123)</p>
          <div className="space-y-2 text-xs">
            <button
              type="button"
              onClick={() => { setEmail('sarah@example.com'); setPassword('password123'); }}
              className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 transition-colors"
            >
              <span className="font-medium">sarah@example.com</span>
              <span className="text-slate-500"> - High performer</span>
            </button>
            <button
              type="button"
              onClick={() => { setEmail('marcus@example.com'); setPassword('password123'); }}
              className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 transition-colors"
            >
              <span className="font-medium">marcus@example.com</span>
              <span className="text-slate-500"> - Needs nudge</span>
            </button>
            <button
              type="button"
              onClick={() => { setEmail('emily@example.com'); setPassword('password123'); }}
              className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 transition-colors"
            >
              <span className="font-medium">emily@example.com</span>
              <span className="text-slate-500"> - Struggling</span>
            </button>
            <button
              type="button"
              onClick={() => { setEmail('david@example.com'); setPassword('password123'); }}
              className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 transition-colors"
            >
              <span className="font-medium">david@example.com</span>
              <span className="text-slate-500"> - Multi-goal</span>
            </button>
            <button
              type="button"
              onClick={() => { setEmail('isabella@example.com'); setPassword('password123'); }}
              className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 transition-colors"
            >
              <span className="font-medium">isabella@example.com</span>
              <span className="text-slate-500"> - Inactive</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
