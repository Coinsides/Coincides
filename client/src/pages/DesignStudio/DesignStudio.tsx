import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BookCopy, Boxes, Palette, Search, Sticker, SwatchBook } from 'lucide-react';
import PaletteDrawer from './PaletteDrawer';
import SuiteDrawer from './SuiteDrawer';
import styles from './DesignStudio.module.css';

const drawers = [
  { id: 'suites', label: '外观套装', icon: SwatchBook },
  { id: 'palette', label: '调色板', icon: Palette },
  { id: 'templates', label: '模板库', icon: BookCopy, description: '收纳不同用途的纸张与版式模板。' },
  { id: 'components', label: '部件', icon: Boxes, description: '收纳可组合的页面部件与样式。' },
  { id: 'stickers', label: '贴纸', icon: Sticker, description: '收纳可重复使用的装饰件与贴纸集合。' },
] as const;

export default function DesignStudio() {
  const { drawer = 'suites' } = useParams();
  const current = drawers.find((entry) => entry.id === drawer);
  if (!current) return <Navigate to="/design-studio" replace />;
  return <div className={styles.studio}>
    <header className={styles.header}><h1>设计室</h1><p>收藏与整理你的外观资产</p></header>
    <div className={styles.workspace}>
      <nav className={styles.drawers} aria-label="设计室抽屉">
        {drawers.map(({ id, label, icon: Icon }) => <Link key={id}
          to={`/design-studio/${id}`} aria-current={drawer === id ? 'page' : undefined}
          className={`${styles.drawer} ${drawer === id ? styles.active : ''}`}>
          <Icon size={18} aria-hidden /><span>{label}</span>
        </Link>)}
      </nav>
      <Gallery key={drawer} drawer={drawer} label={current.label}
        description={'description' in current ? current.description : undefined} />
    </div>
  </div>;
}

function Gallery({ drawer, label, description }: { drawer: string; label: string; description?: string }) {
  const [search, setSearch] = useState('');
  return <section className={styles.gallery} aria-label={label}>
    <div className={styles.galleryHeader}><h2>{label}</h2>
      {!description && <label className={styles.search}><Search size={16} aria-hidden />
        <input type="search" aria-label="搜索资产" placeholder="按名称搜索" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>}
    </div>
    {drawer === 'suites' ? <SuiteDrawer search={search} /> : drawer === 'palette' ? <PaletteDrawer search={search} /> :
      <div className={styles.placeholder}><p>{description}</p><span>V14 随批实装</span></div>}
  </section>;
}
