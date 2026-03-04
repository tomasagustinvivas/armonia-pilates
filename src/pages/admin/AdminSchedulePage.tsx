import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { ClassSession, ClassType, Instructor } from '../../types';

type FormData = {
  class_type_id: string;
  instructor_id: string;
  start_at: string;
  end_at: string;
  capacity: string;
  room: string;
  status: 'scheduled' | 'canceled';
};

const emptyForm: FormData = {
  class_type_id: '',
  instructor_id: '',
  start_at: '',
  end_at: '',
  capacity: '10',
  room: '',
  status: 'scheduled',
};

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function AdminSchedulePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ClassSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: async (): Promise<ClassSession[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('class_sessions')
        .select(
          'id, class_type_id, instructor_id, start_at, end_at, capacity, room, status, class_types(name), instructors(full_name)',
        )
        .order('start_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ClassSession[];
    },
  });

  const classTypesQuery = useQuery({
    queryKey: ['admin-class-types-list'],
    queryFn: async (): Promise<ClassType[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('class_types')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as ClassType[];
    },
  });

  const instructorsQuery = useQuery({
    queryKey: ['admin-instructors-list'],
    queryFn: async (): Promise<Instructor[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('active', true)
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Instructor[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: FormData }) => {
      const supabase = getSupabaseClient();
      const row = {
        class_type_id: payload.data.class_type_id,
        instructor_id: payload.data.instructor_id,
        start_at: new Date(payload.data.start_at).toISOString(),
        end_at: new Date(payload.data.end_at).toISOString(),
        capacity: payload.data.capacity ? parseInt(payload.data.capacity, 10) : null,
        room: payload.data.room || null,
        status: payload.data.status,
      };
      if (payload.id) {
        const { error } = await supabase.from('class_sessions').update(row).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('class_sessions').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: editing ? 'Turno actualizado' : 'Turno creado' });
      setEditing(null);
      setCreating(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    },
    onError: (err) => {
      setFeedback({ type: 'err', text: (err as { message?: string })?.message ?? 'Error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('class_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: 'Turno eliminado' });
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    },
    onError: (err) => {
      setFeedback({ type: 'err', text: (err as { message?: string })?.message ?? 'Error' });
    },
  });

  const startEdit = (s: ClassSession) => {
    setEditing(s);
    setCreating(false);
    setForm({
      class_type_id: s.class_type_id,
      instructor_id: s.instructor_id,
      start_at: toLocalDatetime(s.start_at),
      end_at: toLocalDatetime(s.end_at),
      capacity: s.capacity?.toString() ?? '10',
      room: s.room ?? '',
      status: s.status as 'scheduled' | 'canceled',
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
          <h1 className="text-2xl font-semibold">Turnos</h1>
          <p className="mt-1 text-sm text-slate-600">Gestión de horarios / sesiones</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Nuevo turno
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
            {editing ? 'Editar turno' : 'Nuevo turno'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Tipo de clase *</span>
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.class_type_id}
                onChange={(e) => setForm({ ...form, class_type_id: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {(classTypesQuery.data ?? []).map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Instructor *</span>
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.instructor_id}
                onChange={(e) => setForm({ ...form, instructor_id: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {(instructorsQuery.data ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Inicio *</span>
              <input
                type="datetime-local"
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.start_at}
                onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Fin *</span>
              <input
                type="datetime-local"
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Cupo</span>
              <input
                type="number"
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Sala</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Estado</span>
              <select
                className="rounded-md border border-slate-300 px-3 py-2"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'scheduled' | 'canceled' })
                }
              >
                <option value="scheduled">Programado</option>
                <option value="canceled">Cancelado</option>
              </select>
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

      {sessionsQuery.isLoading ? (
        <div className="mt-6 text-sm text-slate-500">Cargando...</div>
      ) : sessionsQuery.isError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Error cargando turnos
        </div>
      ) : !sessionsQuery.data || sessionsQuery.data.length === 0 ? (
        <div className="mt-6 text-sm text-slate-500">Sin turnos registrados.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Fecha/Hora</th>
                <th className="px-3 py-2">Clase</th>
                <th className="px-3 py-2">Instructor</th>
                <th className="px-3 py-2">Cupo</th>
                <th className="px-3 py-2">Sala</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessionsQuery.data.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-600">
                    {formatDateTime(s.start_at)}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {(s.class_types as unknown as { name?: string } | null)?.name ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {(s.instructors as unknown as { full_name?: string } | null)?.full_name ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{s.capacity ?? '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{s.room ?? '-'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status === 'scheduled'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {s.status === 'scheduled' ? 'Programado' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="mr-2 text-slate-600 underline hover:text-slate-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('¿Eliminar este turno?')) {
                          deleteMutation.mutate(s.id);
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
