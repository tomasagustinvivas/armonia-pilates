import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { ClassType } from '../../types';

type FormData = {
  name: string;
  description: string;
  duration_minutes: string;
  level: string;
  active: boolean;
};

const emptyForm: FormData = {
  name: '',
  description: '',
  duration_minutes: '60',
  level: '',
  active: true,
};

export default function AdminClassTypesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ClassType | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const query = useQuery({
    queryKey: ['admin-class-types'],
    queryFn: async (): Promise<ClassType[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('class_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []) as ClassType[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: FormData }) => {
      const supabase = getSupabaseClient();
      const row = {
        name: payload.data.name,
        description: payload.data.description || null,
        duration_minutes: payload.data.duration_minutes
          ? parseInt(payload.data.duration_minutes, 10)
          : null,
        level: payload.data.level || null,
        active: payload.data.active,
      };
      if (payload.id) {
        const { error } = await supabase.from('class_types').update(row).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('class_types').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: editing ? 'Clase actualizada' : 'Clase creada' });
      setEditing(null);
      setCreating(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['admin-class-types'] });
    },
    onError: (err) => {
      setFeedback({ type: 'err', text: (err as { message?: string })?.message ?? 'Error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('class_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: 'Clase eliminada' });
      queryClient.invalidateQueries({ queryKey: ['admin-class-types'] });
    },
    onError: (err) => {
      setFeedback({ type: 'err', text: (err as { message?: string })?.message ?? 'Error' });
    },
  });

  const startEdit = (ct: ClassType) => {
    setEditing(ct);
    setCreating(false);
    setForm({
      name: ct.name,
      description: ct.description ?? '',
      duration_minutes: ct.duration_minutes?.toString() ?? '60',
      level: ct.level ?? '',
      active: ct.active ?? true,
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
          <h1 className="text-2xl font-semibold">Tipos de clase</h1>
          <p className="mt-1 text-sm text-slate-600">Gestión de tipos de clase</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Nueva clase
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
            {editing ? 'Editar tipo de clase' : 'Nuevo tipo de clase'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Nombre *</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Nivel</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                placeholder="Principiante, Intermedio..."
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Duración (min)</span>
              <input
                type="number"
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Descripción</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <span>Activa</span>
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
          Error cargando clases
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <div className="mt-6 text-sm text-slate-500">Sin tipos de clase registrados.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Nivel</th>
                <th className="px-3 py-2">Duración</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.data.map((ct) => (
                <tr key={ct.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{ct.name}</td>
                  <td className="px-3 py-2 text-slate-600">{ct.level ?? '-'}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {ct.duration_minutes ? `${ct.duration_minutes} min` : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        ct.active !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ct.active !== false ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(ct)}
                      className="mr-2 text-slate-600 underline hover:text-slate-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('¿Eliminar este tipo de clase?')) {
                          deleteMutation.mutate(ct.id);
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
