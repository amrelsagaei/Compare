import type { DefineAPI, SDK } from "caido:plugin";
import { CompareStore } from "./stores/compareStore";
import { IdGenerator } from "./utils/idGenerator";
import { 
  ensureCompareDirectories, 
  saveItemToFile, 
  deleteItemFile, 
  clearPanelFiles, 
  loadAllItemsFromFiles 
} from "./utils/fileUtils";
import { 
  CompareItem, 
  ComparisonRequest, 
  ComparisonResult, 
  CompareStorageResult,
  FileUploadResult,
  PanelDataResponse,
  ValidationResult,
  Result
} from "./types";

// Helper functions
const createPreview = (data: string, maxLength: number = 100): string => {
  if (data.length <= maxLength) return data;
  return data.substring(0, maxLength) + "...";
};

const generateId = (): number => {
  return IdGenerator.get().generateId();
};

const validateItemData = (data: string): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof data !== 'string') {
    errors.push('Data must be a string');
  }
  
  if (data.length === 0) {
    errors.push('Data cannot be empty');
  }
  
  if (data.length > 10 * 1024 * 1024) { // 10MB limit for performance
    errors.push('File size exceeds 10MB limit. Large files may cause performance issues.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Enhanced logging utility
const logOperation = (sdk: SDK, operation: string, details: any = {}) => {
  sdk.console.log(`[Compare Plugin] ${operation}: ${JSON.stringify(details)}`);
};

// API Functions for data management (using in-memory store + file persistence)
const saveItemToPanel = async (
  sdk: SDK, 
  panelNumber: 1 | 2, 
  data: string, 
  type: CompareItem['type'],
  source?: string,
  metadata?: Record<string, any>
): Promise<CompareStorageResult<CompareItem>> => {
  logOperation(sdk, `Saving item to ${panelNumber === 1 ? 'Original' : 'Modified'}`, { type, source, dataLength: data.length });
  
  // Validate data
  const validation = validateItemData(data);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join(', ')}`
    };
  }
  
  // Create compare item
  const item: CompareItem = {
    id: generateId(),
    length: data.length,
    data: data,
    preview: createPreview(data),
    timestamp: new Date(),
    type: type,
    source: source,
    metadata: metadata || {}
  };
  
  try {
    // Add to in-memory store first
    const store = CompareStore.get();
    store.addPanelItem(panelNumber, item);
    
    // Save to file for persistence
    const fileSaved = await saveItemToFile(sdk, panelNumber, item);
    if (!fileSaved) {
      // If file save fails, remove from memory store to maintain consistency
      store.deletePanelItem(panelNumber, item.id);
      return {
        success: false,
        error: 'Failed to save item to file storage'
      };
    }
    
    logOperation(sdk, `Successfully saved item ${item.id} to ${panelNumber === 1 ? 'Original' : 'Modified'}`);
    return { success: true, data: item };
  } catch (error) {
    logOperation(sdk, `Error saving item to ${panelNumber === 1 ? 'Original' : 'Modified'}`, { error: (error as Error).message });
    return {
      success: false,
      error: `Failed to save item: ${(error as Error).message}`
    };
  }
};

const loadPanelData = async (sdk: SDK, panelNumber: 1 | 2): Promise<CompareStorageResult<PanelDataResponse>> => {
  logOperation(sdk, `Loading data for ${panelNumber === 1 ? 'Original' : 'Modified'}`);
  
  try {
    const store = CompareStore.get();
    const items = store.getPanelItems(panelNumber);
    
    const response: PanelDataResponse = {
      items: items,
      count: items.length,
      lastUpdated: new Date()
    };
    
    logOperation(sdk, `Loaded ${items.length} items for ${panelNumber === 1 ? 'Original' : 'Modified'}`);
    return { success: true, data: response };
  } catch (error) {
    return {
      success: false,
      error: `Failed to load ${panelNumber === 1 ? 'Original' : 'Modified'} data: ${(error as Error).message}`
    };
  }
};

const removeItemFromPanel = async (
  sdk: SDK, 
  panelNumber: 1 | 2, 
  itemId: number
): Promise<Result<void>> => {
  logOperation(sdk, `Removing item ${itemId} from ${panelNumber === 1 ? 'Original' : 'Modified'}`);
  
  try {
    const store = CompareStore.get();
    
    // Check if item exists
    const item = store.getPanelItem(panelNumber, itemId);
    if (!item) {
      return {
        kind: "Error",
        error: `Item ${itemId} not found in ${panelNumber === 1 ? 'Original' : 'Modified'}`
      };
    }
    
    // Remove from file storage first (this is the source of truth)
    const fileDeleted = await deleteItemFile(sdk, panelNumber, itemId);
    
    // Remove from in-memory store (always do this, even if file operation failed)
    store.deletePanelItem(panelNumber, itemId);
    
    // Always consider it success - goal is to have item removed
    logOperation(sdk, `Successfully removed item ${itemId} from ${panelNumber === 1 ? 'Original' : 'Modified'}`, { fileDeleted });
    return { kind: "Success", value: undefined };
  } catch (error) {
    logOperation(sdk, `Error removing item ${itemId} from ${panelNumber === 1 ? 'Original' : 'Modified'}`, { error: (error as Error).message });
    return {
      kind: "Error",
      error: `Failed to remove item: ${(error as Error).message}`
    };
  }
};

const clearPanelData = async (sdk: SDK, panelNumber: 1 | 2): Promise<Result<void>> => {
  logOperation(sdk, `Clearing all data from ${panelNumber === 1 ? 'Original' : 'Modified'}`);
  
  try {
    const store = CompareStore.get();
    
    // Clear files first (this is the source of truth)
    const filesCleared = await clearPanelFiles(sdk, panelNumber);
    
    // Clear in-memory store (always do this, even if file operation had issues)
    store.clearPanel(panelNumber);
    
    // Always report success - goal is to have panel cleared
    logOperation(sdk, `Successfully cleared ${panelNumber === 1 ? 'Original' : 'Modified'}`, { filesCleared });
    return { kind: "Success", value: undefined };
  } catch (error) {
    logOperation(sdk, `Error clearing ${panelNumber === 1 ? 'Original' : 'Modified'}`, { error: (error as Error).message });
    return {
      kind: "Error",
      error: `Failed to clear ${panelNumber === 1 ? 'Original' : 'Modified'}: ${(error as Error).message}`
    };
  }
};

// File processing functions
const processFileUpload = async (
  sdk: SDK, 
  fileContent: string, 
  filename?: string
): Promise<FileUploadResult> => {
  logOperation(sdk, 'Processing file upload', { filename, size: fileContent.length });
  
  try {
    const validation = validateItemData(fileContent);
    if (!validation.valid) {
      return {
        success: false,
        error: `File validation failed: ${validation.errors.join(', ')}`
      };
    }
    
    const item: CompareItem = {
      id: generateId(),
      length: fileContent.length,
      data: fileContent,
      preview: createPreview(fileContent),
      timestamp: new Date(),
      type: 'file',
      source: filename || 'uploaded_file',
      metadata: {
        filename: filename,
        uploadedAt: new Date().toISOString()
      }
    };
    
    return { success: true, item };
  } catch (error) {
    return {
      success: false,
      error: `File processing failed: ${(error as Error).message}`
    };
  }
};

const processClipboardData = async (
  sdk: SDK, 
  clipboardContent: string
): Promise<FileUploadResult> => {
  logOperation(sdk, 'Processing clipboard data', { size: clipboardContent.length });
  
  try {
    const validation = validateItemData(clipboardContent);
    if (!validation.valid) {
      return {
        success: false,
        error: `Clipboard validation failed: ${validation.errors.join(', ')}`
      };
    }
    
    const item: CompareItem = {
      id: generateId(),
      length: clipboardContent.length,
      data: clipboardContent,
      preview: createPreview(clipboardContent),
      timestamp: new Date(),
      type: 'clipboard',
      source: 'clipboard',
      metadata: {
        pastedAt: new Date().toISOString()
      }
    };
    
    return { success: true, item };
  } catch (error) {
    return {
      success: false,
      error: `Clipboard processing failed: ${(error as Error).message}`
    };
  }
};

// HTTP request/response processing functions (for Phase 4)
const processHttpRequest = async (
  sdk: SDK, 
  requestData: any
): Promise<FileUploadResult> => {
  logOperation(sdk, 'Processing HTTP request data');
  
  try {
    // Extract request information
    const requestString = requestData?.raw || requestData?.toString() || JSON.stringify(requestData);
    
    const validation = validateItemData(requestString);
    if (!validation.valid) {
      return {
        success: false,
        error: `Request validation failed: ${validation.errors.join(', ')}`
      };
    }
    
    const item: CompareItem = {
      id: generateId(),
      length: requestString.length,
      data: requestString,
      preview: createPreview(requestString),
      timestamp: new Date(),
      type: 'request',
      source: requestData?.url || 'http_request',
      metadata: {
        method: requestData?.method,
        url: requestData?.url,
        processedAt: new Date().toISOString()
      }
    };
    
    return { success: true, item };
  } catch (error) {
    return {
      success: false,
      error: `Request processing failed: ${(error as Error).message}`
    };
  }
};

const processHttpResponse = async (
  sdk: SDK, 
  responseData: any
): Promise<FileUploadResult> => {
  logOperation(sdk, 'Processing HTTP response data');
  
  try {
    // Extract response information
    const responseString = responseData?.raw || responseData?.toString() || JSON.stringify(responseData);
    
    const validation = validateItemData(responseString);
    if (!validation.valid) {
      return {
        success: false,
        error: `Response validation failed: ${validation.errors.join(', ')}`
      };
    }
    
    const item: CompareItem = {
      id: generateId(),
      length: responseString.length,
      data: responseString,
      preview: createPreview(responseString),
      timestamp: new Date(),
      type: 'response',
      source: responseData?.url || 'http_response',
      metadata: {
        status: responseData?.status,
        url: responseData?.url,
        processedAt: new Date().toISOString()
      }
    };
    
    return { success: true, item };
  } catch (error) {
    return {
      success: false,
      error: `Response processing failed: ${(error as Error).message}`
    };
  }
};

// Backend comparison function - delegates to frontend comparison engine
const performComparison = (sdk: SDK, request: ComparisonRequest): ComparisonResult => {
  logOperation(sdk, `Performing ${request.type} comparison`);
  
  const { item1, item2, type, options } = request;
  
  if (!item1 || !item2) {
    throw new Error("Both items are required for comparison");
  }
  
  // Note: Actual comparison processing is handled by frontend comparison engine
  // This backend function serves as a registration point for future server-side processing
  if (options?.ignoreWhitespace || options?.ignoreCase) {
    sdk.console.log('Advanced comparison options available in frontend engine');
  }
  
  // Return minimal result - frontend handles actual comparison processing
  const result: ComparisonResult = {
    type,
    differences: [],
    summary: {
      added: 0,
      deleted: 0,
      modified: 0,
      total: 0
    }
  };
  
  logOperation(sdk, `Comparison request processed - processing handled by frontend`);
  return result;
};

// Storage management functions
const getStorageStats = async (sdk: SDK): Promise<CompareStorageResult<any>> => {
  try {
    const store = CompareStore.get();
    const stats = store.getStats();
    
    return {
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get storage stats: ${(error as Error).message}`
    };
  }
};

