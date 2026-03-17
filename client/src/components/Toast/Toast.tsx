import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import type { Toast as ToastType } from '@/stores/uiStore';
import styles from './Toast.module.css';

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useUIStore((s) => s.removeToast);
  const Icon = icons[toast.type];

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <Icon size={16} />
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={() => removeToast(toast.id)}>
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
