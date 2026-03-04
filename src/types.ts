export type UserRole = 'student' | 'admin';

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string | null;
};

export type ClassType = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  level: string | null;
  active: boolean | null;
};

export type Instructor = {
  id: string;
  full_name: string;
  bio: string | null;
  specialties: string | null;
  active: boolean | null;
};

export type ClassSession = {
  id: string;
  class_type_id: string;
  instructor_id: string;
  start_at: string;
  end_at: string;
  capacity: number | null;
  room: string | null;
  status: 'scheduled' | 'canceled' | string;
  class_types?: ClassType | null;
  instructors?: Instructor | null;
};

export type EnrollmentRequest = {
  id: string;
  class_session_id: string;
  student_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  message: string | null;
  created_at: string;
  handled_by: string | null;
  handled_at: string | null;
  resolution_note: string | null;
  class_sessions?: ClassSession | null;
};

export type Enrollment = {
  id: string;
  class_session_id: string;
  student_id: string;
  status: 'enrolled' | 'canceled';
  created_at: string;
  created_by: string | null;
};

export type MonthlyPayment = {
  id: string;
  student_id: string;
  year: number;
  month: number;
  status: 'paid' | 'unpaid';
  paid_at: string | null;
  amount: number | null;
  method: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};
