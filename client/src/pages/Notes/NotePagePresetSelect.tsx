import { DEFAULT_NOTE_PAGE_PRESET, NOTE_PAGE_PRESETS, type NotePagePreset } from './canvasEngine/notePagePresetService';
import styles from './NotePagePresetSelect.module.css';

export function NotePagePresetSelect({ value = DEFAULT_NOTE_PAGE_PRESET, onChange, disabled }: {
  value?: NotePagePreset;
  onChange: (value: NotePagePreset) => void;
  disabled?: boolean;
}) {
  return <select className={styles.select} aria-label="Paper size" value={value} disabled={disabled}
    onChange={(event) => onChange(event.currentTarget.value as NotePagePreset)}>
    {NOTE_PAGE_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
  </select>;
}
