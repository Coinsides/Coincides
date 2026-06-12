import { Archive, FileText, Link2, ShieldAlert } from 'lucide-react';
import styles from './SourceLibrary.module.css';

const foundationItems = [
  {
    icon: FileText,
    title: 'Project sources stay where they are',
    description: 'Uploaded files and source snapshots are still managed inside each project for now.',
  },
  {
    icon: Link2,
    title: 'Provenance chain is planned',
    description: 'Direct source, root source, internal note source, and broken-chain states belong to a later Better Notebook phase.',
  },
  {
    icon: ShieldAlert,
    title: 'No destructive source actions here',
    description: 'Archive, deprecate, delete, and degraded-chain recovery are intentionally not active in this seed page.',
  },
];

export default function SourceLibraryPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Evidence surface</div>
          <h1>Source Library</h1>
          <p>
            A quiet home for future source provenance: uploaded material, reconstructed notes,
            internal references, source versions, and broken-chain warnings.
          </p>
        </div>
      </header>

      <section className={styles.notice}>
        <Archive size={18} />
        <div>
          <strong>Foundation placeholder</strong>
          <span>
            This page introduces the Better Notebook navigation shape without changing source data,
            API contracts, or project-level source workflows.
          </span>
        </div>
      </section>

      <section className={styles.grid}>
        {foundationItems.map(({ icon: Icon, title, description }) => (
          <article key={title} className={styles.card}>
            <Icon size={18} />
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
