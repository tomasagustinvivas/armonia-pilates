import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && profile) {
      navigate(profile.role === 'admin' ? '/admin' : '/app', { replace: true });
    }
  }, [user, profile, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Error al ingresar';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold">Ingresar</h1>
          <p className="mt-1 text-sm text-slate-600">
            ¿No tenés cuenta?{' '}
            <Link to="/signup" className="underline">
              Crear cuenta
            </Link>
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Email</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Contraseña</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>

            <Link
              to="/"
              className="text-center text-sm text-slate-600 underline"
            >
              Volver
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
