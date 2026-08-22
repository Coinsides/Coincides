export type ToolFaceTruth =
  | 'content'
  | 'knowledge'
  | 'spatial'
  | 'provenance'
  | 'semantic'
  | 'purpose'
  | 'package';

export type ToolFaceTier = 'immediate' | 'propose' | 'confirm';
export type ToolFaceExposure = 'public' | 'internal' | 'test';

export type ToolFaceJsonPrimitive = string | number | boolean | null;
export type ToolFaceJsonValue =
  | ToolFaceJsonPrimitive
  | ToolFaceJsonObject
  | ToolFaceJsonValue[];

export interface ToolFaceJsonObject {
  [key: string]: ToolFaceJsonValue;
}

export type ToolFaceJsonSchema = ToolFaceJsonObject;

export interface ToolFaceManifestHumanEntry {
  route: string;
  client_call_site: string;
}

/**
 * Serializable projection of one server-owned tool registry entry.
 * This transport type carries no runtime validator and is not a registry.
 */
export interface ToolFaceManifestEntry {
  name: string;
  description: string;
  input_schema: ToolFaceJsonSchema;
  output_schema: ToolFaceJsonSchema;
  truth: ToolFaceTruth;
  tier: ToolFaceTier;
  human_entry: ToolFaceManifestHumanEntry;
  exposure: ToolFaceExposure;
  scopes: string[];
}

export type ToolFaceManifest = ToolFaceManifestEntry[];
