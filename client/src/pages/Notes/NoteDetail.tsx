import { useParams } from 'react-router-dom';
import NoteCanvasRuntime from './canvasEngine/NoteCanvasRuntime';
import { NoteCanvasRuntimeProvider } from './canvasEngine/NoteCanvasRuntimeProvider';

export default function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();

  return (
    <NoteCanvasRuntimeProvider noteId={noteId}>
      <NoteCanvasRuntime />
    </NoteCanvasRuntimeProvider>
  );
}
