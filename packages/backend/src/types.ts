import type { SDK } from "caido:plugin";

// Extended types for Compare plugin
export interface CompareItem {
  id: number;
  length: number;
  data: string;
  preview: string;
  timestamp: Date;
  type: 'request' | 'response' | 'file' | 'clipboard';
  source?: string;
  metadata?: Record<string, any>;
}

export interface ComparisonRequest {
  item1: CompareItem;
  item2: CompareItem;
  type: 'words' | 'bytes' | 'characters';
  options?: {
    ignoreWhitespace?: boolean;
    ignoreCase?: boolean;
  };
}

export interface ComparisonResult {
  type: 'words' | 'bytes' | 'characters';
  differences: ComparisonDifference[];
  summary: {
    added: number;
    deleted: number;
    modified: number;
    total: number;
  };
}

export interface ComparisonDifference {
  type: 'added' | 'deleted' | 'modified';
  position: number;
  length: number;
  content: string;
  lineNumber?: number;
}

export interface CompareSettings {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  showLineNumbers: boolean;
  syncScroll: boolean;
  maxItems: number;
  autoSave: boolean;
}

// Result pattern for consistent error handling
export type Result<T> = 
  | { kind: "Success"; value: T }
  | { kind: "Error"; error: string };

// Backward compatibility
export interface CompareStorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// File upload result
export interface FileUploadResult {
  success: boolean;
  item?: CompareItem;
  error?: string;
}

// Panel data response
export interface PanelDataResponse {
  items: CompareItem[];
  count: number;
  lastUpdated: Date;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Backend SDK type for type safety
export type CaidoBackendSDK = SDK;