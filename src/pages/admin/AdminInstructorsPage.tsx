import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { Instructor } from '../../types';

type FormData = {
  full_name: string;
  bio: string;
  specialties: string;
  active: boolean;
};

const emptyForm: FormData = { full_name: '', bio: '', specialties: '', active: true };

export default function AdminInstructorsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const query = useQuery({
    queryKey: ['admin-instructors'],
    queryFn: async (): Promise<Instructor[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Instructor[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: FormData }) => {
      const supabase = getSupabaseClient();
      if (payload.id) {
        const { error } = await supabase
          .from('instructors')
          .update(payload.data)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('instructors').insert(payload.data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: editing ? 'Profesor actualizado' : 'Profesor creado' });
      setEditing(null);
      setCreating(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['admin-instructors'] });
    },
    onError: (err) => {
      setFeedback({ type: 'err', text: (err as { message?: string })?.message ?? 'Error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('instructors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: 'Profesor eliminado' });
      queryClient.invalidateQueries({ queryKey: ['admin-instructors'] });
    },
    onError: (err) => {
      setFeedback({ type: 'err', text: (err as { message?: string })?.message ?? 'Error' });
    },
  });

  const startEdit = (inst: Instructor) => {
    setEditing(inst);
    setCreating(false);
    setForm({
      full_name: inst.full_name,
      bio: inst.bio ?? '',
      specialties: inst.specialties ?? '',
      active: inst.active ?? true,
    });
    setFeedback(null);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm);
    setFeedback(null);
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ id: editing?.id, data: form });
  };

  const showForm = creating || editing;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profesores</h1>
          <p className="mt-1 text-sm text-slate-600">Gestión de instructores</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Nuevo profesor
          </button>
        )}
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

      {showForm && (
        <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-medium">
            {editing ? 'Editar profesor' : 'Nuevo profesor'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Nombre completo *</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Especialidades</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.specialties}
                onChange={(e) => setForm({ ...form, specialties: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="font-medium">Bio</span>
              <textarea
                className="rounded-md border border-slate-300 px-3 py-2"
                rows={2}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <span>Activo</span>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
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
          Error cargando profesores
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <div className="mt-6 text-sm text-slate-500">Sin profesores registrados.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Especialidades</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.data.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{inst.full_name}</td>
                  <td className="px-3 py-2 text-slate-600">{inst.specialties ?? '-'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        inst.active !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {inst.active !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(inst)}
                      className="mr-2 text-slate-600 underline hover:text-slate-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('¿Eliminar este profesor?')) {
                          deleteMutation.mutate(inst.id);
                        }
                      }}
                      className="text-red-600 underline hover:text-red-800"
                    >
                      Eliminar
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
