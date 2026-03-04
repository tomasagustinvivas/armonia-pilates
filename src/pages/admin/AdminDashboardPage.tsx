import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function AdminDashboardPage() {
  const pendingRequests = useQuery({
    queryKey: ['admin-pending-requests-count'],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from('enrollment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const studentsCount = useQuery({
    queryKey: ['admin-students-count'],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const sessionsCount = useQuery({
    queryKey: ['admin-sessions-count'],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const unpaidCount = useQuery({
    queryKey: ['admin-unpaid-count', currentYear, currentMonth],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { count: totalStudents, error: e1 } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      if (e1) throw e1;

      const { count: paidCount, error: e2 } = await supabase
        .from('monthly_payments')
        .select('*', { count: 'exact', head: true })
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .eq('status', 'paid');
      if (e2) throw e2;

      return (totalStudents ?? 0) - (paidCount ?? 0);
    },
  });

  const cards = [
    {
      to: '/admin/requests',
      label: 'Solicitudes pendientes',
      value: pendingRequests.data,
      loading: pendingRequests.isLoading,
      accent: 'text-amber-600',
    },
    {
      to: '/admin/students',
      label: 'Alumnos',
      value: studentsCount.data,
      loading: studentsCount.isLoading,
      accent: 'text-slate-900',
    },
    {
      to: '/admin/schedule',
      label: 'Turnos activos',
      value: sessionsCount.data,
      loading: sessionsCount.isLoading,
      accent: 'text-slate-900',
    },
    {
      to: '/admin/payments',
      label: 'Impagos este mes',
      value: unpaidCount.data,
      loading: unpaidCount.isLoading,
      accent: 'text-red-600',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Panel de administración</h1>
      <p className="mt-1 text-sm text-slate-600">
        Resumen general del instituto
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
          >
            <div className="text-sm font-medium text-slate-500">{c.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${c.accent}`}>
              {c.loading ? '...' : c.value}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
