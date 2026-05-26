import {
  Archive,
  Command,
  ExternalLink,
  GitBranch,
  Keyboard,
  Maximize2,
  MousePointer2,
  Move,
  Plus,
  RotateCcw,
  Unlink,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import {
  loadRuntimeTemplateOptions,
  metadataForTemplateOption,
  STATIC_TEMPLATE_OPTIONS,
  type TemplateOption,
} from '@/services/templateOptions';
import styles from './LearningCanvasSurface.module.css';

interface LearningCanvasSummary {
  id: string;
  title: string;
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

interface CanvasEdgeSummary {
  id: string;
  canvas_id: string;
  source_node_id: string;
  source_port: CanvasPort;
  target_node_id: string | null;
  target_port: CanvasPort | null;
  loose_target_x: number | null;
  loose_target_y: number | null;
  object_relation_id: string | null;
  relation_layer_id: string | null;
  relation_kind: string | null;
  label: string | null;
  connection_state: CanvasConnectionState;
  style_key: string;
  status: 'active' | 'archived';
}

interface RelationLayerSummary {
  id: string;
  title: string;
  layer_kind: string;
  visibility: 'visible' | 'hidden';
  status: 'active' | 'archived';
}

interface LearningCanvasDetail {
  canvas: LearningCanvasSummary;
  nodes: CanvasNodeSummary[];
  archived_nodes?: CanvasNodeSummary[];
  edges: CanvasEdgeSummary[];
  relation_layers?: RelationLayerSummary[];
  viewport: {
    viewport_x: number;
    viewport_y: number;
    zoom: number;
  };
}

interface CanvasViewport {
  viewport_x: number;
  viewport_y: number;
  zoom: number;
}

interface CanvasNodeLayout {
  x: number;
  y: number;
  width: number;
  height: number;
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

type CanvasPort = 'top' | 'right' | 'bottom' | 'left';
type CanvasConnectionState =
  | 'incomplete'
  | 'visual_only'
  | 'relation_suggested'
  | 'relation_backed'
  | 'stale_binding'
  | 'broken_relation';

interface CanvasEdgeDraft {
  source_node_id: string;
  source_port: CanvasPort;
  target_node_id?: string | null;
  target_port?: CanvasPort | null;
  loose_target_x?: number | null;
  loose_target_y?: number | null;
  relation_layer_id?: string | null;
  label?: string | null;
}

interface BindRelationDraft {
  relation_type: string;
  relation_layer_id?: string;
  label?: string | null;
}

interface CanvasLayoutPreview {
  node_layouts?: Array<{
    temp_id: string;
    action: 'update_layout' | 'create_node';
    node_type: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  frames?: Array<{
    temp_id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

interface Props {
  detail: LearningCanvasDetail;
  busy: boolean;
  surfaceMode?: 'standard' | 'main' | 'focus';
  layoutPreview?: CanvasLayoutPreview | null;
  onOpenNode: (nodeId: string) => void;
  onArchiveNode: (nodeId: string) => void;
  onRestoreNode: (nodeId: string) => void;
  onCreateEdge: (draft: CanvasEdgeDraft) => Promise<CanvasEdgeSummary | void> | CanvasEdgeSummary | void;
  onBindEdgeRelation: (edgeId: string, draft: BindRelationDraft) => Promise<void> | void;
  onUnbindEdgeRelation: (edgeId: string) => Promise<void> | void;
  onArchiveEdge: (edgeId: string) => Promise<void> | void;
  onCreateNoteBlock: (draft: CanvasNoteBlockDraft) => Promise<void> | void;
  onPlanLayout?: () => Promise<void> | void;
  onNodeLayoutChange: (nodeId: string, layout: CanvasNodeLayout) => void;
  onViewportChange: (viewport: CanvasViewport) => void;
}

type PointerOperation =
  | {
      kind: 'pan';
      startClientX: number;
      startClientY: number;
      startViewportX: number;
      startViewportY: number;
    }
  | {
      kind: 'move';
      nodeId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      kind: 'resize';
      nodeId: string;
      startClientX: number;
      startClientY: number;
      startWidth: number;
      startHeight: number;
    }
  | {
      kind: 'connect';
      sourceNodeId: string;
      sourcePort: CanvasPort;
      currentX: number;
      currentY: number;
    };

interface EdgeDraftState {
  sourceNodeId: string;
  sourcePort: CanvasPort;
  currentX: number;
  currentY: number;
}

interface CanvasCommandItem {
  command_id: string;
  label: string;
  shortcut?: string;
  enabled: boolean;
  disabled_reason?: string;
  run: () => void;
}

const RELATION_TYPES = [
  'uses_definition',
  'uses_formula',
  'example_of',
  'answers',
  'supports',
  'contradicts',
  'read_before',
  'derives_to',
  'source_supports',
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nodeTypeLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function relationLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function createLayoutMap(nodes: CanvasNodeSummary[]): Record<string, CanvasNodeLayout> {
  return Object.fromEntries(
    nodes.map((node) => [
      node.id,
      {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      },
    ]),
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || tagName === 'button'
    || target.isContentEditable;
}

export default function LearningCanvasSurface({
  detail,
  busy,
  surfaceMode = 'standard',
  layoutPreview = null,
  onOpenNode,
  onArchiveNode,
  onRestoreNode,
  onCreateEdge,
  onBindEdgeRelation,
  onUnbindEdgeRelation,
  onArchiveEdge,
  onCreateNoteBlock,
  onPlanLayout,
  onNodeLayoutChange,
  onViewportChange,
}: Props) {
  const [viewport, setViewport] = useState<CanvasViewport>({
    viewport_x: detail.viewport?.viewport_x ?? 0,
    viewport_y: detail.viewport?.viewport_y ?? 0,
    zoom: detail.viewport?.zoom ?? 1,
  });
  const [nodeLayouts, setNodeLayouts] = useState<Record<string, CanvasNodeLayout>>(() => createLayoutMap(detail.nodes));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(detail.nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<PointerOperation['kind'] | null>(null);
  const [insertPanelOpen, setInsertPanelOpen] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [edgeDraft, setEdgeDraft] = useState<EdgeDraftState | null>(null);
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(() => new Set());
  const [relationType, setRelationType] = useState('read_before');
  const [relationLayerId, setRelationLayerId] = useState<string>('');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>(STATIC_TEMPLATE_OPTIONS);
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [newTemplateId, setNewTemplateId] = useState(STATIC_TEMPLATE_OPTIONS[3]?.template_id || STATIC_TEMPLATE_OPTIONS[0]?.template_id || 'text.paragraph');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockText, setNewBlockText] = useState('');

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const operationRef = useRef<PointerOperation | null>(null);
  const viewportRef = useRef(viewport);
  const nodeLayoutsRef = useRef(nodeLayouts);
  const saveViewportTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setViewport({
      viewport_x: detail.viewport?.viewport_x ?? 0,
      viewport_y: detail.viewport?.viewport_y ?? 0,
      zoom: detail.viewport?.zoom ?? 1,
    });
    setNodeLayouts(createLayoutMap(detail.nodes));
    setSelectedNodeId(detail.nodes[0]?.id ?? null);
    setSelectedEdgeId(null);
  }, [detail.canvas.id, detail.nodes, detail.viewport?.viewport_x, detail.viewport?.viewport_y, detail.viewport?.zoom]);

  useEffect(() => {
    const selectedEdge = detail.edges?.find((edge) => edge.id === selectedEdgeId);
    if (!selectedEdge) return;
    setRelationType(selectedEdge.relation_kind || 'read_before');
    setRelationLayerId(selectedEdge.relation_layer_id || detail.relation_layers?.[0]?.id || '');
    setEdgeLabel(selectedEdge.label || '');
  }, [detail.edges, detail.relation_layers, selectedEdgeId]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    nodeLayoutsRef.current = nodeLayouts;
  }, [nodeLayouts]);

  useEffect(() => {
    return () => {
      if (saveViewportTimerRef.current) {
        window.clearTimeout(saveViewportTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRuntimeTemplateOptions().then(({ options, warning }) => {
      if (cancelled) return;
      setTemplateOptions(options);
      setTemplateWarning(warning);
      if (!options.some((template) => template.template_id === newTemplateId)) {
        setNewTemplateId(options[0]?.template_id || 'text.paragraph');
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const operation = operationRef.current;
      if (!operation) return;
      event.preventDefault();

      if (operation.kind === 'pan') {
        const next = {
          ...viewportRef.current,
          viewport_x: operation.startViewportX + event.clientX - operation.startClientX,
          viewport_y: operation.startViewportY + event.clientY - operation.startClientY,
        };
        setViewport(next);
        return;
      }

      if (operation.kind === 'connect') {
        const point = pointerToWorld(event.clientX, event.clientY);
        operation.currentX = point.x;
        operation.currentY = point.y;
        setEdgeDraft({
          sourceNodeId: operation.sourceNodeId,
          sourcePort: operation.sourcePort,
          currentX: point.x,
          currentY: point.y,
        });
        return;
      }

      const deltaX = (event.clientX - operation.startClientX) / viewportRef.current.zoom;
      const deltaY = (event.clientY - operation.startClientY) / viewportRef.current.zoom;

      if (operation.kind === 'move') {
        setNodeLayouts((current) => ({
          ...current,
          [operation.nodeId]: {
            ...current[operation.nodeId],
            x: operation.startX + deltaX,
            y: operation.startY + deltaY,
          },
        }));
        return;
      }

      setNodeLayouts((current) => ({
        ...current,
        [operation.nodeId]: {
          ...current[operation.nodeId],
          width: clamp(operation.startWidth + deltaX, 180, 900),
          height: clamp(operation.startHeight + deltaY, 100, 720),
        },
      }));
    };

    const handlePointerUp = (event: PointerEvent) => {
      const operation = operationRef.current;
      if (!operation) return;
      operationRef.current = null;
      setActiveOperation(null);

      if (operation.kind === 'pan') {
        onViewportChange(viewportRef.current);
        return;
      }

      if (operation.kind === 'connect') {
        const target = edgeTargetFromPointer(event.clientX, event.clientY);
        const fallbackPoint = pointerToWorld(event.clientX, event.clientY);
        const draft: CanvasEdgeDraft = target && target.nodeId !== operation.sourceNodeId
          ? {
              source_node_id: operation.sourceNodeId,
              source_port: operation.sourcePort,
              target_node_id: target.nodeId,
              target_port: target.port,
            }
          : {
              source_node_id: operation.sourceNodeId,
              source_port: operation.sourcePort,
              loose_target_x: Math.round(fallbackPoint.x),
              loose_target_y: Math.round(fallbackPoint.y),
            };
        setEdgeDraft(null);
        void Promise.resolve(onCreateEdge(draft)).then((edge) => {
          if (edge?.id) {
            setSelectedEdgeId(edge.id);
            setSelectedNodeId(null);
          }
        });
        return;
      }

      const layout = nodeLayoutsRef.current[operation.nodeId];
      if (layout) onNodeLayoutChange(operation.nodeId, layout);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onCreateEdge, onNodeLayoutChange, onViewportChange]);

  const nodes = useMemo(
    () => detail.nodes
      .map((node) => ({ ...node, ...(nodeLayouts[node.id] || {}) }))
      .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0)),
    [detail.nodes, nodeLayouts],
  );
  const archivedNodes = detail.archived_nodes || [];

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedEdge = detail.edges?.find((edge) => edge.id === selectedEdgeId) || null;
  const toolMode = insertPanelOpen ? 'insert_block' : connectMode ? 'connect' : 'select';
  const relationLayers = detail.relation_layers || [];
  const visibleEdges = (detail.edges || []).filter((edge) => edge.status === 'active' && (!edge.relation_layer_id || !hiddenLayerIds.has(edge.relation_layer_id)));
  const previewLayouts = layoutPreview?.node_layouts || [];
  const previewFrames = layoutPreview?.frames || [];
  const canvasWidth = Math.max(
    detail.canvas.width,
    ...nodes.map((node) => node.x + node.width + 120),
    ...previewLayouts.map((node) => node.x + node.width + 120),
    ...previewFrames.map((frame) => frame.x + frame.width + 120),
    794,
  );
  const canvasHeight = Math.max(
    detail.canvas.height,
    ...nodes.map((node) => node.y + node.height + 120),
    ...previewLayouts.map((node) => node.y + node.height + 120),
    ...previewFrames.map((frame) => frame.y + frame.height + 120),
    1123,
  );
  const selectedTemplate = templateOptions.find((template) => template.template_id === newTemplateId) || templateOptions[0];

  const scheduleViewportSave = (nextViewport: CanvasViewport) => {
    if (saveViewportTimerRef.current) window.clearTimeout(saveViewportTimerRef.current);
    saveViewportTimerRef.current = window.setTimeout(() => {
      onViewportChange(nextViewport);
    }, 350);
  };

  const pointerToWorld = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const left = rect?.left || 0;
    const top = rect?.top || 0;
    return {
      x: (clientX - left - viewportRef.current.viewport_x) / viewportRef.current.zoom,
      y: (clientY - top - viewportRef.current.viewport_y) / viewportRef.current.zoom,
    };
  };

  const edgeTargetFromPointer = (clientX: number, clientY: number): { nodeId: string; port: CanvasPort } | null => {
    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const portElement = element?.closest<HTMLElement>('[data-canvas-port="true"]');
    const nodeId = portElement?.dataset.nodeId;
    const port = portElement?.dataset.port as CanvasPort | undefined;
    if (!nodeId || !port || !['top', 'right', 'bottom', 'left'].includes(port)) return null;
    return { nodeId, port };
  };

  const nodePortPoint = (nodeId: string, port: CanvasPort | null, looseX?: number | null, looseY?: number | null) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return { x: looseX || 0, y: looseY || 0 };
    if (port === 'top') return { x: node.x + node.width / 2, y: node.y };
    if (port === 'right') return { x: node.x + node.width, y: node.y + node.height / 2 };
    if (port === 'bottom') return { x: node.x + node.width / 2, y: node.y + node.height };
    if (port === 'left') return { x: node.x, y: node.y + node.height / 2 };
    return { x: looseX || node.x + node.width / 2, y: looseY || node.y + node.height / 2 };
  };

  const edgePath = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const dx = end.x - start.x;
    const controlOffset = clamp(Math.abs(dx) * 0.45, 80, 220);
    const c1x = start.x + (dx >= 0 ? controlOffset : -controlOffset);
    const c2x = end.x - (dx >= 0 ? controlOffset : -controlOffset);
    return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
  };

  const setZoom = (nextZoom: number) => {
    const next = {
      ...viewportRef.current,
      zoom: clamp(nextZoom, 0.35, 2.25),
    };
    setViewport(next);
    scheduleViewportSave(next);
  };

  const resetView = () => {
    const next = { viewport_x: 0, viewport_y: 0, zoom: 1 };
    setViewport(next);
    onViewportChange(next);
  };

  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (busy || event.button !== 0) return;
    event.currentTarget.focus();
    if ((event.target as HTMLElement).closest('[data-canvas-node="true"]')) return;
    if ((event.target as HTMLElement).closest('[data-canvas-edge="true"]')) return;
    operationRef.current = {
      kind: 'pan',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewportX: viewportRef.current.viewport_x,
      startViewportY: viewportRef.current.viewport_y,
    };
    setActiveOperation('pan');
  };

  const beginConnect = (event: ReactPointerEvent<HTMLButtonElement>, node: CanvasNodeSummary, port: CanvasPort) => {
    if (busy || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = nodePortPoint(node.id, port);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    operationRef.current = {
      kind: 'connect',
      sourceNodeId: node.id,
      sourcePort: port,
      currentX: point.x,
      currentY: point.y,
    };
    setEdgeDraft({
      sourceNodeId: node.id,
      sourcePort: port,
      currentX: point.x,
      currentY: point.y,
    });
    setActiveOperation('connect');
  };

  const beginMove = (event: ReactPointerEvent<HTMLElement>, node: CanvasNodeSummary) => {
    if (busy || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(node.id);
    operationRef.current = {
      kind: 'move',
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: node.x,
      startY: node.y,
    };
    setActiveOperation('move');
  };

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>, node: CanvasNodeSummary) => {
    if (busy || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(node.id);
    operationRef.current = {
      kind: 'resize',
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: node.width,
      startHeight: node.height,
    };
    setActiveOperation('resize');
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (busy) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const current = viewportRef.current;
    const nextZoom = clamp(current.zoom + (event.deltaY > 0 ? -0.08 : 0.08), 0.35, 2.25);
    const worldX = (pointerX - current.viewport_x) / current.zoom;
    const worldY = (pointerY - current.viewport_y) / current.zoom;
    const next = {
      viewport_x: pointerX - worldX * nextZoom,
      viewport_y: pointerY - worldY * nextZoom,
      zoom: nextZoom,
    };
    setViewport(next);
    scheduleViewportSave(next);
  };

  const insertPoint = () => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const surfaceWidth = rect?.width || 900;
    const surfaceHeight = rect?.height || 560;
    const x = ((surfaceWidth / 2) - viewportRef.current.viewport_x) / viewportRef.current.zoom - 160;
    const y = ((surfaceHeight / 2) - viewportRef.current.viewport_y) / viewportRef.current.zoom - 90;
    return {
      x: Math.max(24, Math.round(x)),
      y: Math.max(24, Math.round(y)),
    };
  };

  const submitNewBlock = async () => {
    const body = newBlockText.trim();
    if (!selectedTemplate || !body) return;
    const point = insertPoint();
    await onCreateNoteBlock({
      template_id: selectedTemplate.template_key,
      metadata: metadataForTemplateOption(selectedTemplate),
      title: newBlockTitle.trim() || undefined,
      plain_text: body,
      content_json: {
        ...selectedTemplate.default_content,
        body,
      },
      x: point.x,
      y: point.y,
      width: selectedTemplate.system_type === 'latex' || selectedTemplate.system_type === 'code' ? 360 : 320,
      height: selectedTemplate.system_type === 'latex' ? 150 : 180,
    });
    setNewBlockTitle('');
    setNewBlockText('');
    setInsertPanelOpen(false);
  };

  const toggleLayer = (layerId: string) => {
    setHiddenLayerIds((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  const submitBindRelation = async () => {
    if (!selectedEdge || selectedEdge.connection_state === 'incomplete') return;
    await onBindEdgeRelation(selectedEdge.id, {
      relation_type: relationType,
      relation_layer_id: relationLayerId || undefined,
      label: edgeLabel.trim() || undefined,
    });
  };

  const clearSelection = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const cancelTransientMode = () => {
    setEdgeDraft(null);
    operationRef.current = null;
    setActiveOperation(null);
    setConnectMode(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (busy || isTypingTarget(event.target)) return;
    const usesModifier = event.ctrlKey || event.metaKey;

    if (event.key === 'Escape') {
      event.preventDefault();
      if (insertPanelOpen) {
        setInsertPanelOpen(false);
        return;
      }
      if (edgeDraft || activeOperation || connectMode) {
        cancelTransientMode();
        return;
      }
      clearSelection();
      return;
    }

    if (usesModifier && (event.key === '=' || event.key === '+')) {
      event.preventDefault();
      setZoom(viewportRef.current.zoom + 0.15);
      return;
    }

    if (usesModifier && event.key === '-') {
      event.preventDefault();
      setZoom(viewportRef.current.zoom - 0.15);
      return;
    }

    if (usesModifier && event.key === '0') {
      event.preventDefault();
      resetView();
      return;
    }

    if (!usesModifier && !event.altKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      setConnectMode((value) => !value);
      setInsertPanelOpen(false);
      return;
    }

    if (!usesModifier && !event.altKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      setInsertPanelOpen(true);
      setConnectMode(false);
    }
  };

  const commandItems: CanvasCommandItem[] = [
    {
      command_id: 'canvas.open_insert_block',
      label: 'Add block',
      shortcut: 'A',
      enabled: true,
      run: () => {
        setInsertPanelOpen(true);
        setConnectMode(false);
      },
    },
    {
      command_id: 'canvas.toggle_connect_mode',
      label: connectMode ? 'Exit connect' : 'Connect',
      shortcut: 'C',
      enabled: true,
      run: () => {
        setConnectMode((value) => !value);
        setInsertPanelOpen(false);
      },
    },
    {
      command_id: 'canvas.clear_selection',
      label: 'Clear',
      shortcut: 'Esc',
      enabled: Boolean(selectedNode || selectedEdge || connectMode || insertPanelOpen),
      disabled_reason: 'No selection or transient mode',
      run: () => {
        cancelTransientMode();
        setInsertPanelOpen(false);
        clearSelection();
      },
    },
    {
      command_id: 'canvas.open_selected_target',
      label: 'Open target',
      enabled: Boolean(selectedNode),
      disabled_reason: 'Select a node first',
      run: () => selectedNode && onOpenNode(selectedNode.id),
    },
    {
      command_id: 'canvas.archive_selected_node',
      label: 'Hide node',
      enabled: Boolean(selectedNode),
      disabled_reason: 'Select a node first',
      run: () => selectedNode && onArchiveNode(selectedNode.id),
    },
    {
      command_id: 'canvas.archive_selected_edge',
      label: 'Archive edge',
      enabled: Boolean(selectedEdge),
      disabled_reason: 'Select an edge first',
      run: () => { if (selectedEdge) void onArchiveEdge(selectedEdge.id); },
    },
    {
      command_id: 'canvas.bind_selected_edge_relation',
      label: 'Bind relation',
      enabled: Boolean(selectedEdge && selectedEdge.connection_state !== 'incomplete'),
      disabled_reason: selectedEdge ? 'Incomplete edge cannot bind' : 'Select an edge first',
      run: () => { void submitBindRelation(); },
    },
    {
      command_id: 'canvas.unbind_selected_edge_relation',
      label: 'Unbind relation',
      enabled: Boolean(selectedEdge?.object_relation_id),
      disabled_reason: selectedEdge ? 'Selected edge has no relation' : 'Select an edge first',
      run: () => { if (selectedEdge) void onUnbindEdgeRelation(selectedEdge.id); },
    },
    {
      command_id: 'canvas.plan_layout',
      label: 'Plan layout',
      enabled: Boolean(onPlanLayout),
      disabled_reason: 'Layout proposal action unavailable',
      run: () => { if (onPlanLayout) void onPlanLayout(); },
    },
  ];

  const selectedScopeText = selectedEdge
    ? `canvas_edge | edge_id=${selectedEdge.id} | state=${selectedEdge.connection_state} | relation=${selectedEdge.object_relation_id || 'none'}`
    : selectedNode
      ? `canvas_node | canvas_node_id=${selectedNode.id} | target_type=${selectedNode.node_type} | target_id=${selectedNode.target_id}`
      : 'none | select a node or edge to expose stable ids for future commands';

  return (
    <div className={`${styles.wrapper} ${surfaceMode === 'main' ? styles.wrapperMain : ''} ${surfaceMode === 'focus' ? styles.wrapperFocus : ''}`}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <MousePointer2 size={14} />
          <span>{activeOperation ? `${activeOperation} mode` : `${toolMode} mode`}</span>
        </div>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={connectMode ? styles.toolbarActionActive : ''}
            onClick={() => setConnectMode((value) => !value)}
            disabled={busy}
            title="Connect nodes"
          >
            <GitBranch size={14} />
            Connect
          </button>
          <button type="button" onClick={() => setInsertPanelOpen((value) => !value)} disabled={busy} title="Add block">
            {insertPanelOpen ? <X size={14} /> : <Plus size={14} />}
          </button>
          <button type="button" onClick={() => setZoom(viewport.zoom - 0.15)} disabled={busy} title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <span>{Math.round(viewport.zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom(viewport.zoom + 0.15)} disabled={busy} title="Zoom in">
            <ZoomIn size={14} />
          </button>
          <button type="button" onClick={resetView} disabled={busy} title="Reset view">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {insertPanelOpen && (
        <div className={styles.insertPanel} onPointerDown={(event) => event.stopPropagation()}>
          <div className={styles.insertFields}>
            <label>
              <span>Template</span>
              <select value={newTemplateId} onChange={(event) => setNewTemplateId(event.target.value)} disabled={busy}>
                {templateOptions.map((template) => (
                  <option key={template.template_id} value={template.template_id}>{template.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Title</span>
              <input
                value={newBlockTitle}
                onChange={(event) => setNewBlockTitle(event.target.value)}
                placeholder={selectedTemplate?.label || 'Block title'}
                disabled={busy}
              />
            </label>
          </div>
          <textarea
            value={newBlockText}
            onChange={(event) => setNewBlockText(event.target.value)}
            placeholder="Write the block content. Use $...$ or $$...$$ for formulas."
            disabled={busy}
          />
          <div className={styles.insertActions}>
            <span>{templateWarning || selectedTemplate?.description || 'Create a content block on the canvas.'}</span>
            <button type="button" onClick={submitNewBlock} disabled={busy || !newBlockText.trim()}>
              <Plus size={14} />
              Add block
            </button>
          </div>
        </div>
      )}

      <div
        ref={surfaceRef}
        className={`${styles.surface} ${activeOperation === 'pan' ? styles.surfacePanning : ''}`}
        tabIndex={0}
        aria-label="Learning canvas command surface"
        onPointerDown={beginPan}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
      >
        <div
          className={styles.world}
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            transform: `translate(${viewport.viewport_x}px, ${viewport.viewport_y}px) scale(${viewport.zoom})`,
          }}
        >
          <div
            className={styles.page}
            style={{
              width: `${detail.canvas.width}px`,
              minHeight: `${detail.canvas.height}px`,
            }}
          >
            <svg className={styles.edgeLayer} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
              <defs>
                <marker id="canvas-edge-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L8,3 z" />
                </marker>
              </defs>
              {visibleEdges.map((edge) => {
                const start = nodePortPoint(edge.source_node_id, edge.source_port);
                const end = edge.target_node_id
                  ? nodePortPoint(edge.target_node_id, edge.target_port)
                  : { x: edge.loose_target_x || start.x + 120, y: edge.loose_target_y || start.y };
                return (
                  <g key={edge.id} data-canvas-edge="true">
                    <path
                      className={`${styles.edgePath} ${selectedEdgeId === edge.id ? styles.edgePathSelected : ''} ${edge.connection_state === 'incomplete' ? styles.edgePathIncomplete : ''} ${edge.connection_state === 'relation_backed' ? styles.edgePathRelationBacked : ''}`}
                      d={edgePath(start, end)}
                      markerEnd={edge.connection_state === 'incomplete' ? undefined : 'url(#canvas-edge-arrow)'}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedEdgeId(edge.id);
                        setSelectedNodeId(null);
                      }}
                    />
                    {edge.label && (
                      <text className={styles.edgeLabel} x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 8}>
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
              {edgeDraft && (() => {
                const start = nodePortPoint(edgeDraft.sourceNodeId, edgeDraft.sourcePort);
                const end = { x: edgeDraft.currentX, y: edgeDraft.currentY };
                return <path className={styles.edgeDraftPath} d={edgePath(start, end)} />;
              })()}
            </svg>
            {previewFrames.map((frame) => (
              <div
                key={frame.temp_id}
                className={styles.previewFrame}
                style={{
                  left: `${frame.x}px`,
                  top: `${frame.y}px`,
                  width: `${frame.width}px`,
                  height: `${frame.height}px`,
                }}
              >
                <span>{frame.title}</span>
              </div>
            ))}
            {previewLayouts.map((layout) => (
              <div
                key={layout.temp_id}
                className={styles.previewNode}
                style={{
                  left: `${layout.x}px`,
                  top: `${layout.y}px`,
                  width: `${layout.width}px`,
                  height: `${layout.height}px`,
                }}
              >
                <strong>{layout.title}</strong>
                <small>{layout.action === 'create_node' ? 'new projection' : 'layout update'}</small>
              </div>
            ))}
            {nodes.length === 0 ? (
              <div className={styles.empty}>Add Source Board nodes to seed this canvas document.</div>
            ) : (
              nodes.map((node) => (
                <article
                  key={node.id}
                  data-canvas-node="true"
                  className={`${styles.node} ${selectedNodeId === node.id ? styles.nodeSelected : ''}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }}
                  onPointerDown={() => {
                    setSelectedNodeId(node.id);
                    setSelectedEdgeId(null);
                  }}
                >
                  {(connectMode || selectedNodeId === node.id || activeOperation === 'connect') && (['top', 'right', 'bottom', 'left'] as CanvasPort[]).map((port) => (
                    <button
                      key={port}
                      type="button"
                      data-canvas-port="true"
                      data-node-id={node.id}
                      data-port={port}
                      className={`${styles.nodePort} ${styles[`nodePort${port[0].toUpperCase()}${port.slice(1)}`]}`}
                      onPointerDown={(event) => beginConnect(event, node, port)}
                      disabled={busy}
                      title={`Connect from ${port}`}
                    />
                  ))}
                  <div className={styles.nodeDragArea} onPointerDown={(event) => beginMove(event, node)}>
                    <Move size={13} />
                    <div>
                      <strong>{node.title}</strong>
                      <small>{nodeTypeLabel(node.node_type)}</small>
                    </div>
                  </div>
                  <p>{node.summary || 'No summary yet.'}</p>
                  <div className={styles.nodeActions}>
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onOpenNode(node.id)}
                      disabled={busy}
                      title="Open target"
                    >
                      <ExternalLink size={13} />
                      Open
                    </button>
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onArchiveNode(node.id)}
                      disabled={busy}
                      title="Hide from canvas"
                    >
                      <X size={13} />
                      Hide
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.resizeHandle}
                    onPointerDown={(event) => beginResize(event, node)}
                    disabled={busy}
                    title="Resize node"
                  >
                    <Maximize2 size={11} />
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.inspector}>
        <div className={styles.commandPanel}>
          <div className={styles.commandHeader}>
            <div>
              <span className={styles.inspectorLabel}>Command context</span>
              <strong>{selectedEdge ? 'Selected edge' : selectedNode ? 'Selected node' : 'No selection'}</strong>
            </div>
            <span className={styles.commandMode}>
              <Command size={12} />
              {toolMode}
            </span>
          </div>
          <code>{selectedScopeText}</code>
          <div className={styles.commandList}>
            {commandItems.map((command) => (
              <button
                key={command.command_id}
                type="button"
                disabled={busy || !command.enabled}
                title={command.enabled ? command.command_id : command.disabled_reason}
                onClick={command.run}
              >
                <span>{command.label}</span>
                {command.shortcut && (
                  <kbd>
                    <Keyboard size={10} />
                    {command.shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </div>
          <small>AI-like layout, relation, and content changes stay proposal-first.</small>
        </div>
        {archivedNodes.length > 0 && (
          <div className={styles.hiddenPanel}>
            <span className={styles.inspectorLabel}>Hidden nodes</span>
            <div className={styles.hiddenList}>
              {archivedNodes.map((node) => (
                <div key={node.id} className={styles.hiddenItem}>
                  <div>
                    <strong>{node.title}</strong>
                    <small>{nodeTypeLabel(node.node_type)}</small>
                  </div>
                  <button type="button" onClick={() => onRestoreNode(node.id)} disabled={busy} title="Restore to canvas">
                    <RotateCcw size={12} />
                    Restore
                  </button>
                </div>
              ))}
            </div>
            <small>Hidden nodes keep their content and can be restored without creating duplicates.</small>
          </div>
        )}
        <div className={styles.layerToggles}>
          <span className={styles.inspectorLabel}>Relation layers</span>
          {relationLayers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={hiddenLayerIds.has(layer.id) ? styles.layerHidden : ''}
              onClick={() => toggleLayer(layer.id)}
            >
              {layer.title}
            </button>
          ))}
        </div>
        {selectedEdge ? (
          <div className={styles.edgeInspector}>
            <div>
              <span className={styles.inspectorLabel}>Selected edge</span>
              <strong>{selectedEdge.label || relationLabel(selectedEdge.connection_state)}</strong>
              <code>
                edge_id={selectedEdge.id} | state={selectedEdge.connection_state} | source_port={selectedEdge.source_port} | target_port={selectedEdge.target_port || 'loose'}
              </code>
            </div>
            <div className={styles.edgeInspectorGrid}>
              <label>
                <span>Relation</span>
                <select value={relationType} onChange={(event) => setRelationType(event.target.value)} disabled={busy || selectedEdge.connection_state === 'incomplete'}>
                  {RELATION_TYPES.map((type) => <option key={type} value={type}>{relationLabel(type)}</option>)}
                </select>
              </label>
              <label>
                <span>Layer</span>
                <select value={relationLayerId} onChange={(event) => setRelationLayerId(event.target.value)} disabled={busy}>
                  {relationLayers.map((layer) => <option key={layer.id} value={layer.id}>{layer.title}</option>)}
                </select>
              </label>
              <label>
                <span>Label</span>
                <input value={edgeLabel} onChange={(event) => setEdgeLabel(event.target.value)} placeholder="Optional edge label" disabled={busy} />
              </label>
            </div>
            <div className={styles.edgeInspectorActions}>
              <button type="button" onClick={submitBindRelation} disabled={busy || selectedEdge.connection_state === 'incomplete'}>
                <GitBranch size={13} />
                Bind relation
              </button>
              <button type="button" onClick={() => onUnbindEdgeRelation(selectedEdge.id)} disabled={busy || !selectedEdge.object_relation_id}>
                <Unlink size={13} />
                Unbind
              </button>
              <button type="button" onClick={() => onArchiveEdge(selectedEdge.id)} disabled={busy}>
                <Archive size={13} />
                Archive edge
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <span className={styles.inspectorLabel}>Selected object scope</span>
              {selectedNode ? (
                <strong>{selectedNode.title}</strong>
              ) : (
                <strong>No node selected</strong>
              )}
            </div>
            {selectedNode ? (
              <code>
                canvas_id={detail.canvas.id} | canvas_node_id={selectedNode.id} | target_type={selectedNode.node_type} | target_id={selectedNode.target_id}
              </code>
            ) : (
              <code>Select a node or edge to expose stable ids for future AI commands.</code>
            )}
          </>
        )}
      </div>
    </div>
  );
}
