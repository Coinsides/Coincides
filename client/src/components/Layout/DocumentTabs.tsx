import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, PanelsTopLeft, X } from 'lucide-react';
import { documentPath, useDocumentTabsStore, type DocumentTab } from '@/stores/documentTabsStore';
import { useAgentUiStore } from '@/stores/agentUiStore';
import styles from './DocumentTabs.module.css';

export function DocumentTabs() {
  const tabs = useDocumentTabsStore((state) => state.tabs);
  const activities = useAgentUiStore((state) => state.activities);
  const location = useLocation();
  const navigate = useNavigate();
  const closing = useRef<{ key: string; origin: string; destination: string } | null>(null);
  const dragging = useRef<string | null>(null);
  useEffect(() => {
    const request = closing.current;
    if (!request || location.pathname === request.origin) return;
    if (location.pathname === request.destination) useDocumentTabsStore.getState().close(request.key);
    closing.current = null;
  }, [location.pathname]);
  function close(tab: DocumentTab) {
    if (documentPath(tab) !== location.pathname) { useDocumentTabsStore.getState().close(tab.key); return; }
    const index = tabs.indexOf(tab);
    const neighbor = tabs[index + 1] ?? tabs[index - 1];
    const destination = neighbor ? documentPath(neighbor) : tab.kind === 'board' ? '/boards'
      : tab.projectId ? `/projects/${encodeURIComponent(tab.projectId)}` : '/projects';
    // Remove only after the existing route save barrier lets navigation complete.
    closing.current = { key: tab.key, origin: location.pathname, destination };
    navigate(destination);
  }
  if (!tabs.length) return null;
  return <div className={styles.strip} role="tablist" aria-label="打开的文档">
    {tabs.map((tab) => {
      const active = documentPath(tab) === location.pathname;
      const agentHere = Object.values(activities).some((activity) => tab.kind === 'note' ? activity.note_id === tab.id : activity.board_id === tab.id);
      const Icon = tab.kind === 'note' ? FileText : PanelsTopLeft;
      return <div key={tab.key} className={styles.tab} data-active={active} draggable
        onDragStart={(event) => { dragging.current = tab.key; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.key); }}
        onDragEnd={() => { dragging.current = null; }}
        onDragOver={(event) => { if (dragging.current) event.preventDefault(); }}
        onDrop={(event) => { event.preventDefault(); if (dragging.current) useDocumentTabsStore.getState().reorder(dragging.current, tab.key); dragging.current = null; }}
        onAuxClick={(event) => { if (event.button === 1) { event.preventDefault(); close(tab); } }}>
        <button type="button" role="tab" aria-selected={active} className={styles.select} title={tab.title}
          onClick={() => { closing.current = null; navigate(documentPath(tab)); }}
          onKeyDown={(event) => {
            if (event.key === 'Delete') { event.preventDefault(); close(tab); return; }
            const index = tabs.indexOf(tab);
            const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
            if (!direction) return;
            event.preventDefault();
            const next = tabs[(index + direction + tabs.length) % tabs.length];
            if (event.altKey) useDocumentTabsStore.getState().reorder(tab.key, next.key);
            else { navigate(documentPath(next)); event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[(index + direction + tabs.length) % tabs.length]?.focus(); }
          }}>
          <Icon size={14} aria-hidden="true"/><span className={styles.title}>{tab.title}</span>
          {agentHere && <span className={styles.agent} role="status" aria-label="Agent 正在操作" title="Agent 正在操作"/>}
          <span data-document-notification-slot={tab.key} className={styles.notification} aria-hidden="true"/>
        </button>
        <button type="button" className={styles.close} aria-label={`关闭 ${tab.title}`} title={`关闭 ${tab.title}`} onClick={() => close(tab)}><X size={12}/></button>
      </div>;
    })}
  </div>;
}
