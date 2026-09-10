import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import AppLayout from '@/components/Layout/AppLayout';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import DailyBrief from '@/pages/DailyBrief/DailyBrief';
import CalendarPage from '@/pages/Calendar/Calendar';
import GoalsPage from '@/pages/Goals/Goals';
import CoursesPage from '@/pages/Courses/Courses';
import CourseDetailPage from '@/pages/Courses/CourseDetail';
import NoteDetailPage from '@/pages/Notes/NoteDetail';
import BoardList from '@/pages/Boards/BoardList';
import BoardPage from '@/pages/Boards/BoardPage';
import SourceLibraryPage from '@/pages/Sources/SourceLibrary';
import GroupGalleryPage from '@/pages/GroupGallery/GroupGallery';
import SingleContentGroupEditorPage from '@/pages/GroupGallery/SingleContentGroupEditor';
import SettingsPage from '@/pages/Settings/Settings';
import AgentMemoriesPage from '@/pages/AgentMemories/AgentMemories';
import ToolReceiptsPage from '@/pages/ToolReceipts/ToolReceipts';
import DecksPage from '@/pages/Decks/Decks';
import DeckDetailPage from '@/pages/Decks/DeckDetail';
import ReviewPage from '@/pages/Review/Review';
import StatisticsPage from '@/pages/Statistics/Statistics';
import TaskModal from '@/components/TaskModal/TaskModal';
import CourseModal from '@/components/CourseModal/CourseModal';
import GoalModal from '@/components/GoalModal/GoalModal';
import DeckModal from '@/components/DeckModal/DeckModal';
import CardModal from '@/components/CardModal/CardModal';
import CardViewModal from '@/components/CardViewModal/CardViewModal';
import TaskViewModal from '@/components/TaskViewModal/TaskViewModal';
import AgentPanel from '@/components/AgentPanel/AgentPanel';
import ShortcutsPanel from '@/components/ShortcutsPanel/ShortcutsPanel';
import ToastContainer from '@/components/Toast/Toast';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthenticatedOverlays() {
  const token = useAuthStore((s) => s.token);
  if (!token) return null;
  return <AgentPanel />;
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
    case 'deck-create':
    case 'deck-edit':
      return <DeckModal />;
    case 'card-create':
    case 'card-edit':
      return <CardModal />;
    case 'card-view':
      return <CardViewModal />;
    case 'task-view':
      return <TaskViewModal />;
    default:
      return null;
  }
}

export default function App() {
  return (
    <HashRouter>
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
          <Route path="projects" element={<CoursesPage />} />
          <Route path="projects/:courseId" element={<CourseDetailPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:courseId" element={<CourseDetailPage />} />
          <Route path="notes/:noteId" element={<NoteDetailPage />} />
          <Route path="boards" element={<BoardList />} />
          <Route path="boards/:boardId" element={<BoardPage />} />
          <Route path="sources" element={<SourceLibraryPage />} />
          <Route path="group-gallery" element={<GroupGalleryPage />} />
          <Route path="group-gallery/editor" element={<SingleContentGroupEditorPage />} />
          <Route path="decks" element={<DecksPage />} />
          <Route path="decks/:deckId" element={<DeckDetailPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="agent-memories" element={<AgentMemoriesPage />} />
          <Route path="tool-receipts" element={<ToolReceiptsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ModalLayer />
      <AuthenticatedOverlays />
      <ShortcutsPanel />
      <ToastContainer />
    </HashRouter>
  );
}
