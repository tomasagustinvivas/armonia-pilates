import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { ClassSession } from '../../types';

type EnrollmentRow = {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function AdminEnrollmentsPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ['admin-sessions-enrollments'],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('class_sessions')
        .select(
          'id, class_type_id, instructor_id, start_at, end_at, capacity, room, status, class_types(name), instructors(full_name)',
        )
        .eq('status', 'scheduled')
        .order('start_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ClassSession[];
    },
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['admin-enrollments-session', selectedSession],
    enabled: !!selectedSession,
    queryFn: async (): Promise<EnrollmentRow[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('enrollments')
        .select(
          'id, student_id, status, created_at, profiles!enrollments_student_id_fkey(full_name)',
        )
        .eq('class_session_id', selectedSession!)
        .eq('status', 'enrolled')
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as EnrollmentRow[];
    },
  });

  const enrollmentCounts = useQuery({
    queryKey: ['admin-enrollment-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('enrollments')
        .select('class_session_id')
        .eq('status', 'enrolled');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.class_session_id] = (counts[row.class_session_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  const counts = enrollmentCounts.data ?? {};

  return (
    <div>
      <h1 className="text-2xl font-semibold">Inscripciones por turno</h1>
      <p className="mt-1 text-sm text-slate-600">
        Seleccioná un turno para ver los alumnos inscriptos
      </p>

      {sessionsQuery.isLoading ? (
        <div className="mt-6 text-sm text-slate-500">Cargando...</div>
      ) : sessionsQuery.isError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Error cargando turnos
        </div>
      ) : !sessionsQuery.data || sessionsQuery.data.length === 0 ? (
        <div className="mt-6 text-sm text-slate-500">Sin turnos activos.</div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessionsQuery.data.map((s) => {
            const isSelected = selectedSession === s.id;
            const enrolled = counts[s.id] ?? 0;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSession(isSelected ? null : s.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 bg-white hover:shadow-sm'
                }`}
              >
                <div className="font-medium">
                  {(s.class_types as unknown as { name?: string } | null)?.name ?? 'Clase'}
                </div>
                <div className="text-sm text-slate-600">
                  {(s.instructors as unknown as { full_name?: string } | null)?.full_name ??
                    'Instructor'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatDateTime(s.start_at)} — {formatDateTime(s.end_at)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Sala: {s.room ?? '-'} · Inscritos: {enrolled}/{s.capacity ?? '∞'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <div className="mt-6">
          <h2 className="text-lg font-medium">Alumnos inscriptos</h2>
          {enrollmentsQuery.isLoading ? (
            <div className="mt-3 text-sm text-slate-500">Cargando...</div>
          ) : enrollmentsQuery.isError ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Error cargando inscripciones
            </div>
          ) : !enrollmentsQuery.data || enrollmentsQuery.data.length === 0 ? (
            <div className="mt-3 text-sm text-slate-500">Sin inscriptos en este turno.</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Alumno</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Inscrito desde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollmentsQuery.data.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {(e.profiles as unknown as { full_name?: string } | null)?.full_name ??
                          '(sin nombre)'}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Inscrito
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {new Intl.DateTimeFormat(undefined, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }).format(new Date(e.created_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
