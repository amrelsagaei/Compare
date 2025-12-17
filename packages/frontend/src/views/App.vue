<script setup lang="ts">
import { onMounted, ref } from "vue";

import CompareControls from "../components/CompareControls.vue";
import CompareHeader from "../components/CompareHeader.vue";
import ComparePanel from "../components/ComparePanel.vue";
import ComparisonModal from "../components/ComparisonModal.vue";
import DocumentationTab from "../components/DocumentationTab.vue";
import { useSDK } from "../plugins/sdk";
import type { CompareItem, PanelState, UIState } from "../types";
import {
  compareByBytes,
  compareByWords,
  type ComparisonResult,
} from "../utils/comparisonEngine";

// Components

const sdk = useSDK();

const originalState = ref<PanelState>({
  items: [],
  selectedItems: [],
  loading: false,
  error: null,
});

const modifiedState = ref<PanelState>({
  items: [],
  selectedItems: [],
  loading: false,
  error: null,
});

const uiState = ref<UIState>({
  loading: false,
  error: null,
  comparisonInProgress: false,
  showComparisonModal: false,
});

const currentComparison = ref<ComparisonResult | null>(null);

const currentTab = ref<string>("compare");

const handleApiCall = async <T,>(
  apiCall: Promise<T>,
  errorContext: string,
): Promise<T | null> => {
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

const handleStorageResult = <T,>(
  result: any,
  successContext: string,
): T | null => {
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

const loadPanelData = async (panelNumber: 1 | 2) => {
  const panelState =
    panelNumber === 1 ? originalState.value : modifiedState.value;

  panelState.loading = true;
  panelState.error = null;

  try {
    const result = await handleApiCall(
      (sdk.backend as any).loadPanelData(panelNumber),
      `Failed to load ${panelNumber === 1 ? "Original" : "Modified"} data`,
    );

    if (
      result &&
      typeof result === "object" &&
      result !== null &&
      ("success" in result || "kind" in result)
    ) {
      const data = handleStorageResult(
        result as any,
        `${panelNumber === 1 ? "Original" : "Modified"} load`,
      );
      if (
        data &&
        typeof data === "object" &&
        data !== null &&
        "items" in data
      ) {
        const items = (data as any).items.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));

        panelState.items = items;
        panelState.selectedItems = [];
      }
    }
  } finally {
    panelState.loading = false;
  }
};

const saveItemToBackend = async (panelNumber: 1 | 2, item: CompareItem) => {
  const result = await handleApiCall(
    (sdk.backend as any).saveItemToPanel(
      panelNumber,
      item.data,
      item.type,
      item.source,
      item.metadata,
    ),
    `Failed to save item to ${panelNumber === 1 ? "Original" : "Modified"}`,
  );

  if (
    result &&
    typeof result === "object" &&
    ("success" in result || "kind" in result)
  ) {
    const savedItem = handleStorageResult(
      result as any,
      `Save to ${panelNumber === 1 ? "Original" : "Modified"}`,
    );
    if (savedItem) {
      await loadPanelData(panelNumber);
      return true;
    }
  }

  return false;
};

const handlePaste = async (panelNumber: 1 | 2) => {
  const panelState =
    panelNumber === 1 ? originalState.value : modifiedState.value;
  panelState.loading = true;

  try {
    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText.trim()) {
      sdk.window.showToast("Clipboard is empty", { variant: "warning" });
      return;
    }

    const result = await handleApiCall(
      (sdk.backend as any).processClipboardData(clipboardText),
      "Failed to process clipboard data",
    );

    if (
      result &&
      typeof result === "object" &&
      (("success" in result &&
        (result as any).success &&
        (result as any).item) ||
        ("kind" in result &&
          (result as any).kind === "Success" &&
          (result as any).value))
    ) {
      const item = (result as any).item || (result as any).value;
      const saved = await saveItemToBackend(panelNumber, item);
      if (saved) {
        sdk.window.showToast(
          `Data pasted to ${panelNumber === 1 ? "Original" : "Modified"}`,
          { variant: "success" },
        );
      }
    } else {
      sdk.window.showToast(
        (result as any)?.error || "Failed to process clipboard data",
        { variant: "error" },
      );
    }
  } catch (error) {
    sdk.window.showToast("Failed to read clipboard", { variant: "error" });
  } finally {
    panelState.loading = false;
  }
};

