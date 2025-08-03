<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSDK } from "../plugins/sdk";
import type { CompareItem, PanelState, UIState } from "../types";
import { compareByWords, compareByBytes, ComparisonResult } from "../utils/comparisonEngine";

// Components
import CompareHeader from "../components/CompareHeader.vue";
import ComparePanel from "../components/ComparePanel.vue";
import CompareControls from "../components/CompareControls.vue";
import ComparisonModal from "../components/ComparisonModal.vue";
import DocumentationTab from "../components/DocumentationTab.vue";

// Retrieve the SDK instance
const sdk = useSDK();

// Enhanced reactive state for both panels
const panel1State = ref<PanelState>({
  items: [],
  selectedItems: [],
  loading: false,
  error: null
});

const panel2State = ref<PanelState>({
  items: [],
  selectedItems: [],
  loading: false,
  error: null
});

// Global UI state
const uiState = ref<UIState>({
  loading: false,
  error: null,
  comparisonInProgress: false,
  showComparisonModal: false
});

// Comparison state
const currentComparison = ref<ComparisonResult | null>(null);

// Tab state
const currentTab = ref<string>('compare');

// Utility functions for API calls
const handleApiCall = async <T>(apiCall: Promise<T>, errorContext: string): Promise<T | null> => {
  try {
    const result = await apiCall;
    return result;
  } catch (error) {
    const errorMessage = `${errorContext}: ${(error as Error).message}`;
    sdk.window.showToast(errorMessage, { variant: "error" });
    console.error(errorMessage, error);
    return null;
  }
};

const handleStorageResult = <T>(result: any, successContext: string): T | null => {
  // Handle both Result<T> pattern and CompareStorageResult<T> pattern
  if (result.kind === "Success" && result.value !== undefined) {
    return result.value;
  } else if (result.success && result.data !== undefined) {
    return result.data;
  } else {
    const errorMessage = result.error || `${successContext} failed`;
    sdk.window.showToast(errorMessage, { variant: "error" });
    return null;
  }
};

// Load panel data from backend storage
const loadPanelData = async (panelNumber: 1 | 2) => {
  const panelState = panelNumber === 1 ? panel1State.value : panel2State.value;
  
  panelState.loading = true;
  panelState.error = null;
  
  try {
    const result = await handleApiCall(
      (sdk.backend as any).loadPanelData(panelNumber),
      `Failed to load panel ${panelNumber} data`
    );
    
    if (result && typeof result === 'object' && result !== null && (('success' in result) || ('kind' in result))) {
      const data = handleStorageResult(result as any, `Panel ${panelNumber} load`);
      if (data && typeof data === 'object' && data !== null && 'items' in data) {
        // Convert timestamp strings back to Date objects
        const items = (data as any).items.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        
        panelState.items = items;
        // Clear selection when reloading
        panelState.selectedItems = [];
      }
    }
  } finally {
    panelState.loading = false;
  }
};

// Save item to backend storage
const saveItemToBackend = async (panelNumber: 1 | 2, item: CompareItem) => {
  const result = await handleApiCall(
    (sdk.backend as any).saveItemToPanel(
      panelNumber,
      item.data,
      item.type,
      item.source,
      item.metadata
    ),
    `Failed to save item to panel ${panelNumber}`
  );
  
  if (result && typeof result === 'object' && ('success' in result || 'kind' in result)) {
    const savedItem = handleStorageResult(result as any, `Save to panel ${panelNumber}`);
    if (savedItem) {
      // Reload panel data to ensure consistency
      await loadPanelData(panelNumber);
      return true;
    }
  }
  
  return false;
};

// Enhanced control button handlers with backend integration
const handlePaste = async (panelNumber: 1 | 2) => {
  const panelState = panelNumber === 1 ? panel1State.value : panel2State.value;
  panelState.loading = true;
  
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText.trim()) {
      sdk.window.showToast("Clipboard is empty", { variant: "warning" });
      return;
    }

    // Process clipboard data through backend
    const result = await handleApiCall(
      (sdk.backend as any).processClipboardData(clipboardText),
      "Failed to process clipboard data"
    );
    
    if (result && typeof result === 'object' && (
      ('success' in result && (result as any).success && (result as any).item) ||
      ('kind' in result && (result as any).kind === "Success" && (result as any).value)
    )) {
      const item = (result as any).item || (result as any).value;
      // Save processed item to backend storage
      const saved = await saveItemToBackend(panelNumber, item);
      if (saved) {
        sdk.window.showToast(`Data pasted to Panel ${panelNumber}`, { variant: "success" });
      }
    } else {
      sdk.window.showToast((result as any)?.error || "Failed to process clipboard data", { variant: "error" });
    }
  } catch (error) {
    sdk.window.showToast("Failed to read clipboard", { variant: "error" });
  } finally {
    panelState.loading = false;
  }
};

