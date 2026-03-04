import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { ClassSession } from '../types';

async function fetchPublicSchedule(): Promise<ClassSession[]> {
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
}

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

export default function PublicSchedulePage() {
  const query = useQuery({
    queryKey: ['public-schedule'],
    queryFn: fetchPublicSchedule,
  });

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-semibold">
              Pilates Institute
            </Link>
            <span className="text-sm text-slate-500">Horarios públicos</span>
          </div>
          <Link to="/login" className="text-sm underline">
            Ingresar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Horarios</h1>
        <p className="mt-1 text-sm text-slate-600">
          Solo lectura. Para anotarte, ingresá y enviá una solicitud.
        </p>

        {query.isLoading ? (
          <div className="mt-6 text-sm text-slate-600">Cargando...</div>
        ) : query.isError ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {(query.error as { message?: string })?.message ??
              'Error cargando horarios'}
          </div>
        ) : !query.data || query.data.length === 0 ? (
          <div className="mt-6 text-sm text-slate-600">Sin turnos.</div>
        ) : (
          <div className="mt-6 grid gap-3">
            {query.data.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm text-slate-500">
                      {formatDateTime(s.start_at)} — {formatDateTime(s.end_at)}
                    </div>
                    <div className="mt-1 font-medium">
                      {(s.class_types as unknown as { name?: string } | null)
                        ?.name ?? 'Clase'}
                    </div>
                    <div className="text-sm text-slate-600">
                      {(
                        s.instructors as unknown as {
                          full_name?: string;
                        } | null
                      )?.full_name ?? 'Instructor'}
                    </div>
                  </div>

                  <div className="text-right text-sm text-slate-600">
                    <div>
                      Cupo:{' '}
                      <span className="font-medium text-slate-900">
                        {s.capacity ?? '-'}
                      </span>
                    </div>
                    <div>Sala: {s.room ?? '-'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link to="/" className="text-sm underline">
            Volver
          </Link>
        </div>
      </main>
    </div>
  );
}
