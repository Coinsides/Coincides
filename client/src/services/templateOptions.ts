import {
  legacyBlockTypeForTemplate,
  listNoteBlockTemplates,
  mergeNoteBlockTemplateMetadata,
} from '@shared/types';
import api from './api';

export interface RuntimeTemplateDefinition {
  id: string;
  template_key: string;
  version: string;
  origin: 'system_seed' | 'user' | 'package' | 'migration';
  label: string;
  description: string | null;
  system_type: string;
  learning_role: string;
  legacy_block_type: string;
  field_schema: Array<Record<string, unknown>>;
  default_content: Record<string, unknown>;
  render_hints: Record<string, unknown>;
  source_behavior: Record<string, unknown>;
  relation_behavior: Record<string, unknown>;
  proposal_behavior: Record<string, unknown>;
  summary_for_agent: string;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  is_system: boolean;
  metadata: Record<string, unknown>;
}

export interface TemplateOption {
  template_id: string;
  template_definition_id?: string;
  template_key: string;
  template_version: string;
  label: string;
  description: string;
  system_type: string;
  learning_role: string;
  legacy_block_type: string;
  default_content: Record<string, unknown>;
  origin: string;
  status: string;
  isRuntime: boolean;
}

export const STATIC_TEMPLATE_OPTIONS: TemplateOption[] = listNoteBlockTemplates().map((template) => ({
  template_id: template.template_id,
  template_key: template.template_id,
  template_version: '1.0.0',
  label: template.label,
  description: template.description,
  system_type: template.system_type,
  learning_role: template.learning_role,
  legacy_block_type: legacyBlockTypeForTemplate(template.template_id),
  default_content: template.default_content,
  origin: 'static_registry',
  status: 'active',
  isRuntime: false,
}));

export function templateOptionFromRuntime(template: RuntimeTemplateDefinition): TemplateOption {
  return {
    template_id: template.template_key,
    template_definition_id: template.id,
    template_key: template.template_key,
    template_version: template.version,
    label: template.label,
    description: template.description || template.summary_for_agent || 'User template',
    system_type: template.system_type,
    learning_role: template.learning_role,
    legacy_block_type: template.legacy_block_type || legacyBlockTypeForTemplate(template.template_key),
    default_content: template.default_content || {},
    origin: template.origin,
    status: template.status,
    isRuntime: true,
  };
}

export async function loadRuntimeTemplateOptions(status = 'active'): Promise<{
  options: TemplateOption[];
  warning: string | null;
}> {
  try {
    const res = await api.get('/templates', { params: { status } });
    const templates = Array.isArray(res.data) ? res.data as RuntimeTemplateDefinition[] : [];
    const options = templates.map(templateOptionFromRuntime);
    return {
      options: options.length > 0 ? options : STATIC_TEMPLATE_OPTIONS,
      warning: options.length > 0 ? null : 'Runtime templates were empty; using static fallback.',
    };
  } catch (err) {
    console.error('Failed to load runtime templates:', err);
    return {
      options: STATIC_TEMPLATE_OPTIONS,
      warning: 'Runtime templates unavailable; using static fallback.',
    };
  }
}

export function metadataForTemplateOption(option: TemplateOption): Record<string, unknown> {
  if (option.template_definition_id) {
    return {
      template_definition_id: option.template_definition_id,
      template_key: option.template_key,
      template_version: option.template_version,
      template_id: option.template_key,
    };
  }
  return mergeNoteBlockTemplateMetadata({ template_id: option.template_id }, option.legacy_block_type);
}