const handleLoad = (panelNumber: 1 | 2) => {
  const panelState = panelNumber === 1 ? panel1State.value : panel2State.value;
  
  // Create file input element
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '*/*';
  
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    panelState.loading = true;
    
    try {
      const text = await file.text();
      
      // Process file through backend
      const result = await handleApiCall(
        (sdk.backend as any).processFileUpload(text, file.name),
        "Failed to process file"
      );
      
      if (result && typeof result === 'object' && (
        ('success' in result && (result as any).success && (result as any).item) ||
        ('kind' in result && (result as any).kind === "Success" && (result as any).value)
      )) {
        const item = (result as any).item || (result as any).value;
        // Save processed item to backend storage
        const saved = await saveItemToBackend(panelNumber, item);
        if (saved) {
          sdk.window.showToast(`File "${file.name}" loaded to Panel ${panelNumber}`, { variant: "success" });
        }
      } else {
        sdk.window.showToast((result as any)?.error || "Failed to process file", { variant: "error" });
      }
    } catch (error) {
      sdk.window.showToast("Failed to read file", { variant: "error" });
    } finally {
      panelState.loading = false;
    }
  };

  input.click();
};

const handleRemove = async (panelNumber: 1 | 2) => {
  const panelState = panelNumber === 1 ? panel1State.value : panel2State.value;
  
  if (panelState.selectedItems.length === 0) {
    sdk.window.showToast("No items selected", { variant: "warning" });
    return;
  }

  panelState.loading = true;
  
  try {
    // Remove items from backend storage
    const removePromises = panelState.selectedItems.map(item =>
      handleApiCall(
        (sdk.backend as any).removeItemFromPanel(panelNumber, item.id),
        `Failed to remove item ${item.id}`
      )
    );
    
    const results = await Promise.all(removePromises);
    const successCount = results.filter(result => {
      if (result && typeof result === 'object') {
        return (result as any).kind === "Success" || (result as any).success === true;
      }
      return false;
    }).length;
    
    if (successCount > 0) {
      // Reload panel data to reflect changes
      await loadPanelData(panelNumber);
      sdk.window.showToast(`Removed ${successCount} item(s) from Panel ${panelNumber}`, { variant: "success" });
    }
  } finally {
    panelState.loading = false;
  }
};

const handleClear = async (panelNumber: 1 | 2) => {
  const panelState = panelNumber === 1 ? panel1State.value : panel2State.value;
  
  if (panelState.items.length === 0) {
    sdk.window.showToast(`Panel ${panelNumber} is already empty`, { variant: "info" });
    return;
  }

  panelState.loading = true;
  
  try {
    const result = await handleApiCall(
      (sdk.backend as any).clearPanelData(panelNumber),
      `Failed to clear panel ${panelNumber}`
    );
    
    if (result && typeof result === 'object' && (
      (result as any).kind === "Success" || (result as any).success === true
    )) {
      // Reload panel data to reflect changes
      await loadPanelData(panelNumber);
      sdk.window.showToast(`Panel ${panelNumber} cleared`, { variant: "success" });
    } else {
      sdk.window.showToast((result as any)?.error || `Failed to clear panel ${panelNumber}`, { variant: "error" });
    }
  } finally {
    panelState.loading = false;
  }
};

// Enhanced compare functions for Phase 3 with proper selection validation
const performComparison = (type: 'words' | 'bytes') => {
  if (panel1State.value.items.length === 0 || panel2State.value.items.length === 0) {
    sdk.window.showToast("Both panels must have data to compare", { variant: "warning" });
    return;
  }

  // Strict selection validation - require exactly one item selected from each panel
  if (panel1State.value.selectedItems.length === 0) {
    sdk.window.showToast("Please select exactly one item from Panel 1", { variant: "warning" });
    return;
  }

  if (panel2State.value.selectedItems.length === 0) {
    sdk.window.showToast("Please select exactly one item from Panel 2", { variant: "warning" });
    return;
  }

  if (panel1State.value.selectedItems.length > 1) {
    sdk.window.showToast("Please select only one item from Panel 1 for comparison", { variant: "warning" });
    return;
  }

  if (panel2State.value.selectedItems.length > 1) {
    sdk.window.showToast("Please select only one item from Panel 2 for comparison", { variant: "warning" });
    return;
  }

  const item1 = panel1State.value.selectedItems[0]!;
  const item2 = panel2State.value.selectedItems[0]!;

  uiState.value.comparisonInProgress = true;

  try {
    // Get text data from items
    const text1 = typeof item1.data === 'string' ? item1.data : JSON.stringify(item1.data, null, 2);
    const text2 = typeof item2.data === 'string' ? item2.data : JSON.stringify(item2.data, null, 2);

    // Perform comparison
    const { diffs1, diffs2 } = type === 'words' 
      ? compareByWords(text1, text2)
      : compareByBytes(text1, text2);

    // Create comparison result
    currentComparison.value = {
      id1: item1.id,
      id2: item2.id,
      source1: item1.source || `${item1.type} data`,
      source2: item2.source || `${item2.type} data`,
      length1: text1.length,
      length2: text2.length,
      diffs1,
      diffs2,
      type,
      timestamp: new Date()
    };

    // Show comparison modal
    uiState.value.showComparisonModal = true;

    sdk.window.showToast(`${type === 'words' ? 'Words' : 'Bytes'} comparison completed`, { variant: "success" });
  } catch (error) {
    sdk.window.showToast(`Comparison failed: ${(error as Error).message}`, { variant: "error" });
    console.error('Comparison error:', error);
  } finally {
    uiState.value.comparisonInProgress = false;
  }
};