const handleLoad = (panelNumber: 1 | 2) => {
  const panelState =
    panelNumber === 1 ? originalState.value : modifiedState.value;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "*/*";

  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    panelState.loading = true;

    try {
      const text = await file.text();

      const result = await handleApiCall(
        (sdk.backend as any).processFileUpload(text, file.name),
        "Failed to process file",
      );

      if (
        result &&
        typeof result === "object" &&
        (("success" in result &&
          (result as any).success &&
          (result as any).item) ||
          ("kind" in result &&
            (result as any).kind === "Success" &&
            (result as any).value))
      ) {
        const item = (result as any).item || (result as any).value;
        const saved = await saveItemToBackend(panelNumber, item);
        if (saved) {
          sdk.window.showToast(
            `File "${file.name}" loaded to ${panelNumber === 1 ? "Original" : "Modified"}`,
            { variant: "success" },
          );
        }
      } else {
        sdk.window.showToast(
          (result as any)?.error || "Failed to process file",
          { variant: "error" },
        );
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
  const panelState =
    panelNumber === 1 ? originalState.value : modifiedState.value;

  if (panelState.selectedItems.length === 0) {
    sdk.window.showToast("No items selected", { variant: "warning" });
    return;
  }

  panelState.loading = true;

  try {
    const removePromises = panelState.selectedItems.map((item: CompareItem) =>
      handleApiCall(
        (sdk.backend as any).removeItemFromPanel(panelNumber, item.id),
        `Failed to remove item ${item.id} from ${panelNumber === 1 ? "Original" : "Modified"}`,
      ),
    );

    const results = await Promise.all(removePromises);
    const successCount = results.filter((result: any) => {
      if (result && typeof result === "object") {
        return result.kind === "Success" || result.success === true;
      }
      return false;
    }).length;

    if (successCount > 0) {
      // Reload panel data to reflect changes
      await loadPanelData(panelNumber);
      sdk.window.showToast(
        `Removed ${successCount} item(s) from ${panelNumber === 1 ? "Original" : "Modified"}`,
        { variant: "success" },
      );
    }
  } finally {
    panelState.loading = false;
  }
};

const handleClear = async (panelNumber: 1 | 2) => {
  const panelState =
    panelNumber === 1 ? originalState.value : modifiedState.value;

  if (panelState.items.length === 0) {
    sdk.window.showToast(
      `${panelNumber === 1 ? "Original" : "Modified"} is already empty`,
      { variant: "info" },
    );
    return;
  }

  panelState.loading = true;

  try {
    const result = await handleApiCall(
      (sdk.backend as any).clearPanelData(panelNumber),
      `Failed to clear ${panelNumber === 1 ? "Original" : "Modified"}`,
    );

    if (
      result &&
      typeof result === "object" &&
      ((result as any).kind === "Success" || (result as any).success === true)
    ) {
      // Reload panel data to reflect changes
      await loadPanelData(panelNumber);
      sdk.window.showToast(
        `${panelNumber === 1 ? "Original" : "Modified"} cleared`,
        { variant: "success" },
      );
    } else {
      sdk.window.showToast(
        (result as any)?.error ||
          `Failed to clear ${panelNumber === 1 ? "Original" : "Modified"}`,
        { variant: "error" },
      );
    }
  } finally {
    panelState.loading = false;
  }
};

let batchTransferQueue: CompareItem[] = [];
let batchTransferTimeout: number | null = null;
let currentTransferPanel: 1 | 2 | null = null;

const handleTransfer = (item: CompareItem, fromPanel: 1 | 2) => {
  batchTransferQueue.push(item);
  currentTransferPanel = fromPanel;

  if (batchTransferTimeout) {
    clearTimeout(batchTransferTimeout);
  }

  batchTransferTimeout = setTimeout(async () => {
    await processBatchTransfer(currentTransferPanel!);
  }, 100) as any; // Small delay to allow batching multiple selections
};

const processBatchTransfer = async (fromPanel: 1 | 2) => {
  if (batchTransferQueue.length === 0) return;

  const toPanel = fromPanel === 1 ? 2 : 1;
  const fromPanelState =
    fromPanel === 1 ? originalState.value : modifiedState.value;
  const toPanelState =
    fromPanel === 1 ? modifiedState.value : originalState.value;
  const itemsToTransfer = [...batchTransferQueue];

  batchTransferQueue = [];
  batchTransferTimeout = null;
  currentTransferPanel = null;

  fromPanelState.loading = true;
  toPanelState.loading = true;

  try {
    let successCount = 0;
    let failureCount = 0;

    for (const item of itemsToTransfer) {
      try {
        const saved = await saveItemToBackend(toPanel, item);

        if (saved) {
          const removeResult = await handleApiCall(
            (sdk.backend as any).removeItemFromPanel(fromPanel, item.id),
            `Failed to remove item from ${fromPanel === 1 ? "Original" : "Modified"}`,
          );

          if (
            removeResult &&
            typeof removeResult === "object" &&
            ((removeResult as any).kind === "Success" ||
              (removeResult as any).success === true)
          ) {
            successCount++;
          } else {
            failureCount++;
          }
        } else {
          failureCount++;
        }
      } catch (error) {
        failureCount++;
        console.error(`Failed to transfer item ${item.id}:`, error);
      }
    }

    if (successCount > 0) {
      const message =
        itemsToTransfer.length === 1
          ? `Item transferred from ${fromPanel === 1 ? "Original" : "Modified"} to ${toPanel === 1 ? "Original" : "Modified"}`
          : `${successCount} item${successCount > 1 ? "s" : ""} transferred from ${fromPanel === 1 ? "Original" : "Modified"} to ${toPanel === 1 ? "Original" : "Modified"}`;

      sdk.window.showToast(message, { variant: "success" });
    }

    if (failureCount > 0) {
      const message =
        itemsToTransfer.length === 1
          ? "Failed to transfer item"
          : `${failureCount} item${failureCount > 1 ? "s" : ""} failed to transfer`;

      sdk.window.showToast(message, { variant: "error" });
    }
  } catch (error) {
    sdk.window.showToast(`Batch transfer failed: ${(error as Error).message}`, {
      variant: "error",
    });
  } finally {
    fromPanelState.loading = false;
    toPanelState.loading = false;

    await Promise.all([loadPanelData(fromPanel), loadPanelData(toPanel)]);
  }
};

const performComparison = (type: "words" | "bytes") => {
  if (
    originalState.value.items.length === 0 ||
    modifiedState.value.items.length === 0
  ) {
    sdk.window.showToast(
      "Both Original and Modified must have data to compare",
      { variant: "warning" },
    );
    return;
  }

  if (originalState.value.selectedItems.length === 0) {
    sdk.window.showToast("Please select exactly one item from Original", {
      variant: "warning",
    });
    return;
  }

  if (modifiedState.value.selectedItems.length === 0) {
    sdk.window.showToast("Please select exactly one item from Modified", {
      variant: "warning",
    });
    return;
  }

  if (originalState.value.selectedItems.length > 1) {
    sdk.window.showToast(
      "Please select only one item from Original for comparison",
      { variant: "warning" },
    );
    return;
  }

  if (modifiedState.value.selectedItems.length > 1) {
    sdk.window.showToast(
      "Please select only one item from Modified for comparison",
      { variant: "warning" },
    );
    return;
  }

  const item1 = originalState.value.selectedItems[0]!;
  const item2 = modifiedState.value.selectedItems[0]!;

  uiState.value.comparisonInProgress = true;

  try {
    const text1 =
      typeof item1.data === "string"
        ? item1.data
        : JSON.stringify(item1.data, null, 2);
    const text2 =
      typeof item2.data === "string"
        ? item2.data
        : JSON.stringify(item2.data, null, 2);

    const { diffs1, diffs2 } =
      type === "words"
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
      timestamp: new Date(),
    };

    uiState.value.showComparisonModal = true;

    sdk.window.showToast(
      `${type === "words" ? "Words" : "Bytes"} comparison completed`,
      { variant: "success" },
    );
  } catch (error) {
    sdk.window.showToast(`Comparison failed: ${(error as Error).message}`, {
      variant: "error",
    });
    console.error("Comparison error:", error);
  } finally {
    uiState.value.comparisonInProgress = false;
  }
};

const handleCompareWords = () => performComparison("words");
const handleCompareBytes = () => performComparison("bytes");

const handleComparisonModalClose = () => {
  uiState.value.showComparisonModal = false;
  currentComparison.value = null;
};

const handleModalVisibilityUpdate = (value: boolean) => {
  uiState.value.showComparisonModal = value;
};

const handleTabSwitch = (tab: string) => {
  currentTab.value = tab;
};

const updateOriginalSelection = (items: CompareItem[]) => {
  originalState.value.selectedItems = items;
};

const updateModifiedSelection = (items: CompareItem[]) => {
  modifiedState.value.selectedItems = items;
};

const initializeData = async () => {
  uiState.value.loading = true;

  try {
    await Promise.all([loadPanelData(1), loadPanelData(2)]);

    console.log("Compare plugin data loaded successfully");
  } catch (error) {
    sdk.window.showToast("Failed to load plugin data", { variant: "error" });
    console.error("Data loading error:", error);
  } finally {
    uiState.value.loading = false;
  }
};

onMounted(async () => {
  await initializeData();

  const handleDataUpdate = (event: CustomEvent) => {
    const { panel } = event.detail;
    console.log(`Data updated for panel ${panel} - refreshing...`);
    if (panel === 1 || panel === 2) {
      loadPanelData(panel);
    } else {
      loadPanelData(1);
      loadPanelData(2);
    }
  };

  window.addEventListener(
    "compare-data-updated",
    handleDataUpdate as EventListener,
  );

  try {
    if (
      "events" in sdk &&
      sdk.events &&
      typeof (sdk.events as any).onProjectChange === "function"
    ) {
      (sdk.events as any).onProjectChange(() => {
        console.log("Project changed - reloading Compare plugin data");
        initializeData();
      });
      console.log("Compare plugin initialized with project change detection");
    } else {
      console.log(
        "Project change listener not available, data will persist across projects",
      );
    }
  } catch (error) {
    console.log(
      "Project change listener not available, data will persist across projects",
    );
  }
});
</script>

<template>
  <div class="h-full flex flex-col gap-1">
    <!-- Header -->
    <CompareHeader :current-tab="currentTab" @switch-tab="handleTabSwitch" />

    <!-- Tab Content -->
    <div class="flex-1 min-h-0">
      <!-- Compare Tab -->
      <div v-if="currentTab === 'compare'" class="h-full flex flex-col gap-1.5">
        <!-- Main content area -->
        <div class="flex-1 min-h-0 flex gap-1.5">
          <!-- Original Panel -->
          <div class="w-1/2 min-w-0 h-full">
            <ComparePanel
              :panel-number="1"
              :panel-state="originalState"
              :comparison-in-progress="uiState.comparisonInProgress"
              @paste="handlePaste"
              @load="handleLoad"
              @remove="handleRemove"
              @clear="handleClear"
              @transfer="handleTransfer"
              @update:selection="updateOriginalSelection"
            />
          </div>

          <!-- Modified Panel -->
          <div class="w-1/2 min-w-0 h-full">
            <ComparePanel
              :panel-number="2"
              :panel-state="modifiedState"
              :comparison-in-progress="uiState.comparisonInProgress"
              @paste="handlePaste"
              @load="handleLoad"
              @remove="handleRemove"
              @clear="handleClear"
              @transfer="handleTransfer"
              @update:selection="updateModifiedSelection"
            />
          </div>
        </div>

        <!-- Bottom Controls -->
        <CompareControls
          :panel1-state="originalState"
          :panel2-state="modifiedState"
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
      @update:visible="handleModalVisibilityUpdate"
      @close="handleComparisonModalClose"
    />
  </div>
</template>
