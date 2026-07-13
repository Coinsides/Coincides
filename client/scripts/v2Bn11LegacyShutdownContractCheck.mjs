import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(path) {
  const fullPath = resolve(root, path);
  if (!existsSync(fullPath)) throw new Error(`Missing required file: ${path}`);
  return readFileSync(fullPath, 'utf8');
}

function assertAbsent(name, text, tokens) {
  const found = tokens.filter((token) => text.includes(token));
  if (found.length > 0) throw new Error(`${name}: forbidden ${found.join(', ')}`);
}

const activeContentGroupFiles = [
  'src/pages/Notes/canvasEngine/runtimeDataTypes.ts',
  'src/pages/Notes/canvasEngine/contentGroupService.ts',
  'src/pages/Notes/canvasEngine/contentGroupIndexService.ts',
  'src/pages/Notes/canvasEngine/contentGroupReuseService.ts',
  'src/pages/Notes/canvasEngine/contentGroupSurfaceRoleService.ts',
  'src/pages/GroupGallery/GroupGallery.tsx',
  'src/pages/GroupGallery/groupGalleryShellModel.ts',
  'src/pages/GroupGallery/SingleContentGroupEditor.tsx',
  'src/pages/GroupGallery/singleContentGroupEditorService.ts',
  'src/pages/GroupGallery/singleContentGroupEditorShellModel.ts',
].map(read).join('\n');

assertAbsent('active ContentGroup client surface', activeContentGroupFiles, [
  'ContentGroupFragmentV1',
  'ContentGroupPetalV1',
  'addPetalToContentGroup',
  'addMemberFragmentToPetal',
  'petalCountLabel',
  'Petal',
]);

const courseDetail = read('src/pages/Courses/CourseDetail.tsx');
assertAbsent('CourseDetail legacy Learning Canvas surface', courseDetail, [
  'LearningCanvasSurface',
  'fetchLearningCanvases',
  'handleCreateLearningCanvas',
  "api.get('/canvases",
  "api.post('/canvases",
  "'canvas_layout'",
  "'composition_template'",
]);

const appRoutes = read('src/App.tsx');
assertAbsent('legacy Learning Canvas client routes', appRoutes, [
  'projects/:courseId/notes/:canvasId',
  'courses/:courseId/notes/:canvasId',
]);

if (existsSync(resolve(root, 'src/pages/Courses/LearningCanvasSurface.tsx'))) {
  throw new Error('legacy Learning Canvas surface still exists');
}

const serverIndex = read('../server/src/index.ts');
assertAbsent('server legacy Learning Canvas route mounts', serverIndex, [
  'learningCanvasRoutes',
  'canvasNodeRoutes',
  'canvasEdgeRoutes',
  'relationLayerRoutes',
  'objectRelationRoutes',
  "app.use('/api/canvases'",
  "app.use('/api/canvas-nodes'",
  "app.use('/api/canvas-edges'",
  "app.use('/api/relation-layers'",
  "app.use('/api/object-relations'",
]);

const proposalRoutes = read('../server/src/routes/proposals.ts');
assertAbsent('legacy Learning Canvas proposal writers', proposalRoutes, [
  "router.post('/canvas-layout'",
  "router.post('/composition-template'",
  'createCanvasLayoutProposal',
  'applyCanvasLayoutProposal',
  'createCompositionTemplateProposal',
  'applyCompositionTemplateProposal',
]);

const validators = read('../server/src/validators/index.ts');
const contentGroupSchema = validators
  .split('export const upsertContentGroupSchema')[1]
  ?.split('export const replaceNoteContentGroupsSchema')[0] || '';
assertAbsent('active ContentGroup request schema', contentGroupSchema, [
  'fragments:',
  'petals:',
]);

if (existsSync(resolve(root, 'src/pages/Notes/canvasEngine/contentGroupRelationProjectionService.ts'))) {
  throw new Error('dead ContentGroup relation projection service still exists');
}

console.log('V2.BN.11.1 legacy shutdown contract passed');
