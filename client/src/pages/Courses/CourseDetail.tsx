import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, Plus, Target, Layers, FileText,
  CheckCircle2, Circle, Pause, RotateCcw, BookOpen, Sparkles, MapIcon, GitBranch,
  AlertTriangle, Eye, X, RefreshCw, LayoutDashboard, Maximize2, Minimize2,
} from 'lucide-react';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import api from '@/services/api';
import { getNoteBlockTemplateLabel } from '@shared/types';
import type { Course, Goal, SourceMaterial, MaterialSegment } from '@shared/types';
import {
  createPageFrameCollectionSeed,
} from '../Notes/canvasEngine/pageFrameCollectionService';
import {
  savePageFrameCollectionForNote,
} from '../Notes/canvasEngine/canvasObjectRepository';
import LearningCanvasSurface from './LearningCanvasSurface';
import { ProjectSourcesPanel } from '../Sources/ProjectSourcesPanel';
import { ProjectDeleteDialog } from './ProjectDeleteDialog';
import styles from './CourseDetail.module.css';

type ReconciliationGroupDecision = 'accepted_evidence_set' | 'kept_separate' | 'deferred' | 'excluded' | 'mark_conflict';

interface GoalSummary extends Goal {
  task_count: number;
  completed_task_count: number;
}

interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  card_count: number;
  due_count: number;
  created_at: string;
}

interface DocSummary {
  id: string;
  filename: string;
  file_type: string;
  parse_status: string;
  page_count: number | null;
  created_at: string;
}

interface SourceSnapshotSummary {
  id: string;
  title: string;
  source_filename: string;
  status: string;
  snapshot_kind: string;
  page_count: number | null;
  chunk_count: number | null;
  document_id: string;
  updated_at: string;
}

interface SourceSnapshotPage {
  id: string;
  source_snapshot_id?: string;
  page_number: number;
  page_label: string;
  text_content: string;
}

interface SourceSnapshotDetail {
  snapshot: SourceSnapshotSummary;
  pages: SourceSnapshotPage[];
  warnings: string[];
}

interface SourceScopeSummary {
  id: string;
  course_id: string;
  source_snapshot_id: string | null;
  source_snapshot_page_id: string | null;
  source_anchor_id: string | null;
  source_material_id: string | null;
  material_segment_id: string | null;
  scope_kind: 'page' | 'page_range' | 'anchor' | 'source_material' | 'material_segment';
  label: string;
  page_start: number | null;
  page_end: number | null;
  status: 'active' | 'archived';
}

interface SourceBoardSummary {
  id: string;
  course_id: string;
  title: string;
  status: 'active' | 'archived';
  updated_at: string;
}

interface SourceBoardNodeSummary {
  id: string;
  source_board_id: string;
  node_type: 'source_scope' | 'source_anchor' | 'source_material' | 'material_segment' | 'evidence_set' | 'note_block' | 'proposal_entry';
  target_id: string;
  source_scope_id: string | null;
  source_anchor_id: string | null;
  title: string;
  summary: string | null;
  status: 'active' | 'archived';
  order_index: number;
}

interface SourceBoardDetail {
  board: SourceBoardSummary;
  nodes: SourceBoardNodeSummary[];
}

interface LearningCanvasSummary {
  id: string;
  course_id: string;
  title: string;
  status: 'active' | 'archived';
  canvas_kind: 'finite' | 'infinite';
  preset: string;
  page_size: string;
  orientation: string;
  width: number;
  height: number;
  background_style: string;
}

interface CanvasNodeSummary {
  id: string;
  canvas_id: string;
  node_type: string;
  target_id: string;
  title: string;
  summary: string | null;
  status: 'active' | 'archived';
  x: number;
  y: number;
  width: number;
  height: number;
  z_index?: number;
}

interface LearningCanvasDetail {
  canvas: LearningCanvasSummary;
  nodes: CanvasNodeSummary[];
  archived_nodes?: CanvasNodeSummary[];
  edges: Array<{
    id: string;
    canvas_id: string;
    source_node_id: string;
    source_port: 'top' | 'right' | 'bottom' | 'left';
    target_node_id: string | null;
    target_port: 'top' | 'right' | 'bottom' | 'left' | null;
    loose_target_x: number | null;
    loose_target_y: number | null;
    object_relation_id: string | null;
    relation_layer_id: string | null;
    relation_kind: string | null;
    label: string | null;
    connection_state:
      | 'incomplete'
      | 'visual_only'
      | 'relation_suggested'
      | 'relation_backed'
      | 'stale_binding'
      | 'broken_relation';
    style_key: string;
    status: 'active' | 'archived';
  }>;
  relation_layers?: Array<{
    id: string;
    title: string;
    layer_kind: string;
    visibility: 'visible' | 'hidden';
    status: 'active' | 'archived';
  }>;
  frames: unknown[];
  viewport: {
    viewport_x: number;
    viewport_y: number;
    zoom: number;
  };
}

