import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Registration failed. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 glassmorphism p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -left-12 h-40 w-40 rounded-full bg-accent/5 blur-3xl"></div>
        <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-accentSoft/5 blur-3xl"></div>
        
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt="HireFlow Logo" className="h-16 w-16 object-contain rounded-xl shadow-lg shadow-accent/10" />
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-ink">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-ink/65">
            Sign up to get started as an HR Administrator
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-ink">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                placeholder="hr@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ink placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-ink/65">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent hover:text-accent-hover transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
