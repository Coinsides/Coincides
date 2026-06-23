import {
  SLASH_COMMAND_GROUP_LABELS,
  type NoteSlashCommand,
} from '../../noteSlashCommands';
import type { SlashMenuAnchor } from '../runtimeLayout';
import { FloatingOverlayLayer } from './FloatingOverlayLayer';
import styles from '../../NoteDetail.module.css';

interface SlashMenuLayerProps {
  activeCommandId: string | null;
  commands: NoteSlashCommand[];
  onSelect: (command: NoteSlashCommand) => void;
  anchor: SlashMenuAnchor | null;
}

export function SlashMenuLayer({
  activeCommandId,
  commands,
  onSelect,
  anchor,
}: SlashMenuLayerProps) {
  if (!anchor) return null;

  const grouped = commands.reduce<Record<string, NoteSlashCommand[]>>((acc, command) => {
    acc[command.group] = [...(acc[command.group] || []), command];
    return acc;
  }, {});

  return (
    <FloatingOverlayLayer open placement="free">
      <div
        className={styles.slashMenu}
        style={{ left: anchor.x, top: anchor.y }}
      >
        {commands.length === 0 ? (
          <div className={styles.slashEmpty}>No matching block type</div>
        ) : (
          (Object.keys(grouped) as Array<keyof typeof SLASH_COMMAND_GROUP_LABELS>).map((group) => (
            <div key={group} className={styles.slashGroup}>
              <div className={styles.slashGroupLabel}>{SLASH_COMMAND_GROUP_LABELS[group]}</div>
              {grouped[group].map((command) => (
                <button
                  key={command.id}
                  className={`${styles.slashItem} ${activeCommandId === command.id ? styles.slashItemActive : ''}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(command);
                  }}
                  disabled={Boolean(command.disabledReason)}
                  title={command.disabledReason || command.description}
                >
                  <span>{command.label}</span>
                  <small>{command.disabledReason || command.description}</small>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </FloatingOverlayLayer>
  );
}
