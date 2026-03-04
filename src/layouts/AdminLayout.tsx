import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const navItems = [
  { to: '/admin', label: 'Inicio', end: true },
  { to: '/admin/schedule', label: 'Turnos', end: false },
  { to: '/admin/classes', label: 'Clases', end: false },
  { to: '/admin/instructors', label: 'Profesores', end: false },
  { to: '/admin/students', label: 'Alumnos', end: false },
  { to: '/admin/requests', label: 'Solicitudes', end: false },
  { to: '/admin/payments', label: 'Pagos', end: false },
  { to: '/admin/enrollments', label: 'Inscripciones', end: false },
];

export default function AdminLayout() {
  const { user, profile, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/admin" className="text-lg font-semibold">
            Pilates Institute{' '}
            <span className="text-xs font-normal text-slate-500">Admin</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
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
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
