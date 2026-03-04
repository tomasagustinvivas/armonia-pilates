import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { EnrollmentRequest } from '../../types';

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

type RequestWithSession = EnrollmentRequest & {
  class_sessions: {
    start_at: string;
    end_at: string;
    room: string | null;
    class_types: { name: string } | null;
    instructors: { full_name: string } | null;
  } | null;
};

export default function StudentRequestsPage() {
  const query = useQuery({
    queryKey: ['my-requests'],
    queryFn: async (): Promise<RequestWithSession[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select(
          'id, class_session_id, student_id, status, message, created_at, handled_at, resolution_note, class_sessions(start_at, end_at, room, class_types(name), instructors(full_name))',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RequestWithSession[];
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Mis solicitudes</h1>
      <p className="mt-1 text-sm text-slate-600">
        Historial de solicitudes de inscripción
      </p>

      {query.isLoading ? (
        <div className="mt-6 text-sm text-slate-500">Cargando...</div>
      ) : query.isError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Error cargando solicitudes
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No tenés solicitudes todavía. Podés crear una desde{' '}
          <a href="/app/schedule" className="underline">
            Horarios
          </a>
          .
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {query.data.map((req) => {
            const st = STATUS_LABELS[req.status] ?? STATUS_LABELS.pending;
            const session = req.class_sessions;

            return (
              <div
                key={req.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {session?.class_types?.name ?? 'Clase'}
                    </div>
                    <div className="text-sm text-slate-600">
                      {session?.instructors?.full_name ?? 'Instructor'}
                      {session?.room ? ` · Sala ${session.room}` : ''}
                    </div>
                    {session && (
                      <div className="mt-1 text-xs text-slate-500">
                        {formatSessionTime(session.start_at)} —{' '}
                        {formatSessionTime(session.end_at)}
                      </div>
                    )}
                    {req.message && (
                      <div className="mt-2 text-xs text-slate-500">
                        <span className="font-medium">Tu mensaje:</span>{' '}
                        {req.message}
                      </div>
                    )}
                    {req.resolution_note && (
                      <div className="mt-1 text-xs text-slate-500">
                        <span className="font-medium">Nota admin:</span>{' '}
                        {req.resolution_note}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                    >
                      {st.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(req.created_at)}
                    </span>
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
