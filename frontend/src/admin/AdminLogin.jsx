import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Compass, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-white dark:bg-cafe-charcoal/80 border border-cafe-gold/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Back button */}
        <button
          onClick={() => {
            const table = localStorage.getItem('tableNumber') || '1';
            navigate(`/?table=${table}`);
          }}
          className="absolute top-4 left-4 text-xs font-bold text-cafe-wood dark:text-cafe-gold hover:underline flex items-center gap-1 transition"
          title="Return to Customer Storefront"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Menu</span>
        </button>

        {/* Decorative elements */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cafe-gold/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-cafe-wood/10 rounded-full blur-2xl" />

        <div className="text-center mb-8 relative mt-4">
          <div className="w-12 h-12 bg-cafe-gold/10 text-cafe-gold rounded-full flex items-center justify-center mx-auto mb-3 border border-cafe-gold/30">
            <Compass className="w-6 h-6 animate-pulse text-cafe-wood dark:text-cafe-gold" />
          </div>
          <h2 className="font-serif text-2xl font-bold dark:text-white">Admin Portal</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-light mt-1.5">
            Authenticate to access orders, menu configurations, and café telemetry.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/10 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative">
          {/* Username */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="text"
                required
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal/50 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cafe-gold transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal/50 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cafe-gold transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm shadow-md"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white dark:border-cafe-chocolate border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">
            Default credentials: <strong className="text-cafe-darkgold dark:text-cafe-gold">admin / admin123</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