const handleCompareWords = () => performComparison('words');
const handleCompareBytes = () => performComparison('bytes');

const handleComparisonModalClose = () => {
  uiState.value.showComparisonModal = false;
  currentComparison.value = null;
};

// Tab switching
const handleTabSwitch = (tab: string) => {
  currentTab.value = tab;
};

// Selection update handlers for components
const updatePanel1Selection = (items: CompareItem[]) => {
  panel1State.value.selectedItems = items;
};

const updatePanel2Selection = (items: CompareItem[]) => {
  panel2State.value.selectedItems = items;
};

// Initialize data loading
const initializeData = async () => {
  uiState.value.loading = true;
  
  try {
    // Load data for both panels from backend storage
    await Promise.all([
      loadPanelData(1),
      loadPanelData(2)
    ]);
    
    console.log("Compare plugin data loaded successfully");
  } catch (error) {
    sdk.window.showToast("Failed to load plugin data", { variant: "error" });
    console.error("Data loading error:", error);
  } finally {
    uiState.value.loading = false;
  }
};

// Initialize component - load existing data from storage
onMounted(async () => {
  await initializeData();
  
  // Listen for custom refresh events from context menu operations
  const handleDataUpdate = (event: CustomEvent) => {
    const { panel } = event.detail;
    console.log(`Data updated for panel ${panel} - refreshing...`);
    if (panel === 1 || panel === 2) {
      loadPanelData(panel);
    } else {
      // Refresh both panels if panel not specified
      loadPanelData(1);
      loadPanelData(2);
    }
  };
  
  window.addEventListener('compare-data-updated', handleDataUpdate as EventListener);
  
  // Listen for project changes and reload data
  try {
    if ('events' in sdk && sdk.events && typeof (sdk.events as any).onProjectChange === 'function') {
      (sdk.events as any).onProjectChange(() => {
        console.log("Project changed - reloading Compare plugin data");
        initializeData();
      });
      console.log("Compare plugin initialized with project change detection");
    } else {
      console.log("Project change listener not available, data will persist across projects");
    }
  } catch (error) {
    console.log("Project change listener not available, data will persist across projects");
  }
});
</script>

<template>
  <div class="h-full w-full p-4 bg-surface-0 dark:bg-surface-900 flex flex-col">
    <!-- Header -->
    <CompareHeader 
      :current-tab="currentTab"
      @switch-tab="handleTabSwitch" 
    />

    <!-- Tab Content -->
    <div class="flex-1 min-h-0">
      <!-- Compare Tab -->
      <div v-if="currentTab === 'compare'" class="h-full flex flex-col">
        <!-- Main content area - Force 50-50 layout on all screen sizes -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 min-w-0">
          <!-- Panel 1 -->
          <ComparePanel
            :panel-number="1"
            :panel-state="panel1State"
            :comparison-in-progress="uiState.comparisonInProgress"
            @paste="handlePaste"
            @load="handleLoad"
            @remove="handleRemove"
            @clear="handleClear"
            @update:selection="updatePanel1Selection"
          />

          <!-- Panel 2 -->
          <ComparePanel
            :panel-number="2"
            :panel-state="panel2State"
            :comparison-in-progress="uiState.comparisonInProgress"
            @paste="handlePaste"
            @load="handleLoad"
            @remove="handleRemove"
            @clear="handleClear"
            @update:selection="updatePanel2Selection"
          />
        </div>

        <!-- Bottom Controls - Fixed at bottom -->
        <CompareControls
          :panel1-state="panel1State"
          :panel2-state="panel2State"
          :comparison-in-progress="uiState.comparisonInProgress"
          @compare-words="handleCompareWords"
          @compare-bytes="handleCompareBytes"
        />
      </div>

      <!-- Documentation Tab -->
      <DocumentationTab 
        v-else-if="currentTab === 'docs'"
        @switch-tab="handleTabSwitch"
      />
    </div>

    <!-- Comparison Modal -->
    <ComparisonModal
      :visible="uiState.showComparisonModal"
      :comparison-result="currentComparison"
      @update:visible="(value) => uiState.showComparisonModal = value"
      @close="handleComparisonModalClose"
    />
  </div>
</template>