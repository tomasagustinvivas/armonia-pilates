import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function LandingPage() {
  const { user, profile, isLoading, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold">
            Pilates Institute
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/schedule" className="hover:underline">
              Horarios
            </Link>
            {isLoading ? null : user ? (
              <>
                <span className="text-slate-600">
                  {profile?.full_name ?? user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  Ingresar
                </Link>
                <Link
                  to="/signup"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <section>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Bienvenido al Instituto
            </h1>
            <p className="mt-3 text-slate-600">
              Consultá horarios y gestioná tu información. Las inscripciones se
              realizan por solicitud.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/schedule"
                className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              >
                Ver horarios
              </Link>
              <Link
                to="/login"
                className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50"
              >
                Ingresar
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-semibold">Información</h2>
            <div className="mt-3 grid gap-3 text-sm text-slate-700">
              <div>
                <div className="font-medium">Ubicación</div>
                <div className="text-slate-600">(completar dirección)</div>
              </div>
              <div>
                <div className="font-medium">Contacto</div>
                <div className="text-slate-600">
                  (completar WhatsApp / Email)
                </div>
              </div>
              <div>
                <div className="font-medium">Planes</div>
                <div className="text-slate-600">(informativo)</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
