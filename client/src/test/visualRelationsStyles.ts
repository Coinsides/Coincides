/** Load production CSS into jsdom, retaining Vitest's ordinary CSS-module mocks
 * elsewhere. Mapping comes from the same modules used by React, not copied class names.
 */
import appCss from '../styles/global.css?raw';
import paperDefaults from '../pages/Notes/canvasEngine/paperSkinDefaults.css?raw';
const raw = import.meta.glob(['../pages/Notes/**/*.module.css', '../components/KaTeX/*.module.css', '../components/ReferenceTag/*.module.css'], { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const modules = import.meta.glob(['../pages/Notes/**/*.module.css', '../components/KaTeX/*.module.css', '../components/ReferenceTag/*.module.css'], { eager: true, import: 'default' }) as Record<string, Record<string, string>>;
const globalCss = import.meta.glob('../pages/Notes/canvasEngine/layers/NotePageThumbnail.css', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

export function mountVisualRelationStyles() {
  const style = document.createElement('style');
  style.dataset.visualRelationStyles = 'true';
  style.textContent = appCss + '\n' + paperDefaults + '\n' + Object.entries(raw).map(([path, source]) => {
    const globals: string[] = [];
    return source.replace(/:global\(([^)]+)\)/g, (_full, selector: string) => {
      globals.push(selector); return `__GLOBAL_${globals.length - 1}__`;
    }).replace(/\.([a-zA-Z_][\w-]*)/g, (full, key: string) => modules[path]?.[key] ? `.${modules[path][key]}` : full)
      .replace(/__GLOBAL_(\d+)__/g, (_full, index: string) => globals[Number(index)]);
  }).join('\n') + '\n' + Object.values(globalCss).join('\n');
  document.head.append(style);
  return () => style.remove();
}
