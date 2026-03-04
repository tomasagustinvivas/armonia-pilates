import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { MonthlyPayment } from '../../types';

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function StudentPaymentsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

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

  const isPaid = paymentQuery.data?.status === 'paid';

  return (
    <div>
      <h1 className="text-2xl font-semibold">Estado de pago</h1>
      <p className="mt-1 text-sm text-slate-600">
        Estado del mes actual. Los pagos son registrados por la administración.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-medium text-slate-500">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </div>

        {paymentQuery.isLoading ? (
          <div className="mt-3 text-sm text-slate-400">Cargando...</div>
        ) : (
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                isPaid
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isPaid ? '✓ Pagado' : 'Impago'}
            </span>

            {paymentQuery.data && (
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                {paymentQuery.data.amount != null && (
                  <div>
                    <span className="font-medium">Monto:</span>{' '}
                    ${paymentQuery.data.amount}
                  </div>
                )}
                {paymentQuery.data.method && (
                  <div>
                    <span className="font-medium">Método:</span>{' '}
                    {paymentQuery.data.method}
                  </div>
                )}
                {paymentQuery.data.paid_at && (
                  <div>
                    <span className="font-medium">Fecha de pago:</span>{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).format(new Date(paymentQuery.data.paid_at))}
                  </div>
                )}
                {paymentQuery.data.note && (
                  <div>
                    <span className="font-medium">Nota:</span>{' '}
                    {paymentQuery.data.note}
                  </div>
                )}
              </div>
            )}

            {!paymentQuery.data && (
              <p className="mt-3 text-sm text-slate-500">
                No hay registro de pago para este mes. Contactá a la administración.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
