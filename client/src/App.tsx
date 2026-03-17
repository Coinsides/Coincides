import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import AppLayout from '@/components/Layout/AppLayout';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import DailyBrief from '@/pages/DailyBrief/DailyBrief';
import CalendarPage from '@/pages/Calendar/Calendar';
import GoalsPage from '@/pages/Goals/Goals';
import CoursesPage from '@/pages/Courses/Courses';
import SettingsPage from '@/pages/Settings/Settings';
import TaskModal from '@/components/TaskModal/TaskModal';
import CourseModal from '@/components/CourseModal/CourseModal';
import GoalModal from '@/components/GoalModal/GoalModal';
import ToastContainer from '@/components/Toast/Toast';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ModalLayer() {
  const modal = useUIStore((s) => s.modal);
  if (!modal) return null;

  switch (modal.type) {
    case 'task-create':
    case 'task-edit':
      return <TaskModal />;
    case 'course-create':
    case 'course-edit':
      return <CourseModal />;
    case 'goal-create':
    case 'goal-edit':
      return <GoalModal />;
    default:
      return null;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DailyBrief />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ModalLayer />
      <ToastContainer />
    </BrowserRouter>
  );
}
