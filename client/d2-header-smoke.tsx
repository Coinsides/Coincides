import ReactDOM from 'react-dom/client';
import './src/i18n';
import './src/styles/global.css';
import { D2BrowserFixture } from '../docs/audits/2026-09-11-d2-builder/browser-fixture';

ReactDOM.createRoot(document.getElementById('root')!).render(<D2BrowserFixture />);
