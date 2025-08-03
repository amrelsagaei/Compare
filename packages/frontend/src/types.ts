import type { Caido } from "@caido/sdk-frontend";

export type FrontendSDK = Caido;

// Data types for comparison - matching backend types
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

// Storage result wrapper - matching backend
export interface CompareStorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Panel data response - matching backend
export interface PanelDataResponse {
  items: CompareItem[];
  count: number;
  lastUpdated: Date;
}

// File upload result - matching backend
export interface FileUploadResult {
  success: boolean;
  item?: CompareItem;
  error?: string;
}

// UI state types
export interface UIState {
  loading: boolean;
  error: string | null;
  comparisonInProgress: boolean;
  showComparisonModal: boolean;
}

export interface PanelState {
  items: CompareItem[];
  selectedItems: CompareItem[];
  loading: boolean;
  error: string | null;
}

// Component props and emits
export interface CompareProps {
  // Future props for component customization
}

export interface CompareEmits {
  // Future events for component communication
}

// API call types for better type safety
export interface BackendAPI {
  saveItemToPanel(panelNumber: 1 | 2, data: string, type: CompareItem['type'], source?: string, metadata?: Record<string, any>): Promise<CompareStorageResult<CompareItem>>;
  loadPanelData(panelNumber: 1 | 2): Promise<CompareStorageResult<PanelDataResponse>>;
  removeItemFromPanel(panelNumber: 1 | 2, itemId: number): Promise<CompareStorageResult<void>>;
  clearPanelData(panelNumber: 1 | 2): Promise<CompareStorageResult<void>>;
  processFileUpload(fileContent: string, filename?: string): Promise<FileUploadResult>;
  processClipboardData(clipboardContent: string): Promise<FileUploadResult>;
  processHttpRequest(requestData: any): Promise<FileUploadResult>;
  processHttpResponse(responseData: any): Promise<FileUploadResult>;
  getStorageStats(): Promise<CompareStorageResult<any>>;
  validateStorage(): Promise<CompareStorageResult<boolean>>;
}