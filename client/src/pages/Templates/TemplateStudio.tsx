import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileCode2,
  GitBranch,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import api from '@/services/api';
import type { RuntimeTemplateDefinition } from '@/services/templateOptions';
import { useUIStore } from '@/stores/uiStore';
import styles from './TemplateStudio.module.css';

type TemplateFieldKind = 'text' | 'textarea' | 'latex' | 'code' | 'checkbox' | 'list';
type PreviewTab = 'reading' | 'editing' | 'debug' | 'proposal';
type MigrationMode = 'alias_mapping' | 'soft_migration' | 'hard_cascade';
type DomainRefinementAction = 'rename' | 'promote' | 'split' | 'merge' | 'fork' | 'deprecate' | 'reclassify';

interface TemplateUsage {
  total_blocks: number;
  runtime_reference_count: number;
  key_version_reference_count: number;
  legacy_template_id_count: number;
}

interface PackageManifest {
  id: string;
  package_key: string;
  version: string;
  package_name: string;
  description?: string | null;
  validation_status: 'valid' | 'warning' | 'blocked';
  status: string;
  is_system: boolean;
}

interface DomainBlockSet {
  id: string;
  package_manifest_id?: string | null;
  domain_key: string;
  label: string;
  description?: string | null;
  domain_kind: string;
  template_count: number;
  composition_count: number;
  status: string;
}

interface PackagePreview {
  validation_status: 'valid' | 'warning' | 'blocked';
  domain_sets: DomainBlockSet[];
  template_count: number;
  composition_count: number;
  warnings: string[];
  blockers: string[];
}

type PackageLevel = 'light' | 'trusted';
type SourceInclusion = 'omit' | 'reference_only' | 'snapshot_text';

interface PackageBundleSummary {
  package_key: string;
  package_version: string;
  package_level: PackageLevel;
  source_inclusion: SourceInclusion;
  template_count: number;
  composition_count: number;
  domain_set_count: number;
  source_reference_count: number;
  source_snapshot_count: number;
}

interface PackageExportPreview {
  bundle: Record<string, unknown>;
  summary: PackageBundleSummary;
  warnings: string[];
  blockers: string[];
  validation_status: 'valid' | 'warning' | 'blocked';
}

interface PackageExportRecord extends PackageExportPreview {
  id: string;
  status: string;
  bundle_hash: string;
}

interface PackageImportItem {
  object_type: string;
  object_key: string;
  object_version: string;
  action: 'imported' | 'resolved_existing' | 'skipped' | 'blocked' | 'recovery_only';
  warnings?: string[];
  blockers?: string[];
}

interface PackageImportPreview {
  id: string;
  status: string;
  validation_status: 'valid' | 'warning' | 'blocked';
  bundle_hash: string;
  summary: PackageBundleSummary;
  warnings: string[];
  blockers: string[];
  conflict_report: { items: PackageImportItem[] };
  recovery_report: Record<string, unknown>;
}

interface TemplateMigrationProposal {
  id: string;
  type: 'template_migration';
  status: string;
  data: {
    migration_mode: MigrationMode;
    source_template: Record<string, unknown>;
    target_template: Record<string, unknown>;
    diff: Array<{ field: string; before: unknown; after: unknown }>;
    affected_object_count: number;
    samples: Array<Record<string, unknown>>;
    warnings: string[];
    blockers: string[];
    apply_behavior: string;
  };
}

interface DomainRefinementProposal {
  id: string;
  type: 'domain_refinement';
  status: string;
  data: {
    refinement_action: DomainRefinementAction;
    migration_mode: MigrationMode;
    source_domain: Record<string, unknown>;
    target_domain: Record<string, unknown> | null;
    domain_diff: Array<{ field: string; before: unknown; after: unknown }>;
    package_impact: { affected_package_count: number; note?: string };
    affected_counts: {
      domains: number;
      templates: number;
      compositions: number;
      note_blocks: number;
      packages: number;
    };
    samples: Array<Record<string, unknown>>;
    warnings: string[];
    blockers: string[];
    apply_behavior: string;
  };
}

interface DomainRefinementRecord {
  id: string;
  refinement_action: DomainRefinementAction;
  migration_mode: MigrationMode;
  mapping_count: number;
  classification_count: number;
  status: string;
  created_at: string;
}

interface TemplateField {
  key: string;
  label: string;
  kind: TemplateFieldKind;
  required?: boolean;
}

interface TemplateForm {
  template_key: string;
  label: string;
  description: string;
  system_type: string;
  learning_role: string;
  legacy_block_type: string;
  field_schema: TemplateField[];
  source_policy: string;
  relation_preset: string;
  proposal_preset: string;
  render_intent: string;
  summary_for_agent: string;
}

const SYSTEM_TYPES = ['text', 'latex', 'code', 'source_quote', 'task', 'media', 'table'];
const LEARNING_ROLES = ['note', 'concept', 'definition', 'theorem', 'proof', 'formula', 'example', 'exercise', 'answer', 'warning', 'source'];
const LEGACY_TYPES = ['heading', 'paragraph', 'definition', 'theorem', 'proof', 'formula', 'example', 'exercise', 'answer', 'sidenote'];
const FIELD_KINDS: TemplateFieldKind[] = ['text', 'textarea', 'latex', 'code', 'checkbox', 'list'];
const SOURCE_POLICIES = ['forbidden', 'allowed', 'recommended', 'required', 'source_is_content'];
const RELATION_PRESETS = ['none', 'basic_support', 'learning_logic', 'source_evidence'];
const PROPOSAL_PRESETS = ['manual_only', 'ai_allowed_with_review', 'migration_requires_proposal'];
const RENDER_INTENTS = ['paragraph', 'heading', 'definition', 'theorem', 'proof', 'formula', 'example', 'exercise', 'answer', 'quote', 'callout', 'code'];
const DOMAIN_REFINEMENT_ACTIONS: DomainRefinementAction[] = ['rename', 'promote', 'split', 'merge', 'fork', 'deprecate', 'reclassify'];

function fieldSchemaFromTemplate(template: RuntimeTemplateDefinition | null): TemplateField[] {
  const fields = template?.field_schema || [];
  if (!Array.isArray(fields) || fields.length === 0) {
    return [{ key: 'body', label: 'Body', kind: 'textarea', required: true }];
  }
  return fields.slice(0, 8).map((field) => ({
    key: typeof field.key === 'string' ? field.key : 'body',
    label: typeof field.label === 'string' ? field.label : 'Body',
    kind: FIELD_KINDS.includes(field.kind as TemplateFieldKind) ? field.kind as TemplateFieldKind : 'textarea',
    required: Boolean(field.required),
  }));
}

