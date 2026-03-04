import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { Profile } from '../../types';

type FormData = {
  full_name: string;
  phone: string;
  notes: string;
};

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormData>({ full_name: '', phone: '', notes: '' });
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const query = useQuery({
    queryKey: ['admin-students'],
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

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: FormData }) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: payload.data.full_name || null,
          phone: payload.data.phone || null,
          notes: payload.data.notes || null,
        })
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: 'Alumno actualizado' });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
    onError: (err) => {
      setFeedback({ type: 'err', text: (err as { message?: string })?.message ?? 'Error' });
    },
  });

  const startEdit = (student: Profile) => {
    setEditing(student);
    setForm({
      full_name: student.full_name ?? '',
      phone: student.phone ?? '',
      notes: student.notes ?? '',
    });
    setFeedback(null);
  };

  const cancel = () => {
    setEditing(null);
    setForm({ full_name: '', phone: '', notes: '' });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, data: form });
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold">Alumnos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Listado de alumnos registrados ({query.data?.length ?? 0})
        </p>
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
          <h2 className="mb-4 font-medium">Editar alumno</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Nombre completo</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Teléfono</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="font-medium">Notas</span>
              <textarea
                className="rounded-md border border-slate-300 px-3 py-2"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {query.isLoading ? (
        <div className="mt-6 text-sm text-slate-500">Cargando...</div>
      ) : query.isError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Error cargando alumnos
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <div className="mt-6 text-sm text-slate-500">Sin alumnos registrados.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Notas</th>
                <th className="px-3 py-2">Registrado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.data.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">
                    {student.full_name ?? '(sin nombre)'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{student.phone ?? '-'}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-slate-600">
                    {student.notes ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {student.created_at
                      ? new Intl.DateTimeFormat(undefined, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }).format(new Date(student.created_at))
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(student)}
                      className="text-slate-600 underline hover:text-slate-900"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
