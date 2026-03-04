import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { MonthlyPayment, Profile } from '../../types';

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

type PaymentForm = {
  student_id: string;
  status: 'paid' | 'unpaid';
  amount: string;
  method: string;
  note: string;
};

const emptyForm: PaymentForm = {
  student_id: '',
  status: 'paid',
  amount: '',
  method: '',
  note: '',
};

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const studentsQuery = useQuery({
    queryKey: ['admin-students-payments'],
    queryFn: async (): Promise<Profile[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ['admin-payments', year, month],
    queryFn: async (): Promise<MonthlyPayment[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('monthly_payments')
        .select('*')
        .eq('year', year)
        .eq('month', month);
      if (error) throw error;
      return (data ?? []) as MonthlyPayment[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: PaymentForm) => {
      const supabase = getSupabaseClient();
      const row = {
        student_id: payload.student_id,
        year,
        month,
        status: payload.status,
        amount: payload.amount ? parseFloat(payload.amount) : null,
        method: payload.method || null,
        note: payload.note || null,
        paid_at: payload.status === 'paid' ? new Date().toISOString() : null,
        created_by: user!.id,
      };

      const { error } = await supabase
        .from('monthly_payments')
        .upsert(row, { onConflict: 'student_id,year,month' });
      if (error) throw error;
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: 'Pago registrado' });
      setEditing(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['admin-payments', year, month] });
    },
    onError: (err) => {
      setFeedback({ type: 'err', text: (err as { message?: string })?.message ?? 'Error' });
    },
  });

  const paymentsMap = new Map<string, MonthlyPayment>();
  for (const p of paymentsQuery.data ?? []) {
    paymentsMap.set(p.student_id, p);
  }

  const startEdit = (studentId: string) => {
    const existing = paymentsMap.get(studentId);
    setEditing(studentId);
    setForm({
      student_id: studentId,
      status: existing?.status ?? 'paid',
      amount: existing?.amount?.toString() ?? '',
      method: existing?.method ?? '',
      note: existing?.note ?? '',
    });
    setFeedback(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pagos mensuales</h1>
          <p className="mt-1 text-sm text-slate-600">Registro de pagos por alumno</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
          >
            {MONTH_NAMES.slice(1).map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            feedback.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {editing && (
        <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-medium">
            Registrar pago — {MONTH_NAMES[month]} {year}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Estado *</span>
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'paid' | 'unpaid' })
                }
              >
                <option value="paid">Pagado</option>
                <option value="unpaid">Impago</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Monto</span>
              <input
                type="number"
                step="0.01"
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Método</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                placeholder="Efectivo, transferencia..."
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Nota</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={upsertMutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {upsertMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {studentsQuery.isLoading || paymentsQuery.isLoading ? (
        <div className="mt-6 text-sm text-slate-500">Cargando...</div>
      ) : studentsQuery.isError || paymentsQuery.isError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Error cargando datos
        </div>
      ) : !studentsQuery.data || studentsQuery.data.length === 0 ? (
        <div className="mt-6 text-sm text-slate-500">Sin alumnos registrados.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Alumno</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Método</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentsQuery.data.map((student) => {
                const payment = paymentsMap.get(student.id);
                const isPaid = payment?.status === 'paid';

                return (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">
                      {student.full_name ?? '(sin nombre)'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          isPaid
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isPaid ? 'Pagado' : 'Impago'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {payment?.amount != null ? `$${payment.amount}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{payment?.method ?? '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(student.id)}
                        className="text-slate-600 underline hover:text-slate-900"
                      >
                        {payment ? 'Editar' : 'Registrar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
