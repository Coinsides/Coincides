import type { AgentMessage } from '@shared/types';
import styles from './MessageBubble.module.css';

function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        nodes.push(
          <pre key={key++} className={styles.codeBlock}>
            <code>{codeLines.join('\n')}</code>
          </pre>,
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.trim() === '') {
      nodes.push(<br key={key++} />);
      continue;
    }

    // Lists
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      nodes.push(
        <div key={key++} className={styles.listItem}>
          <span className={styles.bullet}>•</span>
          <span>{renderInline(ulMatch[1])}</span>
        </div>,
      );
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (olMatch) {
      nodes.push(
        <div key={key++} className={styles.listItem}>
          <span className={styles.bullet}>{olMatch[1]}.</span>
          <span>{renderInline(olMatch[2])}</span>
        </div>,
      );
      continue;
    }

    nodes.push(<p key={key++} className={styles.paragraph}>{renderInline(line)}</p>);
  }

  if (inCodeBlock && codeLines.length > 0) {
    nodes.push(
      <pre key={key++} className={styles.codeBlock}>
        <code>{codeLines.join('\n')}</code>
      </pre>,
    );
  }

  return nodes;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(<code key={key++} className={styles.inlineCode}>{match[4]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface MessageBubbleProps {
  message: AgentMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`${styles.bubble} ${isUser ? styles.user : styles.assistant}`}>
      {isUser ? (
        <div className={styles.content}>{message.content}</div>
      ) : (
        <div className={styles.content}>{renderMarkdown(message.content)}</div>
      )}
    </div>
  );
}

interface StreamingBubbleProps {
  text: string;
  toolName: string | null;
}

export function StreamingBubble({ text, toolName }: StreamingBubbleProps) {
  return (
    <div className={`${styles.bubble} ${styles.assistant}`}>
      {toolName && (
        <div className={styles.toolPill}>
          <span className={styles.toolIcon}>⚙</span>
          {formatToolName(toolName)}...
        </div>
      )}
      {text && <div className={styles.content}>{renderMarkdown(text)}</div>}
      <span className={styles.cursor}>▊</span>
    </div>
  );
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
