import type { AgentMessage, AgentTurnReceipt } from '@shared/types';
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
  message: AgentMessage & { image_preview?: string };
}

function TurnReceipt({ receipt, text }: { receipt?: AgentTurnReceipt | null; text: string }) {
  // A missing projection is unknown, never evidence that no write happened.
  if (!receipt) return null;
  const unclassified = receipt.unclassified_calls ?? [];
  const label = text.trim() ? '本轮无写动作' : receipt.read_calls.length ? '仅查阅' : null;
  if (!receipt.write_calls.length && !unclassified.length && !label) return null;

  return (
    <div className={styles.turnReceipt} role="note" aria-label="本轮工具收据">
      {receipt.write_calls.map((call, index) => (
        <span key={index} aria-label={`${call.ok ? '成功' : '失败'} ${call.name}`}>
          {call.ok ? '✓' : '✗'} {call.name}
        </span>
      ))}
      {unclassified.map((call, index) => <span key={`unknown-${index}`}>未分类工具：{call.name}</span>)}
      {!receipt.write_calls.length && !unclassified.length && label}
      {receipt.board_layout_reports?.map(layout => <details key={layout.board_id}>
        <summary>板排版体检：{layout.report ? `${layout.report.issues.length} 项提示` : '暂不可用'}</summary>
        <p>含装卸区的候选布局；仅诊断，不阻断写入。</p>
        {layout.report?.issues.map((issue, index) => <p key={index}>
          {({ 'label-card-overlap': '标签与卡片重叠', 'label-label-overlap': '标签重叠',
            'edge-through-card': '连线穿过卡片', 'card-card-overlap': '卡片重叠',
            'near-parallel-edges': '近平行连线重叠' } as Record<string, string>)[issue.kind] ?? issue.kind}
          {' '}({Math.round(issue.coordinate.x)}, {Math.round(issue.coordinate.y)})
        </p>)}
      </details>)}
    </div>
  );
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`${styles.bubble} ${isUser ? styles.user : styles.assistant}`}>
      {message.image_preview && (
        <img src={message.image_preview} alt="Uploaded" className={styles.messageImage} />
      )}
      {isUser ? (
        <div className={styles.content}>{message.content}</div>
      ) : message.content.trim() ? (
        <div className={styles.content}>{renderMarkdown(message.content)}</div>
      ) : null}
      {message.role === 'assistant' && <TurnReceipt receipt={message.turn_receipt} text={message.content} />}
    </div>
  );
}

interface StreamingBubbleProps {
  text: string;
  toolName: string | null;
  receipt?: AgentTurnReceipt | null;
}

export function StreamingBubble({ text, toolName, receipt }: StreamingBubbleProps) {
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
      <TurnReceipt receipt={receipt} text={text} />
    </div>
  );
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
