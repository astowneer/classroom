import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, Layout } from './components/Layout';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import CoursesPage from './pages/teacher/CoursesPage';
import AssignmentsPage from './pages/teacher/AssignmentsPage';
import AssignmentDetailPage from './pages/teacher/AssignmentDetailPage';
import ReportPage from './pages/teacher/ReportPage';
import ComparePage from './pages/teacher/ComparePage';
import StudentSubmissionsPage from './pages/student/SubmissionsPage';
import StudentSubmissionDetailPage from './pages/student/SubmissionDetailPage';
import NotificationsPage from './pages/NotificationsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Teacher routes */}
          <Route element={<ProtectedRoute role="teacher" />}>
            <Route element={<Layout />}>
              <Route path="/teacher/courses" element={<CoursesPage />} />
              <Route path="/teacher/courses/:courseId/assignments" element={<AssignmentsPage />} />
              <Route path="/teacher/assignments/:assignmentId" element={<AssignmentDetailPage />} />
              <Route path="/teacher/reports/:submissionId" element={<ReportPage />} />
              <Route path="/teacher/compare" element={<ComparePage />} />
              <Route path="/teacher/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          {/* Student routes */}
          <Route element={<ProtectedRoute role="student" />}>
            <Route element={<Layout />}>
              <Route path="/student/submissions" element={<StudentSubmissionsPage />} />
              <Route path="/student/submissions/:id" element={<StudentSubmissionDetailPage />} />
              <Route path="/student/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