interface CanvasNoteBlockDraft {
  template_id: string;
  metadata?: Record<string, unknown>;
  title?: string;
  plain_text: string;
  content_json: Record<string, unknown>;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CompositionTemplateSummary {
  id: string;
  composition_key: string;
  label: string;
  status: 'active' | 'deprecated' | 'archived';
  summary_for_agent?: string;
}

interface NoteSummary {
  id: string;
  title: string;
  description: string | null;
  updated_at: string;
}

interface ReconciliationSafetyData {
  active_exclusions: Array<{
    id: string;
    status: string;
    reason: string | null;
    group_id: string | null;
    created_at: string;
  }>;
  open_conflicts: Array<{
    id: string;
    status: string;
    title: string;
    severity: string;
    created_at: string;
  }>;
  recent_conflicts: Array<{
    id: string;
    status: string;
    title: string;
    severity: string;
    updated_at: string;
  }>;
  recent_recovery_events: Array<{
    id: string;
    event_type: string;
    target_type: string;
    next_status: string;
    created_at: string;
  }>;
}

interface ProposalResponse {
  id: string;
  type: 'material_map' | 'organized_note' | 'material_reconciliation' | 'canvas_layout' | 'composition_template';
  status: string;
  data: {
    title: string;
    description?: string;
    generation_mode?: string;
    apply_behavior?: string;
    source_board_id?: string;
    confidence?: number | null;
    segments?: Array<{
      segment_id: string;
      title: string;
      segment_type: string;
      order_index: number;
      page_start: number | null;
      page_end: number | null;
      confidence: number | null;
      warnings: string[];
    }>;
    blocks?: Array<{
      temp_id: string;
      block_type: string;
      title: string | null;
      plain_text: string;
      order_index: number;
      confidence: number | null;
      metadata?: Record<string, unknown>;
      source_references: Array<{
        source_excerpt?: string;
        source_page_start?: number | null;
        source_page_end?: number | null;
      }>;
      warnings: string[];
    }>;
    candidate_groups?: Array<{
      group_id: string;
      group_kind: 'DUPLICATE' | 'OVERLAP' | 'SAME_CONCEPT_EVIDENCE' | 'CONFLICT';
      confidence: number | null;
      suggested_action: string;
      title: string;
      learning_role_candidates?: Array<{
        learning_role: string;
        confidence: number;
        reason: string;
        source_fragment_ids: string[];
      }>;
      template_candidates?: Array<{
        template_id: string;
        label: string;
        confidence: number;
        reason: string;
      }>;
      role_confidence?: number | null;
      role_warnings?: string[];
      blocked_by_safety?: boolean;
      safety_reasons?: string[];
      evidence: Array<{
        excerpt: string;
        reason: string;
        page_start: number | null;
        page_end: number | null;
      }>;
      warnings: string[];
    }>;
    node_layouts?: Array<{
      temp_id: string;
      action: 'update_layout' | 'create_node';
      canvas_node_id?: string;
      node_type: string;
      target_id: string;
      title: string;
      summary?: string | null;
      x: number;
      y: number;
      width: number;
      height: number;
      z_index: number;
    }>;
    frames?: Array<{
      temp_id: string;
      title: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    layout_plan?: {
      frame?: {
        temp_id?: string;
        title: string;
        x: number;
        y: number;
        width: number;
        height: number;
      };
      node_layouts?: Array<{
        slot_key: string;
        slot_index: number;
        x: number;
        y: number;
        width: number;
        height: number;
        z_index: number;
      }>;
    };
    slot_plan?: Array<{
      slot_key: string;
      slot_index: number;
      label: string;
      status: 'filled' | 'skipped';
      template_key?: string;
      title?: string;
      plain_text?: string;
      warnings?: string[];
    }>;
    relation_blueprint_suggestions?: Array<{
      temp_id: string;
      relation_type: string;
      source_slot: string;
      target_slot: string;
      status: string;
    }>;
    input_summary?: {
      planned_object_count?: number;
      create_node_count?: number;
      update_layout_count?: number;
    };
    proposed_canvas?: {
      width: number;
      height: number;
    };
    warnings?: string[];
    source_scope_ids?: string[];
    scope_summary?: Array<{
      id: string;
      label: string;
      scope_kind: string;
      page_start: number | null;
      page_end: number | null;
    }>;
  };
}

interface CourseSummaryData {
  course: Course;
  goals: GoalSummary[];
  decks: DeckSummary[];
  documents: DocSummary[];
}

const STATUS_ICONS: Record<string, typeof Circle> = {
  active: Circle,
  completed: CheckCircle2,
  paused: Pause,
};

function percent(value: number | null | undefined): string {
  return `${Math.round((value || 0) * 100)}%`;
}

function formatRoleLabel(value: string | undefined): string {
  if (!value) return 'Note';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CourseDetailPage() {
  const { courseId, canvasId } = useParams<{ courseId: string; canvasId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const deleteCourse = useCourseStore((s) => s.deleteCourse);

  const [data, setData] = useState<CourseSummaryData | null>(null);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [materials, setMaterials] = useState<SourceMaterial[]>([]);
  const [segmentsByMaterial, setSegmentsByMaterial] = useState<Record<string, MaterialSegment[]>>({});
  const [activeProposal, setActiveProposal] = useState<ProposalResponse | null>(null);
  const [reconciliationDecisions, setReconciliationDecisions] = useState<Record<string, ReconciliationGroupDecision>>({});
  const [reconciliationSafety, setReconciliationSafety] = useState<ReconciliationSafetyData | null>(null);
  const [sourceSnapshots, setSourceSnapshots] = useState<SourceSnapshotSummary[]>([]);
  const [activeSourceSnapshot, setActiveSourceSnapshot] = useState<SourceSnapshotDetail | null>(null);
  const [sourceSnapshotWarnings, setSourceSnapshotWarnings] = useState<string[]>([]);
  const [sourceScopes, setSourceScopes] = useState<SourceScopeSummary[]>([]);
  const [sourceScopeRangeStart, setSourceScopeRangeStart] = useState<SourceSnapshotPage | null>(null);
  const [sourceBoards, setSourceBoards] = useState<SourceBoardSummary[]>([]);
  const [activeSourceBoard, setActiveSourceBoard] = useState<SourceBoardDetail | null>(null);
  const [learningCanvases, setLearningCanvases] = useState<LearningCanvasSummary[]>([]);
  const [activeLearningCanvas, setActiveLearningCanvas] = useState<LearningCanvasDetail | null>(null);
  const [compositionTemplates, setCompositionTemplates] = useState<CompositionTemplateSummary[]>([]);
  const [selectedCompositionTemplateId, setSelectedCompositionTemplateId] = useState('');
  const [canvasFocusMode, setCanvasFocusMode] = useState(false);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [sourceSnapshotBusy, setSourceSnapshotBusy] = useState<string | null>(null);
  const [proposalBusy, setProposalBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [summaryRes, notesRes] = await Promise.all([
        api.get(`/courses/${courseId}/summary`),
        api.get(`/notes?course_id=${courseId}`),
      ]);
      setData(summaryRes.data);
      setNotes(notesRes.data);
    } catch (err) {
      console.error('Failed to fetch course summary:', err);
      addToast('error', 'Failed to load course');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const fetchMaterials = useCallback(async () => {
    if (!courseId) return;
    setMaterialLoading(true);
    try {
      const res = await api.get('/course-materials', { params: { course_id: courseId } });
      const completedMaterials = (res.data as SourceMaterial[]).filter(
        (material) => material.fragment_status === 'ready',
      );
      const segmentPairs = await Promise.all(
        completedMaterials.map(async (material) => {
          const segmentRes = await api.get(`/course-materials/${material.id}/segments`);
          return [material.id, segmentRes.data] as const;
        }),
      );
      setSegmentsByMaterial(Object.fromEntries(segmentPairs));
      const refreshedRes = segmentPairs.length > 0
        ? await api.get('/course-materials', { params: { course_id: courseId } })
        : res;
      setMaterials(refreshedRes.data);
    } catch (err) {
      console.error('Failed to fetch course materials:', err);
      addToast('error', 'Failed to load course materials');
    } finally {
      setMaterialLoading(false);
    }
  }, [courseId]);

  const fetchReconciliationSafety = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await api.get('/reconciliation/safety', { params: { course_id: courseId } });
      setReconciliationSafety(res.data);
    } catch (err) {
      console.error('Failed to fetch reconciliation safety:', err);
      setReconciliationSafety(null);
    }
  }, [courseId]);

  const fetchSourceSnapshots = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await api.get('/source-snapshots', { params: { course_id: courseId } });
      setSourceSnapshots(res.data);
    } catch (err) {
      console.error('Failed to fetch source snapshots:', err);
      setSourceSnapshots([]);
    }
  }, [courseId]);

  const fetchSourceScopes = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await api.get('/source-scopes', { params: { course_id: courseId, status: 'active' } });
      setSourceScopes(res.data);
    } catch (err) {
      console.error('Failed to fetch source scopes:', err);
      setSourceScopes([]);
    }
  }, [courseId]);

  const fetchSourceBoards = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await api.get('/source-boards', { params: { course_id: courseId, status: 'active' } });
      const boards = res.data as SourceBoardSummary[];
      setSourceBoards(boards);
      if (!activeSourceBoard && boards.length > 0) {
        const detailRes = await api.get(`/source-boards/${boards[0].id}`);
        setActiveSourceBoard(detailRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch source boards:', err);
      setSourceBoards([]);
    }
  }, [courseId, activeSourceBoard]);

  const fetchActiveSourceBoard = useCallback(async () => {
    if (!activeSourceBoard?.board.id) return;
    try {
      const res = await api.get(`/source-boards/${activeSourceBoard.board.id}`);
      setActiveSourceBoard(res.data);
    } catch (err) {
      console.error('Failed to fetch active source board:', err);
      setActiveSourceBoard(null);
    }
  }, [activeSourceBoard?.board.id]);

  const fetchLearningCanvases = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await api.get('/canvases', { params: { course_id: courseId, status: 'active' } });
      const canvases = res.data as LearningCanvasSummary[];
      setLearningCanvases(canvases);
      if (canvasId) {
        if (activeLearningCanvas?.canvas.id !== canvasId) {
          const detailRes = await api.get(`/canvases/${canvasId}`);
          setActiveLearningCanvas(detailRes.data);
        }
      } else {
        setActiveLearningCanvas(null);
      }
    } catch (err) {
      console.error('Failed to fetch canvases:', err);
      setLearningCanvases([]);
      if (canvasId) {
        setActiveLearningCanvas(null);
      }
    }
  }, [courseId, canvasId, activeLearningCanvas?.canvas.id]);

  const fetchCanvasDetail = useCallback(async (targetCanvasId: string) => {
    try {
      const detailRes = await api.get(`/canvases/${targetCanvasId}`);
      setActiveLearningCanvas(detailRes.data);
    } catch (err) {
      console.error('Failed to fetch canvas detail:', err);
      addToast('error', 'Failed to open canvas document');
      if (courseId) {
        navigate(`/projects/${courseId}`);
      }
    }
  }, [addToast, courseId, navigate]);

  const fetchActiveLearningCanvas = useCallback(async () => {
    if (!activeLearningCanvas?.canvas.id) return;
    try {
      const res = await api.get(`/canvases/${activeLearningCanvas.canvas.id}`);
      setActiveLearningCanvas(res.data);
    } catch (err) {
      console.error('Failed to fetch active canvas:', err);
      setActiveLearningCanvas(null);
    }
  }, [activeLearningCanvas?.canvas.id]);

  const fetchCompositionTemplates = useCallback(async () => {
    try {
      const res = await api.get('/composition-templates', { params: { status: 'active' } });
      const templates = (res.data as CompositionTemplateSummary[]) || [];
      setCompositionTemplates(templates);
      setSelectedCompositionTemplateId((current) => (
        current && templates.some((template) => template.id === current)
          ? current
          : templates.find((template) => template.composition_key === 'theorem_proof_example.basic')?.id || templates[0]?.id || ''
      ));
    } catch (err) {
      console.error('Failed to fetch composition templates:', err);
      setCompositionTemplates([]);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!data || new URLSearchParams(location.search).get('focus') !== 'sources') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('project-sources')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [data, location.search]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    fetchReconciliationSafety();
  }, [fetchReconciliationSafety]);

  useEffect(() => {
    fetchSourceSnapshots();
  }, [fetchSourceSnapshots]);

  useEffect(() => {
    fetchSourceScopes();
  }, [fetchSourceScopes]);

  useEffect(() => {
    fetchSourceBoards();
  }, [fetchSourceBoards]);

  useEffect(() => {
    fetchLearningCanvases();
  }, [fetchLearningCanvases]);

  useEffect(() => {
    fetchCompositionTemplates();
  }, [fetchCompositionTemplates]);

  const activeSourceScopeIds = sourceScopes
    .filter((scope) => scope.status === 'active')
    .map((scope) => scope.id);
  const activeSourceBoardScopeNodeCount = activeSourceBoard?.nodes
    .filter((node) => node.status === 'active' && node.node_type === 'source_scope').length || 0;
  const canvasSourceBoardNodeTargetIds = new Set(
    activeLearningCanvas?.nodes
      .filter((node) => node.status === 'active' && node.node_type === 'source_board_node')
      .map((node) => node.target_id) || [],
  );
  const archivedCanvasSourceBoardNodeTargetIds = new Set(
    activeLearningCanvas?.archived_nodes
      ?.filter((node) => node.node_type === 'source_board_node')
      .map((node) => node.target_id) || [],
  );
  const sourceBoardNodesToAddCount = activeSourceBoard?.nodes
    .filter((node) => node.status === 'active' && !canvasSourceBoardNodeTargetIds.has(node.id)).length || 0;
  const sourceBoardNodesToRestoreCount = activeSourceBoard?.nodes
    .filter((node) => node.status === 'active' && archivedCanvasSourceBoardNodeTargetIds.has(node.id)).length || 0;
  const canvasAddBoardLabel = activeSourceBoard && activeSourceBoard.nodes.length > 0 && sourceBoardNodesToAddCount === 0
    ? 'Board nodes added'
    : sourceBoardNodesToRestoreCount > 0 && sourceBoardNodesToRestoreCount === sourceBoardNodesToAddCount
      ? 'Restore board nodes'
    : 'Add board nodes';
  const canvasAddBoardTitle = activeSourceBoard && activeSourceBoard.nodes.length > 0 && sourceBoardNodesToAddCount === 0
    ? 'All active Source Board nodes are already on this canvas'
    : sourceBoardNodesToRestoreCount > 0
      ? 'Restore hidden Source Board nodes or add missing ones to this canvas'
    : 'Add active Source Board nodes to this canvas';

  const proposalScopePayload = activeSourceBoard && activeSourceBoardScopeNodeCount > 0
    ? { source_board_id: activeSourceBoard.board.id }
    : activeSourceScopeIds.length > 0
    ? { source_scope_ids: activeSourceScopeIds }
    : {};

  const handleDelete = async (action: 'delete_projection' | 'move_to_home') => {
    if (!courseId) return;
    try {
      await deleteCourse(courseId, action);
      addToast('success', 'Project deleted');
      navigate('/courses');
    } catch (error) {
      throw error;
    }
  };

  const handleCreateNote = async () => {
    if (!courseId || !data) return;
    try {
      const res = await api.post('/notes', {
        course_id: courseId,
        title: 'Untitled note',
      });
      await savePageFrameCollectionForNote({
        noteId: res.data.id,
        collection: createPageFrameCollectionSeed(),
      });
      addToast('success', 'Note created');
      navigate(`/notes/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create note:', err);
      addToast('error', 'Failed to create note');
    }
  };

  const handleCreateMaterialMap = async () => {
    if (!courseId) return;
    setProposalBusy('material_map');
    try {
      const res = await api.post('/proposals/material-map', { course_id: courseId, ...proposalScopePayload });
      setActiveProposal(res.data);
      setReconciliationDecisions({});
      addToast('success', 'Material map proposal created');
      await fetchMaterials();
    } catch (err: any) {
      console.error('Failed to create material map proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create material map');
    } finally {
      setProposalBusy(null);
    }
  };

  const handleCreateOrganizedNote = async () => {
    if (!courseId || !data) return;
    setProposalBusy('organized_note');
    try {
      const res = await api.post('/proposals/organized-note', {
        course_id: courseId,
        note_title: `${data.course.name} Organized Notes`,
        ...proposalScopePayload,
      });
      setActiveProposal(res.data);
      setReconciliationDecisions({});
      addToast('success', 'Organized note proposal created');
      await fetchMaterials();
    } catch (err: any) {
      console.error('Failed to create organized note proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create organized note proposal');
    } finally {
      setProposalBusy(null);
    }
  };

  const handleCreateMaterialReconciliation = async () => {
    if (!courseId) return;
    setProposalBusy('material_reconciliation');
    try {
      const res = await api.post('/proposals/material-reconciliation', { course_id: courseId, ...proposalScopePayload });
      setActiveProposal(res.data);
      setReconciliationDecisions({});
      addToast('success', 'Reconciliation proposal created');
      await fetchMaterials();
    } catch (err: any) {
      console.error('Failed to create reconciliation proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create reconciliation proposal');
    } finally {
      setProposalBusy(null);
    }
  };

  const handleCreateCanvasLayoutProposal = async () => {
    if (!courseId || !activeLearningCanvas) return;
    setProposalBusy('canvas_layout');
    try {
      const res = await api.post('/proposals/canvas-layout', {
        course_id: courseId,
        canvas_id: activeLearningCanvas.canvas.id,
        ...(activeSourceBoard
          ? { source_board_id: activeSourceBoard.board.id }
          : activeSourceScopeIds.length > 0
            ? { source_scope_ids: activeSourceScopeIds }
            : {}),
        layout_goal: 'a4_reading',
      });
      setActiveProposal(res.data);
      setReconciliationDecisions({});
      addToast('success', 'Canvas layout proposal created');
    } catch (err: any) {
      console.error('Failed to create canvas layout proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create canvas layout proposal');
    } finally {
      setProposalBusy(null);
    }
  };

  const handleCreateCompositionTemplateProposal = async () => {
    if (!courseId || !activeLearningCanvas || !selectedCompositionTemplateId) return;
    setProposalBusy('composition_template');
    try {
      const res = await api.post('/proposals/composition-template', {
        course_id: courseId,
        canvas_id: activeLearningCanvas.canvas.id,
        composition_template_id: selectedCompositionTemplateId,
        ...(activeSourceBoard
          ? { source_board_id: activeSourceBoard.board.id }
          : activeSourceScopeIds.length > 0
            ? { source_scope_ids: activeSourceScopeIds }
            : {}),
        layout_goal: 'a4_section',
      });
      setActiveProposal(res.data);
      setReconciliationDecisions({});
      addToast('success', 'Composition proposal created');
    } catch (err: any) {
      console.error('Failed to create composition proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create composition proposal');
    } finally {
      setProposalBusy(null);
    }
  };

  const handleApplyProposal = async () => {
    if (!activeProposal) return;
    const appliedProposalType = activeProposal.type;
    setProposalBusy('apply');
    try {
      const body = activeProposal.type === 'material_reconciliation'
        ? {
          group_decisions: Object.entries(reconciliationDecisions).map(([group_id, decision]) => ({
            group_id,
            decision,
          })),
        }
        : undefined;
      const res = await api.post(`/proposals/${activeProposal.id}/apply`, body);
      addToast('success', activeProposal.type === 'material_reconciliation'
        ? 'Reconciliation decisions recorded'
        : activeProposal.type === 'canvas_layout'
          ? 'Canvas layout applied'
          : activeProposal.type === 'composition_template'
            ? 'Composition applied to canvas'
          : 'Proposal applied');
      setActiveProposal(null);
      setReconciliationDecisions({});
      await Promise.all([fetchSummary(), fetchMaterials(), fetchReconciliationSafety()]);
      if (appliedProposalType === 'canvas_layout' || appliedProposalType === 'composition_template') {
        await Promise.all([fetchActiveLearningCanvas(), fetchLearningCanvases()]);
      }
      if (res.data?.note_id && appliedProposalType !== 'composition_template') {
        navigate(`/notes/${res.data.note_id}`);
      }
    } catch (err: any) {
      console.error('Failed to apply proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to apply proposal');
    } finally {
      setProposalBusy(null);
    }
  };

  const handleDiscardProposal = async () => {
    if (!activeProposal) return;
    setProposalBusy('discard');
    try {
      await api.post(`/proposals/${activeProposal.id}/discard`);
      addToast('info', 'Proposal discarded');
      setActiveProposal(null);
      setReconciliationDecisions({});
      await fetchMaterials();
    } catch (err: any) {
      console.error('Failed to discard proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to discard proposal');
    } finally {
      setProposalBusy(null);
    }
  };

  const handleSafetyAction = async (path: string, successMessage: string) => {
    setProposalBusy(path);
    try {
      await api.post(path);
      addToast('success', successMessage);
      await fetchReconciliationSafety();
    } catch (err: any) {
      console.error('Failed to update reconciliation safety:', err);
      addToast('error', err?.response?.data?.error || 'Failed to update reconciliation safety');
    } finally {
      setProposalBusy(null);
    }
  };

  const handleGenerateSourceSnapshots = async () => {
    if (!courseId) return;
    setSourceSnapshotBusy('generate');
    try {
      const res = await api.post('/source-snapshots/generate', { course_id: courseId });
      const warnings = res.data?.warnings || [];
      setSourceSnapshotWarnings(warnings);
      addToast(
        warnings.length > 0 ? 'info' : 'success',
        `Source snapshots ready: ${res.data?.generated_count || 0}`,
      );
      await fetchSourceSnapshots();
    } catch (err: any) {
      console.error('Failed to generate source snapshots:', err);
      addToast('error', err?.response?.data?.error || 'Failed to generate source snapshots');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleOpenSourceSnapshot = async (snapshotId: string) => {
    setSourceSnapshotBusy(snapshotId);
    try {
      const res = await api.get(`/source-snapshots/${snapshotId}`);
      setActiveSourceSnapshot(res.data);
      setSourceSnapshotWarnings(res.data?.warnings || []);
    } catch (err: any) {
      console.error('Failed to open source snapshot:', err);
      addToast('error', err?.response?.data?.error || 'Failed to open source snapshot');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleCreateSourceScope = async (page: SourceSnapshotPage, kind: 'page' | 'page_range', rangeStart?: SourceSnapshotPage) => {
    if (!courseId || !activeSourceSnapshot) return;
    const startPage = rangeStart ? Math.min(rangeStart.page_number, page.page_number) : page.page_number;
    const endPage = rangeStart ? Math.max(rangeStart.page_number, page.page_number) : page.page_number;
    setSourceSnapshotBusy(`scope-${page.id}`);
    try {
      await api.post('/source-scopes', {
        course_id: courseId,
        source_snapshot_id: activeSourceSnapshot.snapshot.id,
        source_snapshot_page_id: kind === 'page' ? page.id : undefined,
        scope_kind: kind,
        label: kind === 'page'
          ? `${activeSourceSnapshot.snapshot.title} ${page.page_label || `p.${page.page_number}`}`
          : `${activeSourceSnapshot.snapshot.title} p.${startPage}-${endPage}`,
        page_start: startPage,
        page_end: endPage,
      });
      setSourceScopeRangeStart(null);
      addToast('success', kind === 'page' ? 'Source page selected' : 'Source range selected');
      await fetchSourceScopes();
    } catch (err: any) {
      console.error('Failed to create source scope:', err);
      addToast('error', err?.response?.data?.error || 'Failed to select source scope');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleOpenSourceScope = async (scopeId: string) => {
    setSourceSnapshotBusy(scopeId);
    try {
      const res = await api.get(`/source-scopes/${scopeId}/jump-target`);
      const pages = res.data?.pages?.length ? res.data.pages : res.data?.page ? [res.data.page] : [];
      setActiveSourceSnapshot({
        snapshot: res.data.snapshot,
        pages,
        warnings: res.data.warnings || [],
      });
      setSourceSnapshotWarnings(res.data?.warnings || []);
    } catch (err: any) {
      console.error('Failed to open source scope:', err);
      addToast('error', err?.response?.data?.error || 'Failed to open source scope');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleArchiveSourceScope = async (scopeId: string) => {
    setSourceSnapshotBusy(`archive-${scopeId}`);
    try {
      await api.post(`/source-scopes/${scopeId}/archive`);
      addToast('info', 'Source scope archived');
      await fetchSourceScopes();
    } catch (err: any) {
      console.error('Failed to archive source scope:', err);
      addToast('error', err?.response?.data?.error || 'Failed to archive source scope');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleCreateSourceBoard = async () => {
    if (!courseId) return;
    setSourceSnapshotBusy('create-board');
    try {
      const res = await api.post('/source-boards', {
        course_id: courseId,
        title: `Source Board ${sourceBoards.length + 1}`,
      });
      addToast('success', 'Source Board created');
      await fetchSourceBoards();
      const detailRes = await api.get(`/source-boards/${res.data.id}`);
      setActiveSourceBoard(detailRes.data);
    } catch (err: any) {
      console.error('Failed to create source board:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create source board');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleSelectSourceBoard = async (boardId: string) => {
    setSourceSnapshotBusy(`board-${boardId}`);
    try {
      const res = await api.get(`/source-boards/${boardId}`);
      setActiveSourceBoard(res.data);
    } catch (err: any) {
      console.error('Failed to open source board:', err);
      addToast('error', err?.response?.data?.error || 'Failed to open source board');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleSeedSourceBoard = async () => {
    if (!activeSourceBoard) return;
    setSourceSnapshotBusy(`seed-board-${activeSourceBoard.board.id}`);
    try {
      const res = await api.post(`/source-boards/${activeSourceBoard.board.id}/seed-from-scopes`);
      addToast('success', `Added ${res.data?.nodes_created_count || 0} source scopes to board`);
      await fetchActiveSourceBoard();
    } catch (err: any) {
      console.error('Failed to seed source board:', err);
      addToast('error', err?.response?.data?.error || 'Failed to add scopes to board');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleOpenSourceBoardNode = async (nodeId: string) => {
    setSourceSnapshotBusy(`board-node-${nodeId}`);
    try {
      const res = await api.get(`/source-board-nodes/${nodeId}/jump-target`);
      if (!res.data?.snapshot) {
        addToast('info', res.data?.warnings?.[0] || 'This board node has no source jump target yet');
        return;
      }
      const pages = res.data?.pages?.length ? res.data.pages : res.data?.page ? [res.data.page] : [];
      setActiveSourceSnapshot({
        snapshot: res.data.snapshot,
        pages,
        warnings: res.data.warnings || [],
      });
      setSourceSnapshotWarnings(res.data?.warnings || []);
    } catch (err: any) {
      console.error('Failed to open source board node:', err);
      addToast('error', err?.response?.data?.error || 'Failed to open source board node');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleArchiveSourceBoardNode = async (nodeId: string) => {
    setSourceSnapshotBusy(`archive-board-node-${nodeId}`);
    try {
      await api.post(`/source-board-nodes/${nodeId}/archive`);
      addToast('info', 'Board node archived');
      await fetchActiveSourceBoard();
    } catch (err: any) {
      console.error('Failed to archive source board node:', err);
      addToast('error', err?.response?.data?.error || 'Failed to archive board node');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleCreateLearningCanvas = async () => {
    if (!courseId) return;
    setSourceSnapshotBusy('create-canvas');
    try {
      const res = await api.post('/canvases', {
        course_id: courseId,
        title: `Canvas Document ${learningCanvases.length + 1}`,
      });
      addToast('success', 'Canvas document created');
      await fetchLearningCanvases();
      await fetchCanvasDetail(res.data.id);
      navigate(`/projects/${courseId}/notes/${res.data.id}`);
    } catch (err: any) {
      console.error('Failed to create canvas:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create canvas document');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleSelectLearningCanvas = async (selectedCanvasId: string) => {
    if (!courseId) return;
    setSourceSnapshotBusy(`canvas-${selectedCanvasId}`);
    try {
      await fetchCanvasDetail(selectedCanvasId);
      navigate(`/projects/${courseId}/notes/${selectedCanvasId}`);
    } catch (err: any) {
      console.error('Failed to open canvas:', err);
      addToast('error', err?.response?.data?.error || 'Failed to open canvas');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleSeedCanvasFromSourceBoard = async () => {
    if (!activeLearningCanvas || !activeSourceBoard) return;
    setSourceSnapshotBusy(`seed-canvas-${activeLearningCanvas.canvas.id}`);
    try {
      const res = await api.post(`/canvases/${activeLearningCanvas.canvas.id}/seed-from-source-board`, {
        source_board_id: activeSourceBoard.board.id,
      });
      const createdCount = res.data?.nodes_created_count || 0;
      const restoredCount = res.data?.nodes_restored_count || 0;
      const activeBoardNodeCount = res.data?.active_source_board_node_count || activeSourceBoard.nodes.length;
      if (createdCount > 0 || restoredCount > 0) {
        const parts: string[] = [];
        if (createdCount > 0) parts.push(`added ${createdCount}`);
        if (restoredCount > 0) parts.push(`restored ${restoredCount}`);
        addToast('success', `Canvas nodes ${parts.join(' and ')}`);
      } else if (activeBoardNodeCount > 0) {
        addToast('info', 'All active board nodes are already on this canvas');
      } else {
        addToast('info', 'Selected Source Board has no active nodes');
      }
      await fetchActiveLearningCanvas();
    } catch (err: any) {
      console.error('Failed to seed canvas:', err);
      addToast('error', err?.response?.data?.error || 'Failed to add board nodes to canvas');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleCreateCanvasNoteBlock = async (draft: CanvasNoteBlockDraft) => {
    if (!activeLearningCanvas) return;
    setSourceSnapshotBusy(`canvas-block-${activeLearningCanvas.canvas.id}`);
    try {
      await api.post(`/canvases/${activeLearningCanvas.canvas.id}/note-blocks`, draft);
      addToast('success', 'Block added to canvas');
      await fetchActiveLearningCanvas();
    } catch (err: any) {
      console.error('Failed to add canvas block:', err);
      addToast('error', err?.response?.data?.error || 'Failed to add block to canvas');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleOpenCanvasNode = async (nodeId: string) => {
    setSourceSnapshotBusy(`canvas-node-${nodeId}`);
    try {
      const res = await api.get(`/canvas-nodes/${nodeId}/jump-target`);
      if (!res.data?.snapshot) {
        addToast('info', res.data?.warnings?.[0] || 'This canvas node has no source jump target yet');
        return;
      }
      const pages = res.data?.pages?.length ? res.data.pages : res.data?.page ? [res.data.page] : [];
      setActiveSourceSnapshot({
        snapshot: res.data.snapshot,
        pages,
        warnings: res.data.warnings || [],
      });
      setSourceSnapshotWarnings(res.data?.warnings || []);
    } catch (err: any) {
      console.error('Failed to open canvas node:', err);
      addToast('error', err?.response?.data?.error || 'Failed to open canvas node');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleArchiveCanvasNode = async (nodeId: string) => {
    setSourceSnapshotBusy(`archive-canvas-node-${nodeId}`);
    try {
      await api.post(`/canvas-nodes/${nodeId}/archive`);
      addToast('info', 'Canvas node hidden from canvas');
      await fetchActiveLearningCanvas();
    } catch (err: any) {
      console.error('Failed to archive canvas node:', err);
      addToast('error', err?.response?.data?.error || 'Failed to hide canvas node');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleRestoreCanvasNode = async (nodeId: string) => {
    setSourceSnapshotBusy(`restore-canvas-node-${nodeId}`);
    try {
      await api.post(`/canvas-nodes/${nodeId}/restore`);
      addToast('success', 'Canvas node restored');
      await fetchActiveLearningCanvas();
    } catch (err: any) {
      console.error('Failed to restore canvas node:', err);
      addToast('error', err?.response?.data?.error || 'Failed to restore canvas node');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleCreateCanvasEdge = async (draft: {
    source_node_id: string;
    source_port: 'top' | 'right' | 'bottom' | 'left';
    target_node_id?: string | null;
    target_port?: 'top' | 'right' | 'bottom' | 'left' | null;
    loose_target_x?: number | null;
    loose_target_y?: number | null;
    relation_layer_id?: string | null;
    label?: string | null;
  }) => {
    if (!activeLearningCanvas) return;
    setSourceSnapshotBusy(`canvas-edge-${activeLearningCanvas.canvas.id}`);
    try {
      const res = await api.post(`/canvases/${activeLearningCanvas.canvas.id}/edges`, draft);
      addToast('success', res.data?.connection_state === 'incomplete' ? 'Incomplete edge saved' : 'Visual edge added');
      await fetchActiveLearningCanvas();
      return res.data;
    } catch (err: any) {
      console.error('Failed to create canvas edge:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create canvas edge');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleBindCanvasEdgeRelation = async (edgeId: string, draft: {
    relation_type: string;
    relation_layer_id?: string;
    label?: string | null;
  }) => {
    setSourceSnapshotBusy(`bind-edge-${edgeId}`);
    try {
      await api.post(`/canvas-edges/${edgeId}/bind-relation`, draft);
      addToast('success', 'Relation bound to edge');
      await fetchActiveLearningCanvas();
    } catch (err: any) {
      console.error('Failed to bind canvas relation:', err);
      addToast('error', err?.response?.data?.error || 'Failed to bind relation');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleUnbindCanvasEdgeRelation = async (edgeId: string) => {
    setSourceSnapshotBusy(`unbind-edge-${edgeId}`);
    try {
      await api.post(`/canvas-edges/${edgeId}/unbind-relation`);
      addToast('info', 'Relation unbound from edge');
      await fetchActiveLearningCanvas();
    } catch (err: any) {
      console.error('Failed to unbind canvas relation:', err);
      addToast('error', err?.response?.data?.error || 'Failed to unbind relation');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };

  const handleArchiveCanvasEdge = async (edgeId: string) => {
    setSourceSnapshotBusy(`archive-edge-${edgeId}`);
    try {
      await api.post(`/canvas-edges/${edgeId}/archive`);
      addToast('info', 'Canvas edge archived');
      await fetchActiveLearningCanvas();
    } catch (err: any) {
      console.error('Failed to archive canvas edge:', err);
      addToast('error', err?.response?.data?.error || 'Failed to archive edge');
    } finally {
      setSourceSnapshotBusy(null);
    }
  };
  const handleUpdateCanvasNodeLayout = async (
    nodeId: string,
    layout: { x: number; y: number; width: number; height: number },
  ) => {
    try {
      await api.put(`/canvas-nodes/${nodeId}`, layout);
      setActiveLearningCanvas((current) => current
        ? {
            ...current,
            nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...layout } : node)),
          }
        : current);
    } catch (err: any) {
      console.error('Failed to save canvas node layout:', err);
      addToast('error', err?.response?.data?.error || 'Failed to save canvas layout');
      await fetchActiveLearningCanvas();
    }
  };

  const handleUpdateCanvasViewport = async (viewport: { viewport_x: number; viewport_y: number; zoom: number }) => {
    if (!activeLearningCanvas) return;
    try {
      await api.put(`/canvases/${activeLearningCanvas.canvas.id}/viewport`, viewport);
      setActiveLearningCanvas((current) => current
        ? {
            ...current,
            viewport,
          }
        : current);
    } catch (err: any) {
      console.error('Failed to save canvas viewport:', err);
      addToast('error', err?.response?.data?.error || 'Failed to save canvas view');
    }
  };

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const { course, goals, decks, documents } = data;
  const acceptedSegmentCount = Object.values(segmentsByMaterial)
    .flat()
    .filter((segment) => segment.status === 'accepted').length;
  const totalSegmentCount = Object.values(segmentsByMaterial).flat().length;
  const canCreateMaterialMap = materials.some((material) => material.fragment_status === 'ready');
  const canCreateOrganizedNote = acceptedSegmentCount > 0 || totalSegmentCount > 0;
  const canCreateReconciliation = materials.filter((material) => material.fragment_status === 'ready').length > 0;
  const selectedReconciliationDecisionCount = Object.keys(reconciliationDecisions).length;
  const activeCanvasLayoutPreview = activeProposal?.type === 'canvas_layout'
    ? activeProposal.data
    : activeProposal?.type === 'composition_template'
      ? {
          node_layouts: (activeProposal.data.layout_plan?.node_layouts || []).map((layout) => {
            const slot = activeProposal.data.slot_plan?.find((item) => item.slot_key === layout.slot_key && item.slot_index === layout.slot_index);
            return {
              temp_id: `composition-${layout.slot_key}-${layout.slot_index}`,
              action: 'create_node' as const,
              node_type: 'note_block',
              title: slot?.title || slot?.label || layout.slot_key,
              x: layout.x,
              y: layout.y,
              width: layout.width,
              height: layout.height,
            };
          }),
          frames: activeProposal.data.layout_plan?.frame
            ? [{
                temp_id: activeProposal.data.layout_plan.frame.temp_id || 'composition-frame-1',
                title: activeProposal.data.layout_plan.frame.title,
                x: activeProposal.data.layout_plan.frame.x,
                y: activeProposal.data.layout_plan.frame.y,
                width: activeProposal.data.layout_plan.frame.width,
                height: activeProposal.data.layout_plan.frame.height,
              }]
            : [],
        }
      : null;

  // Separate root goals (no parent) from sub-goals
  const rootGoals = goals.filter((g) => !g.parent_id);
  // Count sub-goals for each root goal
  const subGoalCounts = new Map<string, number>();
  for (const g of goals) {
    if (g.parent_id) {
      subGoalCounts.set(g.parent_id, (subGoalCounts.get(g.parent_id) || 0) + 1);
    }
  }
  const workspaceCount = notes.length + learningCanvases.length;

  const canvasWorkspaceSection = (
    <div className={`${styles.section} ${styles.canvasWorkspaceSection} ${canvasFocusMode ? styles.canvasWorkspaceExpanded : ''}`}>
      <div className={styles.canvasWorkspaceShell}>
        <div className={styles.canvasWorkspaceHeader}>
          <div>
            <div className={styles.sectionTitle}>
              <LayoutDashboard size={18} />
              <span>{activeLearningCanvas?.canvas.title || 'Canvas Document'}</span>
              <span className={styles.sectionCount}>{learningCanvases.length}</span>
            </div>
            <div className={styles.canvasWorkspaceHint}>
              This canvas is opened as a note workspace. Project material, sources, and proposals remain supporting surfaces behind this writing space.
            </div>
          </div>
          <div className={styles.canvasWorkspaceActions}>
            <button
              type="button"
              className={styles.sectionAddBtn}
              onClick={handleCreateLearningCanvas}
              disabled={sourceSnapshotBusy !== null}
            >
              <LayoutDashboard size={14} />
              New
            </button>
            <button
              type="button"
              className={styles.sectionAddBtn}
              onClick={handleSeedCanvasFromSourceBoard}
              disabled={sourceSnapshotBusy !== null || !activeLearningCanvas || !activeSourceBoard || sourceBoardNodesToAddCount === 0}
              title={canvasAddBoardTitle}
            >
              <Plus size={14} />
              {canvasAddBoardLabel}
            </button>
            <button
              type="button"
              className={styles.sectionAddBtn}
              onClick={handleCreateCanvasLayoutProposal}
              disabled={proposalBusy !== null || !activeLearningCanvas}
              title="Create a reviewable layout proposal for this canvas"
            >
              <Sparkles size={14} />
              Plan layout
            </button>
            <select
              className={styles.canvasCompositionSelect}
              value={selectedCompositionTemplateId}
              onChange={(event) => setSelectedCompositionTemplateId(event.target.value)}
              disabled={proposalBusy !== null || compositionTemplates.length === 0}
              aria-label="Composition template"
            >
              {compositionTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.sectionAddBtn}
              onClick={handleCreateCompositionTemplateProposal}
              disabled={proposalBusy !== null || !activeLearningCanvas || !selectedCompositionTemplateId}
              title="Create a reviewable composition section proposal"
            >
              <Layers size={14} />
              Use composition
            </button>
            <button
              type="button"
              className={styles.sectionAddBtn}
              onClick={() => setCanvasFocusMode((value) => !value)}
              disabled={!activeLearningCanvas}
            >
              {canvasFocusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {canvasFocusMode ? 'Exit focus' : 'Focus canvas'}
            </button>
          </div>
        </div>

        {learningCanvases.length > 0 && (
          <div className={styles.canvasWorkspaceTabs}>
            {learningCanvases.slice(0, 6).map((canvas) => (
              <button
                key={canvas.id}
                type="button"
                className={`${styles.sourceBoardTab} ${activeLearningCanvas?.canvas.id === canvas.id ? styles.sourceBoardTabActive : ''}`}
                onClick={() => handleSelectLearningCanvas(canvas.id)}
                disabled={sourceSnapshotBusy !== null}
              >
                {canvas.title}
              </button>
            ))}
          </div>
        )}

        {activeLearningCanvas ? (
          <div className={styles.canvasWorkspaceBody}>
            <div className={styles.canvasWorkspaceMeta}>
              <span>
                {activeLearningCanvas.canvas.page_size.toUpperCase()} {activeLearningCanvas.canvas.orientation}
              </span>
              <span>{activeLearningCanvas.nodes.length} nodes</span>
              {(activeLearningCanvas.archived_nodes?.length || 0) > 0 && (
                <span>{activeLearningCanvas.archived_nodes?.length} hidden</span>
              )}
              <span>{activeSourceBoard ? `Source Board: ${activeSourceBoard.board.title}` : 'No active Source Board selected'}</span>
            </div>
            <LearningCanvasSurface
              detail={activeLearningCanvas}
              busy={sourceSnapshotBusy !== null}
              surfaceMode={canvasFocusMode ? 'focus' : 'main'}
              layoutPreview={activeCanvasLayoutPreview}
              onOpenNode={handleOpenCanvasNode}
              onArchiveNode={handleArchiveCanvasNode}
              onRestoreNode={handleRestoreCanvasNode}
              onCreateEdge={handleCreateCanvasEdge}
              onBindEdgeRelation={handleBindCanvasEdgeRelation}
              onUnbindEdgeRelation={handleUnbindCanvasEdgeRelation}
              onArchiveEdge={handleArchiveCanvasEdge}
              onCreateNoteBlock={handleCreateCanvasNoteBlock}
              onPlanLayout={handleCreateCanvasLayoutProposal}
              onNodeLayoutChange={handleUpdateCanvasNodeLayout}
              onViewportChange={handleUpdateCanvasViewport}
            />
          </div>
        ) : (
          <div className={styles.canvasWorkspaceEmpty}>Create an A4 canvas document to begin the canvas-first workspace.</div>
        )}
      </div>
    </div>
  );

  const workspaceLandingSection = (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <BookOpen size={18} />
          <span>Notes & Canvas Documents</span>
          <span className={styles.sectionCount}>{workspaceCount}</span>
        </div>
        <div className={styles.workspaceActions}>
          <button
            className={styles.sectionAddBtn}
            onClick={handleCreateNote}
          >
            <Plus size={15} />
            New Note
          </button>
          <button
            type="button"
            className={styles.sectionAddBtn}
            onClick={handleCreateLearningCanvas}
            disabled={sourceSnapshotBusy !== null}
          >
            <LayoutDashboard size={14} />
            New Canvas
          </button>
        </div>
      </div>

      {workspaceCount === 0 ? (
        <div className={styles.empty}>No notes yet. Create a note or canvas document to begin.</div>
      ) : (
        <div className={styles.workspaceGrid}>
          {learningCanvases.map((canvas) => (
            <button
              key={canvas.id}
              type="button"
              className={styles.workspaceCard}
              onClick={() => handleSelectLearningCanvas(canvas.id)}
              disabled={sourceSnapshotBusy !== null}
            >
              <div className={styles.workspaceCardIcon}>
                <LayoutDashboard size={17} />
              </div>
              <div className={styles.workspaceCardBody}>
                <div className={styles.workspaceCardType}>Canvas document</div>
                <div className={styles.workspaceCardTitle}>{canvas.title}</div>
                <div className={styles.workspaceCardMeta}>
                  <span>{canvas.page_size.toUpperCase()} {canvas.orientation}</span>
                  <span>{canvas.canvas_kind}</span>
                </div>
              </div>
            </button>
          ))}

          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={styles.workspaceCard}
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <div className={styles.workspaceCardIcon}>
                <FileText size={17} />
              </div>
              <div className={styles.workspaceCardBody}>
                <div className={styles.workspaceCardType}>Note</div>
                <div className={styles.workspaceCardTitle}>{note.title}</div>
                {note.description && (
                  <div className={styles.workspaceCardDesc}>{note.description}</div>
                )}
                <div className={styles.workspaceCardMeta}>
                  <span>Updated {new Date(note.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const deleteConfirmation = confirmDelete && (
    <ProjectDeleteDialog
      projectId={course.id}
      projectName={course.name}
      onCancel={() => setConfirmDelete(false)}
      onConfirm={handleDelete}
    />
  );

  if (canvasId) {
    return (
      <div className={`${styles.page} ${styles.workspacePage}`}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate(`/projects/${course.id}`)}>
            <ArrowLeft size={18} />
            <span>Project</span>
          </button>
          <div className={styles.headerRight}>
            <button
              className={styles.headerAction}
              onClick={() => openModal('course-edit', { course })}
            >
              <Edit2 size={15} />
              Edit Project
            </button>
            <button
              className={`${styles.headerAction} ${styles.headerActionDanger}`}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>

        <div className={styles.workspaceHero}>
          <div>
            <div className={styles.workspaceEyebrow}>{course.name}</div>
            <h1>{activeLearningCanvas?.canvas.title || 'Canvas Document'}</h1>
            <p>
              A top-level note workspace for writing, arranging blocks, and reviewing canvas relations.
            </p>
          </div>
          <div className={styles.workspaceHeroMeta}>
            {activeLearningCanvas ? (
              <>
                <span>{activeLearningCanvas.canvas.page_size.toUpperCase()} {activeLearningCanvas.canvas.orientation}</span>
                <span>{activeLearningCanvas.nodes.length} nodes</span>
                <span>{activeLearningCanvas.edges.length} edges</span>
              </>
            ) : (
              <span>Loading canvas...</span>
            )}
          </div>
        </div>

        {canvasWorkspaceSection}
        {deleteConfirmation}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/projects')}>
          <ArrowLeft size={18} />
          <span>Projects</span>
        </button>
        <div className={styles.headerRight}>
          <button
            className={styles.headerAction}
            onClick={() => openModal('course-edit', { course })}
          >
            <Edit2 size={15} />
            Edit
          </button>
          <button
            className={`${styles.headerAction} ${styles.headerActionDanger}`}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className={styles.courseInfo}>
        <div className={styles.colorBar} style={{ backgroundColor: course.color }} />
        <div className={styles.courseTitle}>{course.name}</div>
        <div className={styles.courseMeta}>
          {course.code && <span>{course.code}</span>}
          {course.semester && <span>{course.semester}</span>}
          <span className={`${styles.weightBadge} ${styles[`weight${course.weight}`]}`}>
            {course.weight === 1 ? 'Low' : course.weight === 2 ? 'Medium' : 'High'}
          </span>
        </div>
        {course.description && (
          <div className={styles.courseDescription}>{course.description}</div>
        )}
      </div>

      {workspaceLandingSection}

      {/* Project Material / Proposal Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Sparkles size={18} />
            <span>Project Material</span>
            <span className={styles.sectionCount}>{materials.length}</span>
          </div>
          <div className={styles.materialActions}>
            <button
              className={styles.sectionAddBtn}
              onClick={handleCreateMaterialMap}
              disabled={proposalBusy !== null || materialLoading || !canCreateMaterialMap}
            >
              <MapIcon size={14} />
              Material Map
            </button>
            <button
              className={styles.sectionAddBtn}
              onClick={handleCreateOrganizedNote}
              disabled={proposalBusy !== null || materialLoading || !canCreateOrganizedNote}
            >
              <GitBranch size={14} />
              Note Proposal
            </button>
            <button
              className={styles.sectionAddBtn}
              onClick={handleCreateMaterialReconciliation}
              disabled={proposalBusy !== null || materialLoading || !canCreateReconciliation}
            >
              <GitBranch size={14} />
              Reconcile
            </button>
          </div>
        </div>

        {materialLoading ? (
          <div className={styles.empty}>Loading project materials...</div>
        ) : materials.length === 0 ? (
          <div className={styles.empty}>No parsed project materials yet</div>
        ) : (
          <div className={styles.materialWorkspace}>
            <div className={styles.materialList}>
              {materials.map((material) => {
                const segments = segmentsByMaterial[material.id] || [];
                return (
                  <div key={material.id} className={styles.materialItem}>
                    <div className={styles.materialMain}>
                      <FileText size={15} className={styles.docIcon} />
                      <div className={styles.materialText}>
                        <div className={styles.materialTitle}>{material.title}</div>
                        <div className={styles.materialMeta}>
                          <span>{material.parse_status}</span>
                          <span>{material.fragment_status}</span>
                          <span>{material.segment_status}</span>
                          <span>{segments.length} segments</span>
                        </div>
                      </div>
                    </div>
                    <span className={`${styles.materialBadge} ${styles[`proposal_${material.proposal_status}`] || ''}`}>
                      {material.proposal_status.replace(/_/g, ' ')}
                    </span>
                    {material.warnings?.length > 0 && (
                      <div className={styles.materialWarning}>
                        <AlertTriangle size={13} />
                        {material.warnings[0]}
                      </div>
                    )}
                    {segments.length > 0 && (
                      <div className={styles.segmentPreview}>
                        {segments.slice(0, 4).map((segment) => (
                          <span key={segment.id} className={styles.segmentPill}>
                            {segment.title}
                          </span>
                        ))}
                        {segments.length > 4 && (
                          <span className={styles.segmentMore}>+{segments.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={styles.snapshotPanel}>
              <div className={styles.snapshotHeader}>
                <div>
                  <div className={styles.proposalEyebrow}>Source snapshots</div>
                  <div className={styles.snapshotTitle}>
                    {sourceSnapshots.length} inspectable sources
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.snapshotActionBtn}
                  disabled={sourceSnapshotBusy !== null || materialLoading || materials.length === 0}
                  onClick={handleGenerateSourceSnapshots}
                  title="Generate source snapshots"
                >
                  <RefreshCw size={13} />
                  Generate
                </button>
              </div>

              {sourceSnapshotWarnings.map((warning) => (
                <div key={warning} className={styles.warningLine}>
                  <AlertTriangle size={13} />
                  {warning}
                </div>
              ))}

              {sourceSnapshots.length === 0 ? (
                <div className={styles.snapshotEmpty}>Generate snapshots to inspect parsed source text.</div>
              ) : (
                <div className={styles.snapshotList}>
                  {sourceSnapshots.slice(0, 5).map((snapshot) => (
                    <button
                      key={snapshot.id}
                      type="button"
                      className={`${styles.snapshotItem} ${activeSourceSnapshot?.snapshot.id === snapshot.id ? styles.snapshotItemActive : ''}`}
                      disabled={sourceSnapshotBusy !== null}
                      onClick={() => handleOpenSourceSnapshot(snapshot.id)}
                    >
                      <span className={styles.snapshotItemTitle}>{snapshot.title}</span>
                      <span className={styles.snapshotItemMeta}>
                        {snapshot.status} 璺?{snapshot.page_count || 0} pages 璺?{snapshot.chunk_count || 0} chunks
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.sourceScopePanel}>
                <div className={styles.sourceScopeHeader}>
                  <div>
                    <div className={styles.proposalEyebrow}>Selected source scopes</div>
                    <div className={styles.sourceScopeTitle}>
                      {sourceScopes.length} active selections
                    </div>
                  </div>
                  <span className={styles.safetyMeta}>Used by new proposals</span>
                </div>
                <div className={styles.sourceScopeHint}>
                  Scopes select source ranges only. They do not delete, import, annotate, or create a Source Board.
                </div>
                {sourceScopes.length === 0 ? (
                  <div className={styles.snapshotEmpty}>Select a page or page range from an open source snapshot.</div>
                ) : (
                  <div className={styles.sourceScopeList}>
                    {sourceScopes.slice(0, 6).map((scope) => (
                      <div key={scope.id} className={styles.sourceScopeItem}>
                        <button
                          type="button"
                          className={styles.sourceScopeOpenBtn}
                          onClick={() => handleOpenSourceScope(scope.id)}
                          disabled={sourceSnapshotBusy !== null}
                          title="Open selected source range"
                        >
                          <span>{scope.label}</span>
                          <small>
                            {scope.scope_kind.replace(/_/g, ' ')}
                            {scope.page_start ? ` 路 p.${scope.page_start}${scope.page_end && scope.page_end !== scope.page_start ? `-${scope.page_end}` : ''}` : ''}
                          </small>
                        </button>
                        <button
                          type="button"
                          className={styles.safetyActionBtn}
                          onClick={() => handleArchiveSourceScope(scope.id)}
                          disabled={sourceSnapshotBusy !== null}
                        >
                          Archive
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.sourceBoardPanel}>
                <div className={styles.sourceBoardHeader}>
                  <div>
                    <div className={styles.proposalEyebrow}>Source Board</div>
                    <div className={styles.sourceScopeTitle}>
                      {sourceBoards.length} active boards
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.snapshotActionBtn}
                    onClick={handleCreateSourceBoard}
                    disabled={sourceSnapshotBusy !== null}
                  >
                    <Plus size={12} />
                    New
                  </button>
                </div>
                <div className={styles.sourceScopeHint}>
                  Source Board organizes selected source ranges. It is not Canvas, annotation, final import, or source deletion.
                </div>

                {sourceBoards.length > 0 && (
                  <div className={styles.sourceBoardTabs}>
                    {sourceBoards.slice(0, 4).map((board) => (
                      <button
                        key={board.id}
                        type="button"
                        className={`${styles.sourceBoardTab} ${activeSourceBoard?.board.id === board.id ? styles.sourceBoardTabActive : ''}`}
                        onClick={() => handleSelectSourceBoard(board.id)}
                        disabled={sourceSnapshotBusy !== null}
                      >
                        {board.title}
                      </button>
                    ))}
                  </div>
                )}

                {activeSourceBoard ? (
                  <div className={styles.sourceBoardDetail}>
                    <div className={styles.sourceBoardToolbar}>
                      <span className={styles.safetyMeta}>
                        {activeSourceBoard.nodes.length} active nodes
                        {activeSourceBoardScopeNodeCount > 0 ? ' 路 used by new proposals' : ''}
                      </span>
                      <button
                        type="button"
                        className={styles.safetyActionBtn}
                        onClick={handleSeedSourceBoard}
                        disabled={sourceSnapshotBusy !== null || sourceScopes.length === 0}
                      >
                        Add scopes
                      </button>
                    </div>
                    {activeSourceBoard.nodes.length === 0 ? (
                      <div className={styles.snapshotEmpty}>Add selected source scopes to start this board.</div>
                    ) : (
                      <div className={styles.sourceBoardNodeList}>
                        {activeSourceBoard.nodes.slice(0, 8).map((node) => (
                          <div key={node.id} className={styles.sourceBoardNode}>
                            <button
                              type="button"
                              className={styles.sourceScopeOpenBtn}
                              onClick={() => handleOpenSourceBoardNode(node.id)}
                              disabled={sourceSnapshotBusy !== null}
                              title="Open board node source"
                            >
                              <span>{node.title}</span>
                              <small>{node.node_type.replace(/_/g, ' ')}{node.summary ? ` 路 ${node.summary}` : ''}</small>
                            </button>
                            <button
                              type="button"
                              className={styles.safetyActionBtn}
                              onClick={() => handleArchiveSourceBoardNode(node.id)}
                              disabled={sourceSnapshotBusy !== null}
                            >
                              Archive
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.snapshotEmpty}>Create a Source Board to organize selected ranges for proposals.</div>
                )}
              </div>

              {activeSourceSnapshot && (
                <div className={styles.snapshotViewer}>
                  <div className={styles.snapshotViewerHeader}>
                    <div>
                      <div className={styles.snapshotViewerTitle}>{activeSourceSnapshot.snapshot.title}</div>
                      <div className={styles.snapshotItemMeta}>{activeSourceSnapshot.snapshot.source_filename}</div>
                    </div>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => setActiveSourceSnapshot(null)}
                      title="Close source snapshot"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className={styles.snapshotPages}>
                    {activeSourceSnapshot.pages.slice(0, 8).map((page) => (
                      <section key={page.id} className={styles.snapshotPage}>
                        <div className={styles.snapshotPageTopline}>
                          <div className={styles.snapshotPageLabel}>{page.page_label || `p.${page.page_number}`}</div>
                          <div className={styles.snapshotPageActions}>
                            <button
                              type="button"
                              onClick={() => handleCreateSourceScope(page, 'page')}
                              disabled={sourceSnapshotBusy !== null}
                            >
                              Select page
                            </button>
                            <button
                              type="button"
                              onClick={() => setSourceScopeRangeStart(page)}
                              disabled={sourceSnapshotBusy !== null}
                              className={sourceScopeRangeStart?.id === page.id ? styles.sourceScopeActiveBtn : ''}
                            >
                              Range start
                            </button>
                            <button
                              type="button"
                              onClick={() => sourceScopeRangeStart && handleCreateSourceScope(page, 'page_range', sourceScopeRangeStart)}
                              disabled={sourceSnapshotBusy !== null || !sourceScopeRangeStart}
                            >
                              Range end
                            </button>
                          </div>
                        </div>
                        <p>{page.text_content}</p>
                      </section>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {reconciliationSafety && (
              <div className={styles.safetySummary}>
                <div className={styles.safetyHeader}>
                  <div>
                    <div className={styles.proposalEyebrow}>Reconciliation safety</div>
                    <div className={styles.safetyTitle}>
                      {reconciliationSafety.active_exclusions.length} exclusions 路 {reconciliationSafety.open_conflicts.length} open conflicts
                    </div>
                  </div>
                  <span className={styles.safetyMeta}>No source rows are deleted</span>
                </div>

                {reconciliationSafety.active_exclusions.length > 0 && (
                  <div className={styles.safetyGroup}>
                    <div className={styles.safetyGroupTitle}>Active exclusions</div>
                    {reconciliationSafety.active_exclusions.slice(0, 3).map((item) => (
                      <div key={item.id} className={styles.safetyItem}>
                        <span>{item.reason || 'Excluded reconciliation group'}</span>
                        <button
                          type="button"
                          className={styles.safetyActionBtn}
                          disabled={proposalBusy !== null}
                          onClick={() => handleSafetyAction(`/reconciliation/exclusions/${item.id}/restore`, 'Exclusion restored')}
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {reconciliationSafety.open_conflicts.length > 0 && (
                  <div className={styles.safetyGroup}>
                    <div className={styles.safetyGroupTitle}>Open conflicts</div>
                    {reconciliationSafety.open_conflicts.slice(0, 3).map((item) => (
                      <div key={item.id} className={styles.safetyItem}>
                        <span>{item.title}</span>
                        <button
                          type="button"
                          className={styles.safetyActionBtn}
                          disabled={proposalBusy !== null}
                          onClick={() => handleSafetyAction(`/reconciliation/conflicts/${item.id}/resolve`, 'Conflict resolved')}
                        >
                          Resolve
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {reconciliationSafety.recent_conflicts.some((item) => item.status !== 'open') && (
                  <div className={styles.safetyGroup}>
                    <div className={styles.safetyGroupTitle}>Recoverable conflicts</div>
                    {reconciliationSafety.recent_conflicts.filter((item) => item.status !== 'open').slice(0, 2).map((item) => (
                      <div key={item.id} className={styles.safetyItem}>
                        <span>{item.title}</span>
                        <button
                          type="button"
                          className={styles.safetyActionBtn}
                          disabled={proposalBusy !== null}
                          onClick={() => handleSafetyAction(`/reconciliation/conflicts/${item.id}/reopen`, 'Conflict reopened')}
                        >
                          Reopen
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {reconciliationSafety.recent_recovery_events.length > 0 && (
                  <div className={styles.safetyGroup}>
                    <div className={styles.safetyGroupTitle}>Recent recovery</div>
                    {reconciliationSafety.recent_recovery_events.slice(0, 2).map((item) => (
                      <div key={item.id} className={styles.safetyEvent}>
                        {item.event_type.replace(/_/g, ' ')} 路 {item.next_status}
                      </div>
                    ))}
                  </div>
                )}

                {reconciliationSafety.active_exclusions.length === 0
                  && reconciliationSafety.open_conflicts.length === 0
                  && reconciliationSafety.recent_recovery_events.length === 0 && (
                    <div className={styles.safetyEmpty}>No active reconciliation safety items</div>
                  )}
              </div>
            )}

            {activeProposal && (
              <div className={styles.proposalReview}>
                <div className={styles.proposalReviewHeader}>
                  <div>
                    <div className={styles.proposalEyebrow}>
                      {activeProposal.type === 'material_map'
                        ? 'Material map proposal'
                        : activeProposal.type === 'organized_note'
                          ? 'Organized note proposal'
                          : activeProposal.type === 'canvas_layout'
                            ? 'Canvas layout proposal'
                            : activeProposal.type === 'composition_template'
                              ? 'Composition proposal'
                            : 'Material reconciliation proposal'}
                    </div>
                    <div className={styles.proposalReviewTitle}>{activeProposal.data.title}</div>
                  </div>
                  <button
                    className={styles.iconBtn}
                    onClick={() => {
                      setActiveProposal(null);
                      setReconciliationDecisions({});
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
                {activeProposal.data.description && (
                  <p className={styles.proposalDescription}>{activeProposal.data.description}</p>
                )}
                <div className={styles.sourceLanguage}>
                  <Eye size={14} />
                  <span>This proposal needs review before applying.</span>
                </div>
                {activeProposal.type === 'material_reconciliation' && (
                  <div className={styles.sourceLanguage}>
                    <AlertTriangle size={14} />
                    <span>Accepting a group creates an Evidence Set only. It does not merge, delete, hide, or rewrite source material.</span>
                  </div>
                )}
                {activeProposal.type === 'canvas_layout' && (
                  <div className={styles.sourceLanguage}>
                    <LayoutDashboard size={14} />
                    <span>Applying this proposal changes canvas layout records only. It does not rewrite notes or source material.</span>
                  </div>
                )}
                {activeProposal.type === 'composition_template' && (
                  <div className={styles.sourceLanguage}>
                    <Layers size={14} />
                    <span>Applying this proposal creates new blocks and canvas projection records only. Relation blueprints stay suggestions.</span>
                  </div>
                )}
                {activeProposal.data.warnings?.map((warning) => (
                  <div key={warning} className={styles.warningLine}>
                    <AlertTriangle size={13} />
                    {warning}
                  </div>
                ))}

                {activeProposal.type === 'material_map' && (
                  <div className={styles.proposalItems}>
                    {(activeProposal.data.segments || []).slice(0, 8).map((segment) => (
                      <div key={segment.segment_id} className={styles.proposalItem}>
                        <span className={styles.itemKind}>{segment.segment_type}</span>
                        <span className={styles.itemText}>{segment.title}</span>
                        {segment.page_start && (
                          <span className={styles.itemMetaSmall}>
                            p.{segment.page_start}{segment.page_end && segment.page_end !== segment.page_start ? `-${segment.page_end}` : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeProposal.type === 'organized_note' && (
                  <div className={styles.proposalItems}>
                    {(activeProposal.data.blocks || []).slice(0, 8).map((block) => (
                      <div key={block.temp_id} className={styles.proposalItem}>
                        <span className={styles.itemKind}>{getNoteBlockTemplateLabel(block.metadata, block.block_type)}</span>
                        <span className={styles.itemText}>{block.title || block.plain_text}</span>
                        <span className={styles.itemMetaSmall}>
                          {block.source_references?.length || 0} refs
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeProposal.type === 'canvas_layout' && (
                  <div className={styles.proposalItems}>
                    <div className={styles.proposalItem}>
                      <span className={styles.itemKind}>layout</span>
                      <span className={styles.itemText}>
                        {activeProposal.data.input_summary?.planned_object_count || activeProposal.data.node_layouts?.length || 0} objects / {activeProposal.data.frames?.length || 0} frames
                      </span>
                      <span className={styles.itemMetaSmall}>{percent(activeProposal.data.confidence)}</span>
                    </div>
                    {(activeProposal.data.node_layouts || []).slice(0, 8).map((layout) => (
                      <div key={layout.temp_id} className={styles.proposalItem}>
                        <span className={styles.itemKind}>{layout.action.replace(/_/g, ' ')}</span>
                        <span className={styles.itemText}>{layout.title}</span>
                        <span className={styles.itemMetaSmall}>{Math.round(layout.x)}, {Math.round(layout.y)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeProposal.type === 'composition_template' && (
                  <div className={styles.proposalItems}>
                    <div className={styles.proposalItem}>
                      <span className={styles.itemKind}>composition</span>
                      <span className={styles.itemText}>
                        {activeProposal.data.slot_plan?.filter((slot) => slot.status === 'filled').length || 0} blocks / {activeProposal.data.relation_blueprint_suggestions?.length || 0} suggested relations
                      </span>
                      <span className={styles.itemMetaSmall}>{percent(activeProposal.data.confidence)}</span>
                    </div>
                    {(activeProposal.data.slot_plan || []).slice(0, 10).map((slot) => (
                      <div key={`${slot.slot_key}-${slot.slot_index}`} className={styles.proposalItem}>
                        <span className={styles.itemKind}>{slot.status}</span>
                        <span className={styles.itemText}>{slot.title || slot.label}</span>
                        <span className={styles.itemMetaSmall}>{slot.template_key || slot.slot_key}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeProposal.type === 'material_reconciliation' && (
                  <div className={styles.proposalItems}>
                    {(activeProposal.data.candidate_groups || []).slice(0, 8).map((group) => (
                      <div key={group.group_id} className={`${styles.proposalItem} ${styles.reconciliationItem} ${group.blocked_by_safety ? styles.safetyBlockedItem : ''}`}>
                        <span className={styles.itemKind}>{group.group_kind.replace(/_/g, ' ')}</span>
                        <span className={styles.itemText}>{group.title}</span>
                        <span className={styles.itemMetaSmall}>
                          {group.evidence.length} sources 路 {Math.round((group.confidence || 0) * 100)}%
                        </span>
                        <div className={styles.roleHintRow}>
                          <span className={styles.roleHint}>
                            {formatRoleLabel(group.learning_role_candidates?.[0]?.learning_role)}
                          </span>
                          <span className={styles.roleHint}>
                            {group.template_candidates?.[0]?.label || 'Paragraph'}
                          </span>
                          <span className={styles.roleConfidence}>
                            role {percent(group.role_confidence)}
                          </span>
                          {group.blocked_by_safety && (
                            <span className={styles.safetyBlockedLabel}>Safety blocked</span>
                          )}
                        </div>
                        {[...(group.role_warnings || []), ...(group.safety_reasons || [])].map((warning) => (
                          <div key={warning} className={styles.groupWarning}>
                            <AlertTriangle size={12} />
                            <span>{warning}</span>
                          </div>
                        ))}
                        <div className={styles.decisionControls} aria-label={`Decision for ${group.title}`}>
                          {([
                            ['accepted_evidence_set', 'Accept evidence'],
                            ['kept_separate', 'Keep separate'],
                            ['deferred', 'Defer'],
                            ['excluded', 'Exclude'],
                            ['mark_conflict', 'Mark conflict'],
                          ] as const).map(([decision, label]) => (
                            <button
                              key={decision}
                              type="button"
                              className={`${styles.decisionBtn} ${reconciliationDecisions[group.group_id] === decision ? styles.decisionBtnActive : ''}`}
                              onClick={() => setReconciliationDecisions((prev) => ({
                                ...prev,
                                [group.group_id]: decision,
                              }))}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.proposalActions}>
                  <button
                    className={styles.applyBtn}
                    onClick={handleApplyProposal}
                    disabled={proposalBusy !== null}
                  >
                    {activeProposal.type === 'material_reconciliation'
                      ? selectedReconciliationDecisionCount > 0 ? 'Apply decisions' : 'Mark reviewed'
                      : activeProposal.type === 'canvas_layout'
                        ? 'Apply layout'
                        : activeProposal.type === 'composition_template'
                          ? 'Apply composition'
                        : 'Apply'}
                  </button>
                  <button
                    className={styles.discardBtn}
                    onClick={handleDiscardProposal}
                    disabled={proposalBusy !== null}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goals Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Target size={18} />
            <span>Goals</span>
            <span className={styles.sectionCount}>{rootGoals.length}</span>
          </div>
          <button
            className={styles.sectionAddBtn}
            onClick={() => openModal('goal-create', { courseId: course.id })}
          >
            <Plus size={15} />
            Add Goal
          </button>
        </div>
        {rootGoals.length === 0 ? (
          <div className={styles.empty}>No goals yet</div>
        ) : (
          <div className={styles.goalList}>
            {rootGoals.map((goal) => {
              const StatusIcon = STATUS_ICONS[goal.status] || Circle;
              const progress = goal.task_count > 0
                ? Math.round((goal.completed_task_count / goal.task_count) * 100)
                : 0;
              return (
                <div
                  key={goal.id}
                  className={styles.goalCard}
                  onClick={() => openModal('goal-edit', { goal })}
                >
                  <div className={styles.goalStatus}>
                    <StatusIcon size={16} className={styles[`status_${goal.status}`]} />
                  </div>
                  <div className={styles.goalBody}>
                    <div className={styles.goalTitle}>{goal.title}</div>
                    <div className={styles.goalMeta}>
                      <span>{goal.task_count} tasks</span>
                      {goal.task_count > 0 && (
                        <span className={styles.goalProgress}>{progress}% done</span>
                      )}
                      {goal.deadline && (
                        <span className={styles.goalDeadline}>
                          Due {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {(subGoalCounts.get(goal.id) || 0) > 0 && (
                        <span>{subGoalCounts.get(goal.id)} sub-goals</span>
                      )}
                    </div>
                    {goal.exam_mode && (
                      <span className={styles.examBadge}>Exam</span>
                    )}
                  </div>
                  {goal.task_count > 0 && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card Decks Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Layers size={18} />
            <span>Card Decks</span>
            <span className={styles.sectionCount}>{decks.length}</span>
          </div>
          <button
            className={styles.sectionAddBtn}
            onClick={() => openModal('deck-create', { courseId: course.id })}
          >
            <Plus size={15} />
            Add Deck
          </button>
        </div>
        {decks.length === 0 ? (
          <div className={styles.empty}>No decks yet</div>
        ) : (
          <div className={styles.deckGrid}>
            {decks.map((deck) => (
              <div
                key={deck.id}
                className={styles.deckCard}
                onClick={() => navigate(`/decks/${deck.id}`)}
              >
                <div className={styles.deckName}>{deck.name}</div>
                {deck.description && (
                  <div className={styles.deckDesc}>{deck.description}</div>
                )}
                <div className={styles.deckStats}>
                  <span className={styles.deckCardCount}>
                    <BookOpen size={13} />
                    {deck.card_count} cards
                  </span>
                  {deck.due_count > 0 && (
                    <span className={styles.deckDue}>
                      {deck.due_count} due
                    </span>
                  )}
                </div>
                <button
                  className={styles.reviewBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/review?deckId=${deck.id}`);
                  }}
                >
                  <RotateCcw size={13} />
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProjectSourcesPanel projectId={course.id} legacyDocuments={documents} />

      {/* Delete Confirmation */}
      {deleteConfirmation}
    </div>
  );
}
