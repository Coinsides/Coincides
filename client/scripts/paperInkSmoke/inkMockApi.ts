import axios from 'axios';
import { readCanvasAssetFixture } from '../../test/fixtures/canvasAssetFixture';
import { listNoteBlockTemplates, legacyBlockTypeForTemplate } from '@shared/types';

export const NOTE_ID = 'paper-ink-smoke-note';
export const API_BASE = '/api';
export const getToken = () => null;
export const setToken = (_value: unknown) => undefined;
export const apiCalls: Array<{ method: string; url: string }> = [];

const templates = listNoteBlockTemplates().map((template) => ({
  id: `ink-template-${template.template_id}`, template_key: template.template_id,
  version: '1.0.0', origin: 'system_seed', label: template.label, description: template.description,
  system_type: template.system_type, learning_role: template.learning_role,
  legacy_block_type: legacyBlockTypeForTemplate(template.template_id),
  default_content: template.default_content, status: 'active',
}));
const emptyCatalogs = new Set(['/content-groups', '/group-folders', '/source-anchors', '/purposes']);

const api = axios.create({
  adapter: async (config) => {
    const method = (config.method || 'get').toUpperCase();
    const url = config.url || '';
    apiCalls.push({ method, url });
    const asset = method === 'GET' ? readCanvasAssetFixture(url) : undefined;
    if (asset) return { ...asset, status: 200, statusText: 'OK', headers: {}, config };
    if (/^\/(?:notes|canvas-objects|note-blocks)(?:\/|$)/.test(url)) {
      const target = new URL(`/api${url}`, window.location.origin);
      for (const [name, value] of Object.entries(config.params || {})) {
        if (value !== null && value !== undefined) target.searchParams.set(name, String(value));
      }
      const response = await fetch(target, {
        method, headers: { 'content-type': 'application/json' },
        body: method === 'GET' || method === 'HEAD' ? undefined : config.data,
      });
      const data = await response.json();
      const result = { data, status: response.status, statusText: response.statusText, headers: {}, config };
      if (!response.ok) throw new axios.AxiosError(`Synthetic ink API failed: ${response.status}`, undefined, config, undefined, result);
      return result;
    }
    let data: unknown;
    if (method === 'GET' && url === '/templates') data = templates;
    else if (method === 'GET' && url === '/palette-colors') data = [];
    else if (method === 'GET' && url === '/courses/paper-ink-smoke-course/summary') data = { course: { id: 'paper-ink-smoke-course', name: 'Synthetic paper ink', skin: null }, goals: [], decks: [], documents: [] };
    else if (method === 'GET' && url === `/boards/text-ranges/by-note/${NOTE_ID}`) data = { text_ranges: [] };
    else if (method === 'POST' && url === '/source-anchors/generate') data = {};
    else if (method === 'GET' && (emptyCatalogs.has(url)
      || url === `/annotation-truths/by-note/${NOTE_ID}` || url === `/purposes/by-note/${NOTE_ID}`)) data = [];
    else throw new Error(`Unmapped ink fixture request: ${method} ${url}`);
    return { data: structuredClone(data), status: 200, statusText: 'OK', headers: {}, config };
  },
});
export default api;
