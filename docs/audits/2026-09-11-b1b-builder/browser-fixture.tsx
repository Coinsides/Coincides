import ReactDOM from 'react-dom/client';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import api from '@/services/api';
import BoardPage from '@/pages/Boards/BoardPage';
import BaselineBoardPage from './baseline/BoardPage';
import NoteDetailPage from '@/pages/Notes/NoteDetail';
import AppearanceSection from '@/pages/Settings/AppearanceSection';
import CourseModal from '@/components/CourseModal/CourseModal';
import ToastContainer from '@/components/Toast/Toast';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import '@/styles/global.css';

const bootstrap = await fetch('/__fixture/bootstrap').then((response) => response.json());
useAuthStore.setState({ user: bootstrap.user, loading: false, token: null });
document.documentElement.dataset.theme = bootstrap.user.settings.theme || 'dark';
const baseline = new URLSearchParams(location.search).has('baseline');
function Project() {
  const modal = useUIStore((state) => state.modal);
  return <main style={{ padding: 32 }}><h1>Field notes</h1><button onClick={async () => {
    const { data } = await api.get(`/courses/${bootstrap.projectId}/summary`);
    useUIStore.getState().openModal('course-edit', { course: data.course });
  }}>Edit project</button>{modal && <CourseModal />}</main>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<HashRouter><div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
  <nav aria-label="Synthetic audit navigation" style={{ display: 'flex', gap: 24, padding: '8px 16px', height: 42 }}>
    <Link to={`/boards/${bootstrap.boardId}`}>Board</Link><Link to={`/notes/${bootstrap.noteId}`}>Paper</Link><Link to="/appearance">Appearance</Link><Link to="/project">Project</Link>
  </nav>
  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }} data-app-main-scroll="true"><Routes>
    <Route path="/boards/:boardId" element={baseline ? <BaselineBoardPage /> : <BoardPage />} />
    <Route path="/notes/:noteId" element={<NoteDetailPage />} />
    <Route path="/appearance" element={<main style={{ padding: 32, maxWidth: 700 }}><AppearanceSection /></main>} />
    <Route path="/project" element={<Project />} />
  </Routes></div><ToastContainer />
</div></HashRouter>);
