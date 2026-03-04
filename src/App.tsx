import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PublicSchedulePage from './pages/PublicSchedulePage';
import SignupPage from './pages/SignupPage';
import StudentLayout from './layouts/StudentLayout';
import StudentHomePage from './pages/student/StudentHomePage';
import StudentSchedulePage from './pages/student/StudentSchedulePage';
import StudentRequestsPage from './pages/student/StudentRequestsPage';
import StudentPaymentsPage from './pages/student/StudentPaymentsPage';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminInstructorsPage from './pages/admin/AdminInstructorsPage';
import AdminClassTypesPage from './pages/admin/AdminClassTypesPage';
import AdminSchedulePage from './pages/admin/AdminSchedulePage';
import AdminStudentsPage from './pages/admin/AdminStudentsPage';
import AdminRequestsPage from './pages/admin/AdminRequestsPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminEnrollmentsPage from './pages/admin/AdminEnrollmentsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/schedule" element={<PublicSchedulePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route path="/app" element={<StudentLayout />}>
        <Route index element={<StudentHomePage />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
        <Route path="requests" element={<StudentRequestsPage />} />
        <Route path="payments" element={<StudentPaymentsPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="schedule" element={<AdminSchedulePage />} />
        <Route path="classes" element={<AdminClassTypesPage />} />
        <Route path="instructors" element={<AdminInstructorsPage />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="enrollments" element={<AdminEnrollmentsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
