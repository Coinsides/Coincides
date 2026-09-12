import ReactDOM from 'react-dom/client';
import { useEffect } from 'react';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import BoardPage from '@/pages/Boards/BoardPage';
import CourseDetailPage from '@/pages/Courses/CourseDetail';
import NoteDetailPage from '@/pages/Notes/NoteDetail';
import ToastContainer from '@/components/Toast/Toast';
import { useAuthStore } from '@/stores/authStore';
import '@/styles/global.css';
import { printNoteWithCapture, restorePrintCapture, showFrozenPrintCapture } from './printProbe';

const bootstrap = await fetch('/__fixture/bootstrap').then((response) => response.json());
useAuthStore.setState({ user: bootstrap.user, loading: false, token: null });
document.documentElement.dataset.theme = bootstrap.user.settings.theme || 'dark';

function AuditPrintReceipt() {
  useEffect(() => restorePrintCapture(), []);
  return <details style={{ flexShrink: 0, padding: '0 16px' }}>
    <summary><output data-b1c-print-status>No native print capture yet</output></summary>
    <pre data-b1c-print-receipt style={{ maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap' }} />
    <label>Captured native print root HTML<textarea data-b1c-print-html readOnly rows={3} style={{ width: '100%' }} /></label>
  </details>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter><div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <nav aria-label="Synthetic audit navigation" style={{ display: 'flex', gap: 24, padding: '8px 16px', height: 42 }}>
      <Link to={`/projects/${bootstrap.projectId}`}>Project</Link>
      <Link to={`/boards/${bootstrap.boardId}`}>Board</Link>
      <Link to={`/notes/${bootstrap.legacyNoteId}`}>Legacy A4</Link>
      <button type="button" onClick={printNoteWithCapture}>Print note</button>
      <button type="button" onClick={showFrozenPrintCapture}>Show frozen print capture</button>
    </nav>
    <AuditPrintReceipt />
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }} data-app-main-scroll="true">
      <Routes>
        <Route path="/projects/:courseId" element={<CourseDetailPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/notes/:noteId" element={<NoteDetailPage />} />
        <Route path="*" element={<Navigate to={`/projects/${bootstrap.projectId}`} replace />} />
      </Routes>
    </div>
    <ToastContainer />
  </div></HashRouter>,
);
