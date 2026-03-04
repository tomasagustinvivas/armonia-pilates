import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { ClassSession } from '../../types';

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function StudentSchedulePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const scheduleQuery = useQuery({
    queryKey: ['student-schedule'],
    queryFn: async (): Promise<ClassSession[]> => {
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

  const myRequestsQuery = useQuery({
    queryKey: ['my-requests-map'],
    queryFn: async (): Promise<Record<string, string>> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select('class_session_id, status')
        .in('status', ['pending', 'approved']);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of data ?? []) {
        map[r.class_session_id] = r.status;
      }
      return map;
    },
  });

  const myEnrollmentsQuery = useQuery({
    queryKey: ['my-enrollments-map'],
    queryFn: async (): Promise<Set<string>> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('enrollments')
        .select('class_session_id')
        .eq('status', 'enrolled');
      if (error) throw error;
      return new Set((data ?? []).map((e) => e.class_session_id));
    },
  });

  const createRequest = useMutation({
    mutationFn: async ({ sessionId, msg }: { sessionId: string; msg: string }) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('enrollment_requests').insert({
        class_session_id: sessionId,
        student_id: user!.id,
        message: msg || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: 'Solicitud enviada' });
      setRequestingId(null);
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['my-requests-map'] });
      queryClient.invalidateQueries({ queryKey: ['my-pending-requests'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        text: (err as { message?: string })?.message ?? 'Error al enviar solicitud',
      });
    },
  });

  const requestsMap = myRequestsQuery.data ?? {};
  const enrolledSet = myEnrollmentsQuery.data ?? new Set<string>();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Horarios</h1>
      <p className="mt-1 text-sm text-slate-600">
        Turnos disponibles. Enviá una solicitud para anotarte.
      </p>

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

      {scheduleQuery.isLoading ? (
        <div className="mt-6 text-sm text-slate-500">Cargando...</div>
      ) : scheduleQuery.isError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Error cargando horarios
        </div>
      ) : !scheduleQuery.data || scheduleQuery.data.length === 0 ? (
        <div className="mt-6 text-sm text-slate-500">Sin turnos disponibles.</div>
      ) : (
        <div className="mt-6 grid gap-3">
          {scheduleQuery.data.map((s) => {
            const reqStatus = requestsMap[s.id];
            const isEnrolled = enrolledSet.has(s.id);

            return (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">
                      {formatDateTime(s.start_at)} — {formatDateTime(s.end_at)}
                    </div>
                    <div className="mt-1 font-medium">
                      {(s.class_types as unknown as { name?: string } | null)?.name ?? 'Clase'}
                    </div>
                    <div className="text-sm text-slate-600">
                      {(s.instructors as unknown as { full_name?: string } | null)?.full_name ?? 'Instructor'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Cupo: {s.capacity ?? '-'} · Sala: {s.room ?? '-'}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {isEnrolled ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Inscrito
                      </span>
                    ) : reqStatus === 'pending' ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Solicitud pendiente
                      </span>
                    ) : reqStatus === 'approved' ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Aprobada
                      </span>
                    ) : requestingId === s.id ? (
                      <div className="flex flex-col items-end gap-2">
                        <textarea
                          className="w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                          rows={2}
                          placeholder="Mensaje opcional..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRequestingId(null);
                              setMessage('');
                            }}
                            className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={createRequest.isPending}
                            onClick={() =>
                              createRequest.mutate({ sessionId: s.id, msg: message })
                            }
                            className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            {createRequest.isPending ? 'Enviando...' : 'Enviar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFeedback(null);
                          setRequestingId(s.id);
                        }}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
                      >
                        Solicitar inscripción
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