// HTTP request handler for context menus (REQUESTS ONLY - simplified)
const addRequestToPanel = async (
  sdk: SDK,
  panelNumber: 1 | 2,
  rawRequest: string,
  targetUrl: string,
  originalRequest: any
): Promise<string> => {
  try {
    const requestId = `req_${Date.now()}_${++requestCounter}`;
    
    // Ensure we have the raw request data
    if (!rawRequest || rawRequest.trim() === '') {
      throw new Error('Raw request data is required');
    }
    
    // Extract method from raw request
    let method = 'UNKNOWN';
    if (rawRequest && typeof rawRequest === 'string') {
      const methodMatch = rawRequest.match(/^([A-Z]+)\s+/);
      if (methodMatch && methodMatch[1]) {
        method = methodMatch[1];
      }
    }
    
    const newItem: CompareItem = {
      id: generateId(),
      length: rawRequest.length,
      data: rawRequest,
      preview: `${method} ${targetUrl}`.substring(0, 100),
      type: "request",
      timestamp: new Date(),
      source: targetUrl,
      metadata: { 
        method: method,
        url: targetUrl,
        host: originalRequest.host,
        port: originalRequest.port,
        isTls: originalRequest.isTls
      }
    };
    
    // Add to in-memory store
    const store = CompareStore.get();
    store.addPanelItem(panelNumber, newItem);
    
    // Save to file for persistence
    const fileSaved = await saveItemToFile(sdk, panelNumber, newItem);
    if (!fileSaved) {
      store.deletePanelItem(panelNumber, newItem.id);
      throw new Error('Failed to save item to file storage');
    }
    
    logOperation(sdk, `Successfully added request ${newItem.id} to ${panelNumber === 1 ? 'Original' : 'Modified'}`);
    return requestId;
  } catch (error) {
    logOperation(sdk, `Error adding request to ${panelNumber === 1 ? 'Original' : 'Modified'}`);
    throw error;
  }
};

