import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './Auth.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
      addToast('error', 'Login failed');
      // Error is handled by store
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1>Coincides</h1>
          <p>Your learning operating system</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => { clearError(); setEmail(e.target.value); }}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { clearError(); setPassword(e.target.value); }}
              required
            />
          </div>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className={styles.link}>
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
