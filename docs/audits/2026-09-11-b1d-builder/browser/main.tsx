import ReactDOM from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import NoteDetailPage from '@/pages/Notes/NoteDetail';
import ToastContainer from '@/components/Toast/Toast';
import { useAuthStore } from '@/stores/authStore';
import '@/styles/global.css';

const bootstrap = await fetch('/__fixture/bootstrap').then((response) => response.json());
const auditPreset = new URLSearchParams(location.search).get('auditPreset');
if (auditPreset && ['default', 'quiet-ink', 'warm-paper', 'workbench'].includes(auditPreset)) {
  bootstrap.user.settings = { ...bootstrap.user.settings, skin: { preset: auditPreset } };
}
useAuthStore.setState({ user: bootstrap.user, loading: false, token: null });
document.documentElement.dataset.theme = 'dark';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter><div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }} data-app-main-scroll="true">
      <Routes>
        <Route path="/notes/:noteId" element={<NoteDetailPage />} />
        <Route path="*" element={<Navigate to={`/notes/${bootstrap.legacyNoteId}`} replace />} />
      </Routes>
    </div>
    <ToastContainer />
  </div></HashRouter>,
);