// Request counter for generating IDs
let requestCounter = 0;

// Initialize storage from files
const initializeStorage = async (sdk: SDK): Promise<boolean> => {
  try {
    logOperation(sdk, 'Initializing storage from files');
    
    // Ensure directories exist
    const directoriesReady = await ensureCompareDirectories(sdk);
    if (!directoriesReady) {
      sdk.console.error('Failed to create storage directories');
      return false;
    }
    
    // Load existing data from files
    const { panel1, panel2 } = await loadAllItemsFromFiles(sdk);
    
    // Load into in-memory store
    const store = CompareStore.get();
    store.loadPanelItems(1, panel1);
    store.loadPanelItems(2, panel2);
    
    // Initialize ID generator with existing data
    const idGenerator = IdGenerator.get();
    idGenerator.initialize();
    
    logOperation(sdk, 'Storage initialized successfully', {
      panel1Items: panel1.length,
      panel2Items: panel2.length,
      totalItems: panel1.length + panel2.length
    });
    
    return true;
  } catch (error) {
    sdk.console.error('Failed to initialize storage: ' + (error as Error).message);
    return false;
  }
};

export type API = DefineAPI<{
  // Data management API
  saveItemToPanel: typeof saveItemToPanel;
  loadPanelData: typeof loadPanelData;
  removeItemFromPanel: typeof removeItemFromPanel;
  clearPanelData: typeof clearPanelData;
  
  // File and data processing API
  processFileUpload: typeof processFileUpload;
  processClipboardData: typeof processClipboardData;
  processHttpRequest: typeof processHttpRequest;
  processHttpResponse: typeof processHttpResponse;
  
  // Comparison API (enhanced in Phase 3)
  performComparison: typeof performComparison;
  
  // Context menu API
  addRequestToPanel: typeof addRequestToPanel;
  
  // Storage management API
  getStorageStats: typeof getStorageStats;
}>;

