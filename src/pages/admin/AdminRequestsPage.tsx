import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

type RequestRow = {
  id: string;
  class_session_id: string;
  student_id: string;
  status: string;
  message: string | null;
  created_at: string;
  handled_by: string | null;
  handled_at: string | null;
  resolution_note: string | null;
  profiles: { full_name: string | null } | null;
  class_sessions: {
    start_at: string;
    end_at: string;
    room: string | null;
    capacity: number | null;
    class_types: { name: string } | null;
    instructors: { full_name: string } | null;
  } | null;
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Aprobada', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazada', className: 'bg-red-100 text-red-700' },
  canceled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-600' },
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatSessionTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function AdminRequestsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const query = useQuery({
    queryKey: ['admin-requests', filter],
    queryFn: async (): Promise<RequestRow[]> => {
      const supabase = getSupabaseClient();
      let q = supabase
        .from('enrollment_requests')
        .select(
          'id, class_session_id, student_id, status, message, created_at, handled_by, handled_at, resolution_note, profiles!enrollment_requests_student_id_fkey(full_name), class_sessions(start_at, end_at, room, capacity, class_types(name), instructors(full_name))',
        )
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        q = q.eq('status', 'pending');
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as RequestRow[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc('approve_request', { request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: 'Solicitud aprobada e inscripción creada' });
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-requests-count'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        text: (err as { message?: string })?.message ?? 'Error al aprobar',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, note }: { requestId: string; note: string }) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('enrollment_requests')
        .update({
          status: 'rejected',
          resolution_note: note || null,
          handled_by: (await supabase.auth.getUser()).data.user?.id,
          handled_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', text: 'Solicitud rechazada' });
      setRejectingId(null);
      setRejectNote('');
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-requests-count'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        text: (err as { message?: string })?.message ?? 'Error al rechazar',
      });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Solicitudes</h1>
          <p className="mt-1 text-sm text-slate-600">Bandeja de solicitudes de inscripción</p>
        </div>
        <div className="flex gap-1 rounded-md border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              filter === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pendientes
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todas
          </button>
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

      {query.isLoading ? (
        <div className="mt-6 text-sm text-slate-500">Cargando...</div>
      ) : query.isError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Error cargando solicitudes
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          {filter === 'pending' ? 'Sin solicitudes pendientes.' : 'Sin solicitudes.'}
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {query.data.map((req) => {
            const st = STATUS_LABELS[req.status] ?? STATUS_LABELS.pending;
            const session = req.class_sessions;
            const studentName =
              (req.profiles as unknown as { full_name?: string } | null)?.full_name ?? '(sin nombre)';

            return (
              <div
                key={req.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{studentName}</div>
                    <div className="text-sm text-slate-600">
                      {session?.class_types?.name ?? 'Clase'} —{' '}
                      {session?.instructors?.full_name ?? 'Instructor'}
                      {session?.room ? ` · Sala ${session.room}` : ''}
                    </div>
                    {session && (
                      <div className="mt-1 text-xs text-slate-500">
                        {formatSessionTime(session.start_at)} —{' '}
                        {formatSessionTime(session.end_at)}
                        {session.capacity != null && ` · Cupo: ${session.capacity}`}
                      </div>
                    )}
                    {req.message && (
                      <div className="mt-2 text-xs text-slate-500">
                        <span className="font-medium">Mensaje:</span> {req.message}
                      </div>
                    )}
                    {req.resolution_note && (
                      <div className="mt-1 text-xs text-slate-500">
                        <span className="font-medium">Nota:</span> {req.resolution_note}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-slate-400">
                      Creada: {formatDate(req.created_at)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                    >
                      {st.label}
                    </span>

                    {req.status === 'pending' && (
                      <div className="flex flex-col items-end gap-2">
                        {rejectingId === req.id ? (
                          <div className="flex flex-col items-end gap-2">
                            <textarea
                              className="w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                              rows={2}
                              placeholder="Motivo del rechazo (opcional)"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectNote('');
                                }}
                                className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={rejectMutation.isPending}
                                onClick={() =>
                                  rejectMutation.mutate({
                                    requestId: req.id,
                                    note: rejectNote,
                                  })
                                }
                                className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                {rejectMutation.isPending ? 'Rechazando...' : 'Confirmar rechazo'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={approveMutation.isPending}
                              onClick={() => {
                                setFeedback(null);
                                approveMutation.mutate(req.id);
                              }}
                              className="rounded-md bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-60"
                            >
                              {approveMutation.isPending ? 'Aprobando...' : 'Aprobar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFeedback(null);
                                setRejectingId(req.id);
                              }}
                              className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
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