function formFromTemplate(template: RuntimeTemplateDefinition | null): TemplateForm {
  return {
    template_key: template?.template_key || 'custom.template',
    label: template?.label || 'New Template',
    description: template?.description || '',
    system_type: template?.system_type || 'text',
    learning_role: template?.learning_role || 'note',
    legacy_block_type: template?.legacy_block_type || 'paragraph',
    field_schema: fieldSchemaFromTemplate(template),
    source_policy: String(template?.source_behavior?.source_reference_policy || 'allowed'),
    relation_preset: String(template?.relation_behavior?.relation_preset || 'none'),
    proposal_preset: String(template?.proposal_behavior?.proposal_preset || 'manual_only'),
    render_intent: String((template?.render_hints?.reading as any)?.intent || template?.legacy_block_type || 'paragraph'),
    summary_for_agent: template?.summary_for_agent || '',
  };
}

function templateStatusLabel(template: RuntimeTemplateDefinition): string {
  return `${template.is_system ? 'System' : 'User'} / ${template.status}`;
}

export default function TemplateStudioPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [templates, setTemplates] = useState<RuntimeTemplateDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(() => formFromTemplate(null));
  const [usage, setUsage] = useState<TemplateUsage | null>(null);
  const [query, setQuery] = useState('');
  const [systemFilter, setSystemFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [previewTab, setPreviewTab] = useState<PreviewTab>('reading');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [packageManifests, setPackageManifests] = useState<PackageManifest[]>([]);
  const [domainSets, setDomainSets] = useState<DomainBlockSet[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [packagePreview, setPackagePreview] = useState<PackagePreview | null>(null);
  const [domainLoading, setDomainLoading] = useState(true);
  const [packageLevel, setPackageLevel] = useState<PackageLevel>('light');
  const [sourceInclusion, setSourceInclusion] = useState<SourceInclusion>('omit');
  const [exportPreview, setExportPreview] = useState<PackageExportPreview | null>(null);
  const [exportRecord, setExportRecord] = useState<PackageExportRecord | null>(null);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<PackageImportPreview | null>(null);
  const [packageBusy, setPackageBusy] = useState(false);
  const [migrationMode, setMigrationMode] = useState<MigrationMode>('alias_mapping');
  const [migrationTargetId, setMigrationTargetId] = useState<string>('');
  const [migrationProposal, setMigrationProposal] = useState<TemplateMigrationProposal | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [domainRefinementAction, setDomainRefinementAction] = useState<DomainRefinementAction>('promote');
  const [domainMigrationMode, setDomainMigrationMode] = useState<MigrationMode>('alias_mapping');
  const [domainTargetId, setDomainTargetId] = useState<string>('');
  const [domainTargetKey, setDomainTargetKey] = useState('learning.calculus.basic');
  const [domainTargetLabel, setDomainTargetLabel] = useState('Basic Calculus Learning');
  const [includeSelectedTemplateClassification, setIncludeSelectedTemplateClassification] = useState(false);
  const [domainRefinementProposal, setDomainRefinementProposal] = useState<DomainRefinementProposal | null>(null);
  const [domainRefinementRecords, setDomainRefinementRecords] = useState<DomainRefinementRecord[]>([]);
  const [domainRefinementBusy, setDomainRefinementBusy] = useState(false);

  const selectedTemplate = templates.find((template) => template.id === selectedId) || null;
  const selectedPackage = packageManifests.find((manifest) => manifest.id === selectedPackageId) || null;
  const selectedDomain = domainSets.find((domain) => domain.id === selectedDomainId) || domainSets[0] || null;
  const isSystem = Boolean(selectedTemplate?.is_system);
  const isDraftUserTemplate = Boolean(selectedTemplate && !selectedTemplate.is_system && selectedTemplate.status === 'draft');
  const canSafeEdit = Boolean(selectedTemplate && !selectedTemplate.is_system);
  const migrationTargets = useMemo(
    () => templates.filter((template) => template.id !== selectedId && template.status !== 'archived'),
    [selectedId, templates],
  );
  const domainTargets = useMemo(
    () => domainSets.filter((domain) => domain.id !== selectedDomain?.id && domain.status !== 'archived'),
    [domainSets, selectedDomain?.id],
  );

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return templates.filter((template) => {
      if (normalizedQuery && !`${template.template_key} ${template.label} ${template.description || ''}`.toLowerCase().includes(normalizedQuery)) return false;
      if (systemFilter === 'system' && !template.is_system) return false;
      if (systemFilter === 'user' && template.is_system) return false;
      if (statusFilter !== 'all' && template.status !== statusFilter) return false;
      if (roleFilter !== 'all' && template.learning_role !== roleFilter) return false;
      return true;
    });
  }, [query, roleFilter, statusFilter, systemFilter, templates]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      await api.post('/templates/seed-system');
      const res = await api.get('/templates');
      const nextTemplates = Array.isArray(res.data) ? res.data as RuntimeTemplateDefinition[] : [];
      setTemplates(nextTemplates);
      const nextSelected = selectedId && nextTemplates.some((template) => template.id === selectedId)
        ? selectedId
        : nextTemplates[0]?.id || null;
      setSelectedId(nextSelected);
      const selected = nextTemplates.find((template) => template.id === nextSelected) || null;
      setForm(formFromTemplate(selected));
    } catch (err) {
      console.error('Failed to load templates:', err);
      addToast('error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async (templateId: string | null) => {
    if (!templateId) {
      setUsage(null);
      return;
    }
    try {
      const res = await api.get(`/templates/${templateId}/usage`);
      setUsage(res.data);
    } catch (err) {
      console.error('Failed to load template usage:', err);
      setUsage(null);
    }
  };

  const previewPackage = async (packageId: string | null) => {
    if (!packageId) {
      setPackagePreview(null);
      return;
    }
    try {
      const res = await api.get(`/package-manifests/${packageId}/preview`);
      setPackagePreview(res.data);
    } catch (err) {
      console.error('Failed to preview package:', err);
      addToast('error', 'Failed to preview package');
      setPackagePreview(null);
    }
  };

  const loadDomainPackages = async () => {
    setDomainLoading(true);
    try {
      await api.post('/package-manifests/seed-system');
      const [packagesRes, domainsRes] = await Promise.all([
        api.get('/package-manifests'),
        api.get('/domain-block-sets'),
      ]);
      const packages = Array.isArray(packagesRes.data) ? packagesRes.data as PackageManifest[] : [];
      const domains = Array.isArray(domainsRes.data) ? domainsRes.data as DomainBlockSet[] : [];
      const nextSelected = selectedPackageId && packages.some((manifest) => manifest.id === selectedPackageId)
        ? selectedPackageId
        : packages[0]?.id || null;
      const nextDomain = selectedDomainId && domains.some((domain) => domain.id === selectedDomainId)
        ? selectedDomainId
        : domains[0]?.id || null;
      setPackageManifests(packages);
      setDomainSets(domains);
      setSelectedPackageId(nextSelected);
      setSelectedDomainId(nextDomain);
      await previewPackage(nextSelected);
    } catch (err) {
      console.error('Failed to load domain packages:', err);
      addToast('error', 'Failed to load domain packages');
    } finally {
      setDomainLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadTemplates(), loadDomainPackages()]);
  };

  useEffect(() => {
    loadTemplates();
    loadDomainPackages();
  }, []);

  useEffect(() => {
    const template = templates.find((item) => item.id === selectedId) || null;
    setForm(formFromTemplate(template));
    loadUsage(template?.id || null);
    setMigrationProposal(null);
  }, [selectedId, templates]);

  useEffect(() => {
    if (!selectedDomainId && domainSets[0]) {
      setSelectedDomainId(domainSets[0].id);
    }
  }, [domainSets, selectedDomainId]);

  useEffect(() => {
    if (!migrationTargetId || !migrationTargets.some((template) => template.id === migrationTargetId)) {
      setMigrationTargetId(migrationTargets[0]?.id || '');
    }
  }, [migrationTargetId, migrationTargets]);

  useEffect(() => {
    if (domainTargetId && !domainTargets.some((domain) => domain.id === domainTargetId)) {
      setDomainTargetId('');
    }
    setDomainRefinementProposal(null);
    loadDomainRefinementRecords(selectedDomain?.id || null);
  }, [domainTargets, domainTargetId, selectedDomain?.id]);

  const refreshSelected = async (templateId: string) => {
    const res = await api.get(`/templates/${templateId}`);
    setTemplates((current) => current.map((template) => template.id === templateId ? res.data : template));
    setSelectedId(templateId);
    await loadUsage(templateId);
  };

  const createDraft = async () => {
    setBusy(true);
    try {
      const res = await api.post('/templates', {
        template_key: `custom.template_${Date.now()}`,
        label: 'New Template Draft',
        description: '',
        system_type: 'text',
        learning_role: 'note',
        legacy_block_type: 'paragraph',
        field_schema: [{ key: 'body', label: 'Body', kind: 'textarea', required: true }],
        default_content: { body: '' },
        summary_for_agent: 'Use this draft only after Henry reviews its role and fields.',
      });
      await loadTemplates();
      setSelectedId(res.data.id);
      addToast('success', 'Draft template created');
    } catch (err: any) {
      console.error('Failed to create template:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create template');
    } finally {
      setBusy(false);
    }
  };

  const copyTemplate = async () => {
    if (!selectedTemplate) return;
    setBusy(true);
    try {
      const keyBase = selectedTemplate.template_key.replace(/[^a-z0-9_.-]/g, '').replace(/\.+$/, '');
      const res = await api.post(`/templates/${selectedTemplate.id}/copy`, {
        template_key: `${keyBase}.user_${Date.now()}`,
        label: `${selectedTemplate.label} Copy`,
      });
      await loadTemplates();
      setSelectedId(res.data.id);
      addToast('success', 'Template copied to draft');
    } catch (err: any) {
      console.error('Failed to copy template:', err);
      addToast('error', err?.response?.data?.error || 'Failed to copy template');
    } finally {
      setBusy(false);
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate || !canSafeEdit) return;
    setBusy(true);
    try {
      const payload = {
        template_key: form.template_key,
        label: form.label,
        description: form.description,
        system_type: form.system_type,
        learning_role: form.learning_role,
        legacy_block_type: form.legacy_block_type,
        field_schema: form.field_schema,
        default_content: Object.fromEntries(form.field_schema.map((field) => [field.key, field.kind === 'list' ? [] : ''])),
        source_behavior: { source_reference_policy: form.source_policy },
        relation_behavior: { relation_preset: form.relation_preset },
        proposal_behavior: { proposal_preset: form.proposal_preset },
        render_hints: {
          reading: { intent: form.render_intent },
          editing: { intent: form.render_intent },
          canvas: { intent: form.render_intent },
          debug: { intent: form.render_intent },
          proposal: { intent: form.render_intent },
        },
        summary_for_agent: form.summary_for_agent,
      };
      await api.put(`/templates/${selectedTemplate.id}`, payload);
      await refreshSelected(selectedTemplate.id);
      addToast('success', 'Template saved');
    } catch (err: any) {
      console.error('Failed to save template:', err);
      const message = err?.response?.data?.error || 'Failed to save template';
      addToast('error', message);
    } finally {
      setBusy(false);
    }
  };

  const lifecycle = async (action: 'activate' | 'deprecate' | 'archive' | 'restore') => {
    if (!selectedTemplate) return;
    setBusy(true);
    try {
      await api.post(`/templates/${selectedTemplate.id}/${action}`);
      await refreshSelected(selectedTemplate.id);
      addToast('success', `Template ${action}d`);
    } catch (err: any) {
      console.error(`Failed to ${action} template:`, err);
      addToast('error', err?.response?.data?.error || `Failed to ${action} template`);
    } finally {
      setBusy(false);
    }
  };

  const createMigrationProposal = async () => {
    if (!selectedTemplate || !migrationTargetId) return;
    setMigrationBusy(true);
    try {
      const res = await api.post('/proposals/template-migration', {
        source_template_id: selectedTemplate.id,
        target_template_id: migrationTargetId,
        migration_mode: migrationMode,
        reason: 'Template Studio structural edit requires proposal-first migration.',
      });
      setMigrationProposal(res.data);
      addToast('success', 'Migration proposal created');
    } catch (err: any) {
      console.error('Failed to create migration proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create migration proposal');
    } finally {
      setMigrationBusy(false);
    }
  };

  const applyMigrationProposal = async () => {
    if (!migrationProposal) return;
    setMigrationBusy(true);
    try {
      await api.post(`/proposals/${migrationProposal.id}/apply`);
      addToast('success', 'Migration proposal applied');
      setMigrationProposal(null);
      await loadTemplates();
      if (selectedTemplate) await loadUsage(selectedTemplate.id);
    } catch (err: any) {
      console.error('Failed to apply migration proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to apply migration proposal');
    } finally {
      setMigrationBusy(false);
    }
  };

  const discardMigrationProposal = async () => {
    if (!migrationProposal) return;
    setMigrationBusy(true);
    try {
      await api.post(`/proposals/${migrationProposal.id}/discard`);
      addToast('success', 'Migration proposal discarded');
      setMigrationProposal(null);
    } catch (err: any) {
      console.error('Failed to discard migration proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to discard migration proposal');
    } finally {
      setMigrationBusy(false);
    }
  };

  const loadDomainRefinementRecords = async (domainId: string | null) => {
    if (!domainId) {
      setDomainRefinementRecords([]);
      return;
    }
    try {
      const res = await api.get(`/domain-refinements/records?source_domain_id=${domainId}`);
      setDomainRefinementRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load domain refinement records:', err);
      setDomainRefinementRecords([]);
    }
  };

  const createDomainRefinementProposal = async () => {
    if (!selectedDomain) return;
    setDomainRefinementBusy(true);
    try {
      const payload: Record<string, unknown> = {
        source_domain_id: selectedDomain.id,
        refinement_action: domainRefinementAction,
        migration_mode: domainMigrationMode,
        reason: 'Template Studio domain refinement preview.',
      };
      if (domainTargetId) {
        payload.target_domain_id = domainTargetId;
      } else if (domainRefinementAction !== 'deprecate') {
        payload.target_domain_patch = {
          domain_key: domainTargetKey || `${selectedDomain.domain_key}.refined`,
          label: domainTargetLabel || `${selectedDomain.label} Refined`,
          domain_kind: selectedDomain.domain_kind,
        };
      }
      if (includeSelectedTemplateClassification && selectedTemplate) {
        payload.object_reclassifications = [{
          target_type: 'template_definition',
          target_id: selectedTemplate.id,
          classification_role: 'candidate',
        }];
      }
      const res = await api.post('/proposals/domain-refinement', payload);
      setDomainRefinementProposal(res.data);
      addToast('success', 'Domain refinement proposal created');
    } catch (err: any) {
      console.error('Failed to create domain refinement proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to create domain refinement proposal');
    } finally {
      setDomainRefinementBusy(false);
    }
  };

  const applyDomainRefinementProposal = async () => {
    if (!domainRefinementProposal) return;
    setDomainRefinementBusy(true);
    try {
      await api.post(`/proposals/${domainRefinementProposal.id}/apply`);
      addToast('success', 'Domain refinement proposal applied');
      setDomainRefinementProposal(null);
      await Promise.all([loadDomainPackages(), loadDomainRefinementRecords(selectedDomain?.id || null)]);
    } catch (err: any) {
      console.error('Failed to apply domain refinement proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to apply domain refinement proposal');
    } finally {
      setDomainRefinementBusy(false);
    }
  };

  const discardDomainRefinementProposal = async () => {
    if (!domainRefinementProposal) return;
    setDomainRefinementBusy(true);
    try {
      await api.post(`/proposals/${domainRefinementProposal.id}/discard`);
      addToast('success', 'Domain refinement proposal discarded');
      setDomainRefinementProposal(null);
    } catch (err: any) {
      console.error('Failed to discard domain refinement proposal:', err);
      addToast('error', err?.response?.data?.error || 'Failed to discard domain refinement proposal');
    } finally {
      setDomainRefinementBusy(false);
    }
  };

  const packagePayload = () => ({
    package_manifest_id: selectedPackageId,
    package_level: packageLevel,
    source_inclusion: sourceInclusion,
  });

  const createPackageExportPreview = async () => {
    if (!selectedPackageId) return;
    setPackageBusy(true);
    try {
      const res = await api.post('/package-exports/preview', packagePayload());
      setExportPreview(res.data);
      setExportRecord(null);
      addToast('success', 'Package export preview created');
    } catch (err: any) {
      console.error('Failed to preview package export:', err);
      addToast('error', err?.response?.data?.error || 'Failed to preview package export');
    } finally {
      setPackageBusy(false);
    }
  };

  const createPackageExportRecord = async () => {
    if (!selectedPackageId) return;
    setPackageBusy(true);
    try {
      const res = await api.post('/package-exports', packagePayload());
      setExportRecord(res.data);
      setExportPreview(res.data);
      setImportText(JSON.stringify(res.data.bundle, null, 2));
      addToast('success', 'Package JSON bundle created');
    } catch (err: any) {
      console.error('Failed to export package:', err);
      addToast('error', err?.response?.data?.error || 'Failed to export package');
    } finally {
      setPackageBusy(false);
    }
  };

  const downloadPackageBundle = () => {
    const bundle = exportRecord?.bundle || exportPreview?.bundle;
    if (!bundle) return;
    const manifest = (bundle as any).manifest || {};
    const packageKey = String(manifest.package_key || 'coincides-package').replace(/[^a-z0-9_.-]/gi, '-');
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${packageKey}.coincides.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const previewPackageImport = async () => {
    if (!importText.trim()) return;
    setPackageBusy(true);
    try {
      const bundle = JSON.parse(importText);
      const res = await api.post('/package-imports/preview', { bundle });
      setImportPreview(res.data);
      addToast('success', 'Package import preview created');
    } catch (err: any) {
      console.error('Failed to preview package import:', err);
      addToast('error', err?.response?.data?.error || err?.message || 'Failed to preview package import');
    } finally {
      setPackageBusy(false);
    }
  };

  const applyPackageImportPreview = async () => {
    if (!importPreview) return;
    setPackageBusy(true);
    try {
      await api.post(`/package-imports/${importPreview.id}/apply`);
      addToast('success', 'Package import applied');
      setImportPreview(null);
      await loadDomainPackages();
      await loadTemplates();
    } catch (err: any) {
      console.error('Failed to apply package import:', err);
      addToast('error', err?.response?.data?.error || 'Failed to apply package import');
    } finally {
      setPackageBusy(false);
    }
  };

  const discardPackageImport = async () => {
    if (!importPreview) return;
    setPackageBusy(true);
    try {
      const res = await api.post(`/package-imports/${importPreview.id}/discard`);
      setImportPreview(res.data);
      addToast('success', 'Package import preview discarded');
    } catch (err: any) {
      console.error('Failed to discard package import:', err);
      addToast('error', err?.response?.data?.error || 'Failed to discard package import');
    } finally {
      setPackageBusy(false);
    }
  };

  const loadPackageFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    setImportPreview(null);
  };

  const updateField = (index: number, patch: Partial<TemplateField>) => {
    setForm((current) => ({
      ...current,
      field_schema: current.field_schema.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field),
    }));
  };

  const addField = () => {
    if (form.field_schema.length >= 8) return;
    setForm((current) => ({
      ...current,
      field_schema: [
        ...current.field_schema,
        { key: `field_${current.field_schema.length + 1}`, label: `Field ${current.field_schema.length + 1}`, kind: 'textarea', required: false },
      ],
    }));
  };

  const removeField = (index: number) => {
    if (form.field_schema.length <= 1) return;
    setForm((current) => ({
      ...current,
      field_schema: current.field_schema.filter((_, fieldIndex) => fieldIndex !== index),
    }));
  };

  const structuralLocked = Boolean(selectedTemplate && selectedTemplate.status !== 'draft');
  const compatibilityWarning = selectedTemplate?.status === 'active' && usage && usage.total_blocks > 0
    ? 'This active template already has NoteBlocks. Structural edits require a future migration proposal.'
    : selectedTemplate?.is_system
      ? 'System templates are read-only. Copy one before editing.'
      : selectedTemplate?.status === 'deprecated'
        ? 'Deprecated templates stay resolvable for old NoteBlocks but should not be used for new content.'
        : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>v2.5 Template Runtime</p>
          <h1>Template Studio</h1>
          <p>View, copy, edit, preview, and manage TemplateDefinitions without crowding Course or Canvas work.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={refreshAll} disabled={busy || loading || domainLoading}>
            <RefreshCcw size={16} />
            Refresh
          </button>
          <button type="button" onClick={createDraft} disabled={busy}>
            <Plus size={16} />
            New draft
          </button>
        </div>
      </header>

      <section className={styles.domainPackagePanel}>
        <div className={styles.domainPackageHeader}>
          <div>
            <p className={styles.eyebrow}>v2.5.3 Domain Packages</p>
            <h2>Domain Packages</h2>
            <p>Packages organize templates and compositions as safe data. This is a preview surface, not Package Studio.</p>
          </div>
          <button type="button" onClick={loadDomainPackages} disabled={domainLoading}>
            <Boxes size={15} />
            Seed / refresh
          </button>
        </div>

        <div className={styles.domainPackageGrid}>
          <div className={styles.packageList}>
            {packageManifests.map((manifest) => (
              <button
                key={manifest.id}
                type="button"
                className={`${styles.packageRow} ${manifest.id === selectedPackageId ? styles.packageRowActive : ''}`}
                onClick={() => {
                  setSelectedPackageId(manifest.id);
                  previewPackage(manifest.id);
                }}
              >
                <span>{manifest.package_name}</span>
                <small>{manifest.package_key} / v{manifest.version}</small>
                <em>{manifest.validation_status} / {manifest.status}</em>
              </button>
            ))}
            {packageManifests.length === 0 && <div className={styles.emptyInline}>No packages loaded.</div>}
          </div>

          <div className={styles.domainSetList}>
            <div className={styles.miniPanelHeader}>
              <ShieldCheck size={15} />
              <span>{selectedPackage ? selectedPackage.package_name : 'Package preview'}</span>
            </div>
            <div className={styles.previewStats}>
              <strong>{packagePreview?.domain_sets.length ?? 0}</strong>
              <span>domain sets</span>
              <strong>{packagePreview?.template_count ?? 0}</strong>
              <span>templates</span>
              <strong>{packagePreview?.composition_count ?? 0}</strong>
              <span>compositions</span>
            </div>
            {(packagePreview?.blockers || []).map((blocker) => (
              <div key={blocker} className={styles.blockerLine}>
                <AlertTriangle size={14} />
                {blocker}
              </div>
            ))}
            {(packagePreview?.warnings || []).map((warning) => (
              <div key={warning} className={styles.warningLine}>
                <AlertTriangle size={14} />
                {warning}
              </div>
            ))}
          </div>

          <div className={styles.domainSetList}>
            <div className={styles.miniPanelHeader}>
              <Boxes size={15} />
              <span>Domain sets</span>
            </div>
            <div className={styles.domainRows}>
              {domainSets.map((domain) => (
                <div key={domain.id} className={styles.domainRow}>
                  <strong>{domain.label}</strong>
                  <span>{domain.domain_key}</span>
                  <small>{domain.template_count} templates / {domain.composition_count} compositions</small>
                </div>
              ))}
              {domainSets.length === 0 && <div className={styles.emptyInline}>No domain sets loaded.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.packageStudioPanel}>
        <div className={styles.domainPackageHeader}>
          <div>
            <p className={styles.eyebrow}>v2.5.6 Domain Refinement</p>
            <h2>Domain Refinement</h2>
            <p>Rename, promote, fork, split, merge, deprecate, or reclassify a domain through proposal-first migration records.</p>
          </div>
        </div>

        <div className={styles.packageStudioGrid}>
          <div className={styles.packageToolPanel}>
            <div className={styles.miniPanelHeader}>
              <GitBranch size={15} />
              <span>Refinement input</span>
            </div>
            <label>
              <span>Source domain</span>
              <select value={selectedDomain?.id || ''} onChange={(event) => {
                setSelectedDomainId(event.target.value || null);
                setDomainRefinementProposal(null);
              }}>
                {domainSets.map((domain) => (
                  <option key={domain.id} value={domain.id}>{domain.label} / {domain.domain_key}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Action</span>
              <select value={domainRefinementAction} onChange={(event) => setDomainRefinementAction(event.target.value as DomainRefinementAction)}>
                {DOMAIN_REFINEMENT_ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}
              </select>
            </label>
            <label>
              <span>Migration mode</span>
              <select value={domainMigrationMode} onChange={(event) => setDomainMigrationMode(event.target.value as MigrationMode)}>
                <option value="alias_mapping">Alias mapping</option>
                <option value="soft_migration">Soft migration</option>
                <option value="hard_cascade">Hard cascade</option>
              </select>
            </label>
            <label>
              <span>Existing target domain</span>
              <select value={domainTargetId} onChange={(event) => setDomainTargetId(event.target.value)}>
                <option value="">Create preview target</option>
                {domainTargets.map((domain) => (
                  <option key={domain.id} value={domain.id}>{domain.label} / {domain.domain_key}</option>
                ))}
              </select>
            </label>
            {!domainTargetId && domainRefinementAction !== 'deprecate' && (
              <>
                <label>
                  <span>Target domain key</span>
                  <input value={domainTargetKey} onChange={(event) => setDomainTargetKey(event.target.value)} />
                </label>
                <label>
                  <span>Target label</span>
                  <input value={domainTargetLabel} onChange={(event) => setDomainTargetLabel(event.target.value)} />
                </label>
              </>
            )}
            <label className={styles.inlineCheck}>
              <input
                type="checkbox"
                checked={includeSelectedTemplateClassification}
                onChange={(event) => setIncludeSelectedTemplateClassification(event.target.checked)}
                disabled={!selectedTemplate}
              />
              <span>Include selected template as classification sample</span>
            </label>
            <div className={styles.packageActionRow}>
              <button type="button" onClick={createDomainRefinementProposal} disabled={domainRefinementBusy || !selectedDomain}>
                Preview refinement
              </button>
              <button type="button" onClick={applyDomainRefinementProposal} disabled={domainRefinementBusy || !domainRefinementProposal || domainRefinementProposal.data.blockers.length > 0}>
                Apply
              </button>
              <button type="button" onClick={discardDomainRefinementProposal} disabled={domainRefinementBusy || !domainRefinementProposal}>
                Discard
              </button>
            </div>
          </div>

          <div className={styles.packageToolPanel}>
            <div className={styles.miniPanelHeader}>
              <Eye size={15} />
              <span>Impact preview</span>
            </div>
            {domainRefinementProposal ? (
              <div className={styles.packageResult}>
                <strong>{domainRefinementProposal.data.refinement_action} / {domainRefinementProposal.data.migration_mode}</strong>
                <span>
                  {domainRefinementProposal.data.affected_counts.templates} templates /
                  {' '}{domainRefinementProposal.data.affected_counts.compositions} compositions /
                  {' '}{domainRefinementProposal.data.affected_counts.note_blocks} blocks
                </span>
                <small>{domainRefinementProposal.data.package_impact.affected_package_count} affected packages</small>
                <div className={styles.importItems}>
                  {domainRefinementProposal.data.domain_diff.slice(0, 8).map((entry) => (
                    <div key={entry.field}>
                      <b>{entry.field}</b>
                      <span>{String(entry.before ?? 'none')} {'->'} {String(entry.after ?? 'none')}</span>
                    </div>
                  ))}
                </div>
                {domainRefinementProposal.data.blockers.map((blocker) => <div key={blocker} className={styles.blockerLine}><AlertTriangle size={14} />{blocker}</div>)}
                {domainRefinementProposal.data.warnings.map((warning) => <div key={warning} className={styles.warningLine}><AlertTriangle size={14} />{warning}</div>)}
              </div>
            ) : (
              <div className={styles.emptyInline}>No domain refinement preview yet.</div>
            )}
          </div>

          <div className={styles.packageToolPanel}>
            <div className={styles.miniPanelHeader}>
              <ShieldCheck size={15} />
              <span>Recent refinement records</span>
            </div>
            {domainRefinementRecords.length > 0 ? (
              <div className={styles.importItems}>
                {domainRefinementRecords.slice(0, 10).map((record) => (
                  <div key={record.id}>
                    <b>{record.refinement_action} / {record.migration_mode}</b>
                    <span>{record.mapping_count} mappings / {record.classification_count} classifications</span>
                    <small>{record.status}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyInline}>No records for the selected domain yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.packageStudioPanel}>
        <div className={styles.domainPackageHeader}>
          <div>
            <p className={styles.eyebrow}>v2.5.5 Package Studio Lite</p>
            <h2>.coincides Export / Import</h2>
            <p>JSON bundles are preview-first. Imports never overwrite existing runtime objects.</p>
          </div>
        </div>

        <div className={styles.packageStudioGrid}>
          <div className={styles.packageToolPanel}>
            <div className={styles.miniPanelHeader}>
              <Download size={15} />
              <span>Export package</span>
            </div>
            <label>
              <span>Package</span>
              <select value={selectedPackageId || ''} onChange={(event) => {
                const nextId = event.target.value || null;
                setSelectedPackageId(nextId);
                setExportPreview(null);
                setExportRecord(null);
                previewPackage(nextId);
              }}>
                {packageManifests.map((manifest) => (
                  <option key={manifest.id} value={manifest.id}>{manifest.package_name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Package level</span>
              <select value={packageLevel} onChange={(event) => {
                const nextLevel = event.target.value as PackageLevel;
                setPackageLevel(nextLevel);
                if (nextLevel === 'light') setSourceInclusion('omit');
              }}>
                <option value="light">Light</option>
                <option value="trusted">Trusted</option>
              </select>
            </label>
            <label>
              <span>Source inclusion</span>
              <select value={sourceInclusion} onChange={(event) => setSourceInclusion(event.target.value as SourceInclusion)} disabled={packageLevel === 'light'}>
                <option value="omit">Omit</option>
                <option value="reference_only">Reference only</option>
                <option value="snapshot_text">Snapshot text</option>
              </select>
            </label>
            <div className={styles.packageActionRow}>
              <button type="button" onClick={createPackageExportPreview} disabled={packageBusy || !selectedPackageId}>
                Preview
              </button>
              <button type="button" onClick={createPackageExportRecord} disabled={packageBusy || !selectedPackageId || exportPreview?.validation_status === 'blocked'}>
                Export
              </button>
              <button type="button" onClick={downloadPackageBundle} disabled={!exportPreview && !exportRecord}>
                Download
              </button>
            </div>

            {exportPreview && (
              <div className={styles.packageResult}>
                <strong>{exportPreview.summary.package_key} / {exportPreview.summary.package_level}</strong>
                <span>{exportPreview.summary.template_count} templates / {exportPreview.summary.composition_count} compositions / {exportPreview.summary.domain_set_count} domains</span>
                <small>{exportRecord?.bundle_hash || (exportPreview.bundle as any).integrity?.content_hash}</small>
                {exportPreview.blockers.map((blocker) => <div key={blocker} className={styles.blockerLine}><AlertTriangle size={14} />{blocker}</div>)}
                {exportPreview.warnings.map((warning) => <div key={warning} className={styles.warningLine}><AlertTriangle size={14} />{warning}</div>)}
              </div>
            )}
          </div>

          <div className={styles.packageToolPanel}>
            <div className={styles.miniPanelHeader}>
              <Upload size={15} />
              <span>Import preview</span>
            </div>
            <label className={styles.fileInputLabel}>
              <span>JSON bundle file</span>
              <input type="file" accept=".json,.coincides,application/json" onChange={(event) => loadPackageFile(event.target.files?.[0] || null)} />
            </label>
            <label>
              <span>Paste JSON bundle</span>
              <textarea
                className={styles.packageTextArea}
                value={importText}
                onChange={(event) => {
                  setImportText(event.target.value);
                  setImportPreview(null);
                }}
                placeholder='{"package_format":"coincides.package.bundle",...}'
              />
            </label>
            <div className={styles.packageActionRow}>
              <button type="button" onClick={previewPackageImport} disabled={packageBusy || !importText.trim()}>
                Preview import
              </button>
              <button type="button" onClick={applyPackageImportPreview} disabled={packageBusy || !importPreview || importPreview.validation_status === 'blocked' || importPreview.status !== 'preview'}>
                Apply
              </button>
              <button type="button" onClick={discardPackageImport} disabled={packageBusy || !importPreview || importPreview.status !== 'preview'}>
                Discard
              </button>
            </div>
          </div>

          <div className={styles.packageToolPanel}>
            <div className={styles.miniPanelHeader}>
              <ShieldCheck size={15} />
              <span>Import result</span>
            </div>
            {importPreview ? (
              <div className={styles.packageResult}>
                <strong>{importPreview.summary.package_key} / {importPreview.validation_status}</strong>
                <span>{importPreview.summary.template_count} templates / {importPreview.summary.composition_count} compositions / {importPreview.summary.domain_set_count} domains</span>
                <small>{importPreview.bundle_hash}</small>
                {importPreview.blockers.map((blocker) => <div key={blocker} className={styles.blockerLine}><AlertTriangle size={14} />{blocker}</div>)}
                {importPreview.warnings.map((warning) => <div key={warning} className={styles.warningLine}><AlertTriangle size={14} />{warning}</div>)}
                <div className={styles.importItems}>
                  {importPreview.conflict_report.items.slice(0, 12).map((item, index) => (
                    <div key={`${item.object_type}-${item.object_key}-${index}`}>
                      <b>{item.action}</b>
                      <span>{item.object_type}: {item.object_key}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.emptyInline}>No import preview yet.</div>
            )}
          </div>
        </div>
      </section>

      <div className={styles.shell}>
        <aside className={styles.library}>
          <div className={styles.searchBox}>
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates" />
          </div>
          <div className={styles.filters}>
            <select value={systemFilter} onChange={(event) => setSystemFilter(event.target.value)}>
              <option value="all">All origins</option>
              <option value="system">System</option>
              <option value="user">User</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
              <option value="archived">Archived</option>
            </select>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">All roles</option>
              {LEARNING_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          <div className={styles.templateList}>
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`${styles.templateRow} ${template.id === selectedId ? styles.templateRowActive : ''}`}
                onClick={() => setSelectedId(template.id)}
              >
                <span>{template.label}</span>
                <small>{template.template_key}</small>
                <em>{templateStatusLabel(template)}</em>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.editor}>
          {selectedTemplate ? (
            <>
              <div className={styles.editorHeader}>
                <div>
                  <p className={styles.eyebrow}>{templateStatusLabel(selectedTemplate)}</p>
                  <h2>{selectedTemplate.label}</h2>
                  <span>{selectedTemplate.template_key} / v{selectedTemplate.version}</span>
                </div>
                <div className={styles.editorActions}>
                  <button type="button" onClick={copyTemplate} disabled={busy}>
                    <Copy size={15} />
                    Copy
                  </button>
                  <button type="button" onClick={saveTemplate} disabled={busy || !canSafeEdit}>
                    <Save size={15} />
                    Save
                  </button>
                  {selectedTemplate.status !== 'active' && (
                    <button type="button" onClick={() => lifecycle('activate')} disabled={busy || isSystem}>
                      <CheckCircle2 size={15} />
                      Activate
                    </button>
                  )}
                  {selectedTemplate.status === 'active' && (
                    <button type="button" onClick={() => lifecycle('deprecate')} disabled={busy || isSystem}>
                      <Archive size={15} />
                      Deprecate
                    </button>
                  )}
                  {selectedTemplate.status === 'archived' ? (
                    <button type="button" onClick={() => lifecycle('restore')} disabled={busy || isSystem}>Restore</button>
                  ) : (
                    <button type="button" onClick={() => lifecycle('archive')} disabled={busy || isSystem}>Archive</button>
                  )}
                </div>
              </div>

              {compatibilityWarning && <div className={styles.warningPanel}>{compatibilityWarning}</div>}

              <div className={styles.grid}>
                <label>
                  <span>Template key</span>
                  <input value={form.template_key} onChange={(event) => setForm({ ...form, template_key: event.target.value })} disabled={!isDraftUserTemplate} />
                </label>
                <label>
                  <span>Label</span>
                  <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} disabled={!canSafeEdit} />
                </label>
                <label>
                  <span>System type</span>
                  <select value={form.system_type} onChange={(event) => setForm({ ...form, system_type: event.target.value })} disabled={structuralLocked || !canSafeEdit}>
                    {SYSTEM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label>
                  <span>Learning role</span>
                  <select value={form.learning_role} onChange={(event) => setForm({ ...form, learning_role: event.target.value })} disabled={structuralLocked || !canSafeEdit}>
                    {LEARNING_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
                <label>
                  <span>Legacy block type</span>
                  <select value={form.legacy_block_type} onChange={(event) => setForm({ ...form, legacy_block_type: event.target.value })} disabled={structuralLocked || !canSafeEdit}>
                    {LEGACY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label>
                  <span>Render intent</span>
                  <select value={form.render_intent} onChange={(event) => setForm({ ...form, render_intent: event.target.value })} disabled={!canSafeEdit}>
                    {RENDER_INTENTS.map((intent) => <option key={intent} value={intent}>{intent}</option>)}
                  </select>
                </label>
              </div>

              <label className={styles.fullField}>
                <span>Description</span>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} disabled={!canSafeEdit} />
              </label>

              <div className={styles.fieldSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h3>Fields</h3>
                    <span>Max 8 fields. Structural edits are draft-only.</span>
                  </div>
                  <button type="button" onClick={addField} disabled={!isDraftUserTemplate || form.field_schema.length >= 8}>
                    <Plus size={14} />
                    Field
                  </button>
                </div>
                {form.field_schema.map((field, index) => (
                  <div className={styles.fieldRow} key={`${field.key}-${index}`}>
                    <input value={field.key} onChange={(event) => updateField(index, { key: event.target.value })} disabled={!isDraftUserTemplate} />
                    <input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} disabled={!isDraftUserTemplate} />
                    <select value={field.kind} onChange={(event) => updateField(index, { kind: event.target.value as TemplateFieldKind })} disabled={!isDraftUserTemplate}>
                      {FIELD_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                    </select>
                    <label className={styles.checkField}>
                      <input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(index, { required: event.target.checked })} disabled={!isDraftUserTemplate} />
                      Required
                    </label>
                    <button type="button" onClick={() => removeField(index)} disabled={!isDraftUserTemplate || form.field_schema.length <= 1}>Remove</button>
                  </div>
                ))}
              </div>

              <div className={styles.grid}>
                <label>
                  <span>Source policy</span>
                  <select value={form.source_policy} onChange={(event) => setForm({ ...form, source_policy: event.target.value })} disabled={structuralLocked || !canSafeEdit}>
                    {SOURCE_POLICIES.map((policy) => <option key={policy} value={policy}>{policy}</option>)}
                  </select>
                </label>
                <label>
                  <span>Relation preset</span>
                  <select value={form.relation_preset} onChange={(event) => setForm({ ...form, relation_preset: event.target.value })} disabled={structuralLocked || !canSafeEdit}>
                    {RELATION_PRESETS.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
                  </select>
                </label>
                <label>
                  <span>Proposal preset</span>
                  <select value={form.proposal_preset} onChange={(event) => setForm({ ...form, proposal_preset: event.target.value })} disabled={structuralLocked || !canSafeEdit}>
                    {PROPOSAL_PRESETS.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
                  </select>
                </label>
              </div>

              <label className={styles.fullField}>
                <span>Summary for agent</span>
                <textarea value={form.summary_for_agent} onChange={(event) => setForm({ ...form, summary_for_agent: event.target.value })} disabled={!canSafeEdit} />
              </label>
            </>
          ) : (
            <div className={styles.emptyState}>No template selected.</div>
          )}
        </section>

        <aside className={styles.preview}>
          <div className={styles.previewHeader}>
            <Eye size={16} />
            <span>Preview</span>
          </div>
          <div className={styles.previewTabs}>
            {(['reading', 'editing', 'debug', 'proposal'] as PreviewTab[]).map((tab) => (
              <button key={tab} type="button" className={previewTab === tab ? styles.previewTabActive : ''} onClick={() => setPreviewTab(tab)}>
                {tab}
              </button>
            ))}
          </div>
          <div className={styles.previewBox}>
            <div className={styles.previewTitle}>{form.label || 'Untitled template'}</div>
            <div className={styles.previewMeta}>{form.system_type} / {form.learning_role} / {form.render_intent}</div>
            {previewTab === 'debug' ? (
              <pre>{JSON.stringify({
                template_key: form.template_key,
                field_schema: form.field_schema,
                source_policy: form.source_policy,
                relation_preset: form.relation_preset,
                proposal_preset: form.proposal_preset,
              }, null, 2)}</pre>
            ) : (
              <div className={styles.previewFields}>
                {form.field_schema.map((field) => (
                  <div key={field.key}>
                    <strong>{field.label}</strong>
                    <span>{field.kind}{field.required ? ' / required' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.compatPanel}>
            <div className={styles.previewHeader}>
              <FileCode2 size={16} />
              <span>Compatibility</span>
            </div>
            <p>{usage?.total_blocks ?? 0} current NoteBlocks resolve to this template.</p>
            <ul>
              <li>{usage?.runtime_reference_count ?? 0} direct runtime references</li>
              <li>{usage?.key_version_reference_count ?? 0} key/version references</li>
              <li>{usage?.legacy_template_id_count ?? 0} legacy template references</li>
            </ul>
            {selectedTemplate?.status === 'active' && (usage?.total_blocks || 0) > 0 && (
              <div className={styles.migrationPanel}>
                <div className={styles.previewHeader}>
                  <GitBranch size={16} />
                  <span>Migration Proposal</span>
                </div>
                <p>Structural edits on active templates go through proposal-first migration. Preview impact before mutating old NoteBlocks.</p>
                <label>
                  <span>Target template</span>
                  <select value={migrationTargetId} onChange={(event) => setMigrationTargetId(event.target.value)} disabled={migrationBusy}>
                    {migrationTargets.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label} / {template.template_key}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Mode</span>
                  <select value={migrationMode} onChange={(event) => setMigrationMode(event.target.value as MigrationMode)} disabled={migrationBusy}>
                    <option value="alias_mapping">Alias mapping</option>
                    <option value="soft_migration">Soft migration</option>
                    <option value="hard_cascade">Hard cascade</option>
                  </select>
                </label>
                <button type="button" onClick={createMigrationProposal} disabled={migrationBusy || !migrationTargetId}>
                  <GitBranch size={14} />
                  Create migration proposal
                </button>

                {migrationProposal && (
                  <div className={styles.migrationPreview}>
                    <strong>{migrationProposal.data.migration_mode} / {migrationProposal.data.affected_object_count} affected blocks</strong>
                    <span>{migrationProposal.data.apply_behavior}</span>
                    <div className={styles.diffList}>
                      {migrationProposal.data.diff.slice(0, 5).map((diff) => (
                        <div key={diff.field}>
                          <b>{diff.field}</b>
                          <small>{JSON.stringify(diff.before)} {'->'} {JSON.stringify(diff.after)}</small>
                        </div>
                      ))}
                      {migrationProposal.data.diff.length === 0 && <small>No structural diff detected.</small>}
                    </div>
                    {migrationProposal.data.blockers.map((blocker) => (
                      <div key={blocker} className={styles.blockerLine}>
                        <AlertTriangle size={14} />
                        {blocker}
                      </div>
                    ))}
                    {migrationProposal.data.warnings.map((warning) => (
                      <div key={warning} className={styles.warningLine}>
                        <AlertTriangle size={14} />
                        {warning}
                      </div>
                    ))}
                    <div className={styles.migrationActions}>
                      <button type="button" onClick={applyMigrationProposal} disabled={migrationBusy || migrationProposal.data.blockers.length > 0}>
                        Apply
                      </button>
                      <button type="button" onClick={discardMigrationProposal} disabled={migrationBusy}>
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