export function init(sdk: SDK<API>) {
  sdk.console.log("Compare Plugin Backend: Initializing...");
  
  // Listen for project changes and reinitialize storage
  sdk.events.onProjectChange(async (sdk, project) => {
    const projectName = project?.getName() ?? "Unknown";
    logOperation(sdk, `Project changed to: ${projectName} - reinitializing storage`);
    
    // Clear the in-memory store first
    const store = CompareStore.get();
    store.clearPanel(1);
    store.clearPanel(2);
    
    // Reinitialize storage for the new project
    const success = await initializeStorage(sdk);
    if (success) {
      sdk.console.log(`Compare Plugin: Storage reinitialized for project "${projectName}"`);
    } else {
      sdk.console.error(`Compare Plugin: Failed to reinitialize storage for project "${projectName}"`);
    }
  });
  
  // Initialize storage (async, but don't block plugin registration)
  initializeStorage(sdk).then((success) => {
    if (success) {
      sdk.console.log("Compare Plugin Backend: Storage initialized successfully");
    } else {
      sdk.console.error("Compare Plugin Backend: Storage initialization failed");
    }
  });
  
  // Register API functions
  sdk.api.register("saveItemToPanel", saveItemToPanel);
  sdk.api.register("loadPanelData", loadPanelData);
  sdk.api.register("removeItemFromPanel", removeItemFromPanel);
  sdk.api.register("clearPanelData", clearPanelData);
  
  sdk.api.register("processFileUpload", processFileUpload);
  sdk.api.register("processClipboardData", processClipboardData);
  sdk.api.register("processHttpRequest", processHttpRequest);
  sdk.api.register("processHttpResponse", processHttpResponse);
  
  sdk.api.register("performComparison", performComparison);
  sdk.api.register("addRequestToPanel", addRequestToPanel);
  
  sdk.api.register("getStorageStats", getStorageStats);
  
  sdk.console.log("Compare Plugin Backend: Successfully initialized with correct storage pattern");
  
  // Log available endpoints
  logOperation(sdk, "Enhanced API Registration Complete", {
    endpoints: [
      "saveItemToPanel",
      "loadPanelData", 
      "removeItemFromPanel",
      "clearPanelData",
      "processFileUpload",
      "processClipboardData",
      "processHttpRequest",
      "processHttpResponse", 
      "performComparison",
      "getStorageStats"
    ],
    storagePattern: "in-memory + file persistence"
  });
}