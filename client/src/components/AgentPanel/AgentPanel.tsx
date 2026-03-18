import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Plus, Send, ChevronDown, ClipboardList, MessageSquare, Trash2, ImagePlus } from 'lucide-react';
import { useAgentStore } from '@/stores/agentStore';
import { useProposalStore } from '@/stores/proposalStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import MessageBubble, { StreamingBubble } from './MessageBubble';
import ProposalList from './ProposalList';
import styles from './AgentPanel.module.css';

type PanelView = 'chat' | 'proposals';

export default function AgentPanel() {
  const agentPanelOpen = useUIStore((s) => s.agentPanelOpen);
  const setAgentPanelOpen = useUIStore((s) => s.setAgentPanelOpen);
  const agentContextHint = useUIStore((s) => s.agentContextHint);
  const user = useAuthStore((s) => s.user);

  const {
    conversations,
    activeConversationId,
    messages,
    streaming,
    streamingText,
    activeToolName,
    fetchConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
  } = useAgentStore();

  const proposals = useProposalStore((s) => s.proposals);
  const fetchProposals = useProposalStore((s) => s.fetchProposals);

  const [input, setInput] = useState('');
  const [view, setView] = useState<PanelView>('chat');
  const [showConvDropdown, setShowConvDropdown] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ media_type: string; data: string; preview: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const agentName = user?.settings?.agent_name || 'Mr. Zero';

  useEffect(() => {
    if (agentPanelOpen) {
      fetchConversations();
      fetchProposals();
      // Focus input after panel opens
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [agentPanelOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Handle context hint
  useEffect(() => {
    if (agentContextHint && agentPanelOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [agentContextHint, agentPanelOpen]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const media_type = file.type || 'image/jpeg';
      setPendingImage({ media_type, data: base64, preview: result });
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    const imageData = pendingImage ? { media_type: pendingImage.media_type, data: pendingImage.data } : undefined;
    setPendingImage(null);
    const contextHint = agentContextHint || undefined;
    // Clear context hint after sending
    useUIStore.setState({ agentContextHint: null });
    await sendMessage(text, contextHint, imageData);
  }, [input, streaming, agentContextHint, pendingImage, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = async () => {
    setShowConvDropdown(false);
    await createConversation();
  };

  const handleSelectConversation = async (id: string) => {
    setShowConvDropdown(false);
    await selectConversation(id);
  };

  if (!agentPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={() => setAgentPanelOpen(false)} />

      {/* Panel */}
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.agentName}>{agentName}</span>
            <div className={styles.convSelector}>
              <button
                className={styles.convDropdownBtn}
                onClick={() => setShowConvDropdown(!showConvDropdown)}
              >
                <span className={styles.convLabel}>
                  {activeConversationId
                    ? conversations.find((c) => c.id === activeConversationId)?.title || 'Chat'
                    : 'New chat'}
                </span>
                <ChevronDown size={12} />
              </button>
              {showConvDropdown && (
                <div className={styles.convDropdown}>
                  {conversations.map((conv) => (
                    <div key={conv.id} className={styles.convItem}>
                      <button
                        className={`${styles.convItemBtn} ${conv.id === activeConversationId ? styles.activeConv : ''}`}
                        onClick={() => handleSelectConversation(conv.id)}
                      >
                        {conv.title || 'Untitled'}
                      </button>
                      <button
                        className={styles.convDeleteBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <div className={styles.convEmpty}>No conversations yet</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.iconBtn} onClick={handleNewConversation} title="New conversation">
              <Plus size={16} />
            </button>
            <button className={styles.iconBtn} onClick={() => setAgentPanelOpen(false)} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div className={styles.viewTabs}>
          <button
            className={`${styles.viewTab} ${view === 'chat' ? styles.activeTab : ''}`}
            onClick={() => setView('chat')}
          >
            <MessageSquare size={13} />
            Chat
          </button>
          <button
            className={`${styles.viewTab} ${view === 'proposals' ? styles.activeTab : ''}`}
            onClick={() => setView('proposals')}
          >
            <ClipboardList size={13} />
            Proposals
            {proposals.length > 0 && (
              <span className={styles.badge}>{proposals.length}</span>
            )}
          </button>
        </div>

        {view === 'chat' ? (
          <>
            {/* Messages */}
            <div className={styles.messages}>
              {messages.length === 0 && !streaming && (
                <div className={styles.emptyChat}>
                  <div className={styles.emptyChatIcon}>🎓</div>
                  <div className={styles.emptyChatTitle}>Hi! I&apos;m {agentName}</div>
                  <div className={styles.emptyChatSubtitle}>
                    Ask me to create tasks, study plans, flashcards, or help you organize your learning.
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {streaming && (
                <StreamingBubble text={streamingText} toolName={activeToolName} />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Proposal banner */}
            {proposals.length > 0 && (
              <button className={styles.proposalBanner} onClick={() => setView('proposals')}>
                📋 {proposals.length} pending proposal{proposals.length > 1 ? 's' : ''}
              </button>
            )}

            {/* Context hint indicator */}
            {agentContextHint && (
              <div className={styles.contextHint}>
                Viewing: {agentContextHint.type}
                <button onClick={() => useUIStore.setState({ agentContextHint: null })}>
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Image preview */}
            {pendingImage && (
              <div className={styles.imagePreview}>
                <img src={pendingImage.preview} alt="Upload preview" className={styles.imagePreviewImg} />
                <button className={styles.imagePreviewRemove} onClick={() => setPendingImage(null)}>
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Input */}
            <div className={styles.inputArea}>
              <label className={styles.imageUploadBtn} title="Upload image">
                <ImagePlus size={18} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageSelect}
                />
              </label>
              <textarea
                ref={inputRef}
                className={styles.input}
                placeholder={`Message ${agentName}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                rows={1}
              />
              <button
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!input.trim() || streaming}
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className={styles.proposalView}>
            <ProposalList />
          </div>
        )}
      </div>
    </>
  );
}
