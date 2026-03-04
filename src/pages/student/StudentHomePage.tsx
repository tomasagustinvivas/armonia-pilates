import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { MonthlyPayment } from '../../types';

export default function StudentHomePage() {
  const { profile } = useAuth();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const pendingQuery = useQuery({
    queryKey: ['my-pending-requests'],
    queryFn: async (): Promise<number> => {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from('enrollment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const paymentQuery = useQuery({
    queryKey: ['my-payment', currentYear, currentMonth],
    queryFn: async (): Promise<MonthlyPayment | null> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('monthly_payments')
        .select('*')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const paymentStatus = paymentQuery.data?.status === 'paid' ? 'paid' : 'unpaid';

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        Hola, {profile?.full_name ?? 'alumno'}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Resumen de tu cuenta
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {/* Payment card */}
        <Link
          to="/app/payments"
          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
        >
          <div className="text-sm font-medium text-slate-500">Pago del mes</div>
          <div className="mt-2">
            {paymentQuery.isLoading ? (
              <span className="text-sm text-slate-400">Cargando...</span>
            ) : (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${
                  paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {paymentStatus === 'paid' ? 'Pagado' : 'Impago'}
              </span>
            )}
          </div>
        </Link>

        {/* Pending requests card */}
        <Link
          to="/app/requests"
          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
        >
          <div className="text-sm font-medium text-slate-500">
            Solicitudes pendientes
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {pendingQuery.isLoading ? '...' : (pendingQuery.data ?? 0)}
          </div>
        </Link>

        {/* Schedule shortcut */}
        <Link
          to="/app/schedule"
          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
        >
          <div className="text-sm font-medium text-slate-500">Horarios</div>
          <div className="mt-2 text-sm text-slate-600">
            Ver turnos disponibles →
          </div>
        </Link>
      </div>
    </div>
  );
}
