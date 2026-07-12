import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const library = read('src/pages/Sources/SourceLibrary.tsx');
const courseDetail = read('src/pages/Courses/CourseDetail.tsx');
const courses = read('src/pages/Courses/Courses.tsx');
const sourceModel = read('src/pages/Sources/sourceExperienceModel.ts');
const sourceApi = read('src/pages/Sources/sourceApi.ts');
const sourceDetail = read('src/pages/Sources/SourceDetailDialog.tsx');
const sourceDelete = read('src/pages/Sources/SourceDeleteDialog.tsx');
const projectDelete = read('src/pages/Courses/ProjectDeleteDialog.tsx');
const runtimeController = read('src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts');
const layerProps = read('src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayerProps.ts');

assert(!library.includes('Foundation placeholder'), 'Source Library must not remain a placeholder');
assert(library.includes('useSourceCollection'), 'Source Library must use the shared Source collection');
assert(courseDetail.includes('ProjectSourcesPanel'), 'Project detail must expose Project Sources');
assert(!courseDetail.includes('DocumentManager'), 'Project detail must not expose legacy Documents intake');
assert(!courses.includes('DocumentManager'), 'Project cards must not expose legacy Documents intake');
assert(sourceModel.includes('deriveSourceExperienceState'), 'Source status derivation must have one shared model');
assert(sourceModel.includes('sourceOpenBehavior'), 'Source open behavior must have one shared matrix');
assert(sourceModel.includes("'projection_missing'"), 'Projection-missing must be a first-class UI state');
assert(sourceApi.includes("responseType: 'blob'"), 'Original files must be fetched through authenticated blob requests');
assert(sourceApi.includes('getSourceDeletionImpact'), 'Source deletion must load server-side impact first');
assert(sourceApi.includes('deleteSource'), 'Source Library must expose the hard-delete API');
assert(sourceDetail.includes('onDelete?'), 'Source detail must keep deletion optional outside the global library');
assert(sourceDelete.includes('retained_receipt_count'), 'Source delete warning must explain retained receipts');
assert(projectDelete.includes('recommended_action'), 'Project delete must use the server-side dynamic default');
assert(projectDelete.includes('move_to_home'), 'Project delete must offer move-to-Home');
assert(runtimeController.includes('sourceProjectionPolicy'), 'Runtime controller must carry SourceProjection policy');
assert(layerProps.includes('contentReadOnly'), 'SourceProjection read-only policy must reach rendered layers');

console.log('Source experience contract check passed.');
