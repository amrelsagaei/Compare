<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Toolbar from "primevue/toolbar";
import Panel from "primevue/panel";
import Badge from "primevue/badge";
import ContextMenu from "primevue/contextmenu";
import type { CompareItem, PanelState } from "../types";

// Props
interface Props {
  panelNumber: 1 | 2;
  panelState: PanelState;
  comparisonInProgress: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  paste: [panelNumber: 1 | 2];
  load: [panelNumber: 1 | 2];
  remove: [panelNumber: 1 | 2];
  clear: [panelNumber: 1 | 2];
  transfer: [item: CompareItem, fromPanel: 1 | 2];
  "update:selection": [items: CompareItem[]];
}>();

// Computed
const selectedItems = computed({
  get: () => props.panelState.selectedItems,
  set: (value: CompareItem[]) => emit("update:selection", value)
});

const panelTitle = computed(() => props.panelNumber === 1 ? 'Original' : 'Modified');

// Context menu state
const contextMenu = ref();
const selectedItemForTransfer = ref<CompareItem | null>(null);

// Helper functions
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString();
};

// Selection handler
const handleSelectionUpdate = (newSelection: CompareItem[]) => {
  selectedItems.value = newSelection;
};

// Event handlers
const handlePaste = () => emit("paste", props.panelNumber);
const handleLoad = () => emit("load", props.panelNumber);
const handleRemove = () => emit("remove", props.panelNumber);
const handleClear = () => emit("clear", props.panelNumber);

// Context menu functionality
const contextMenuItems = computed(() => {
  const selectedCount = props.panelState.selectedItems.length;
  const hasSelection = selectedCount > 0;
  const transferLabel = hasSelection 
    ? `Transfer ${selectedCount} item${selectedCount > 1 ? 's' : ''} to ${props.panelNumber === 1 ? 'Modified' : 'Original'}`
    : `Transfer to ${props.panelNumber === 1 ? 'Modified' : 'Original'}`;

  return [
    {
      label: transferLabel,
      icon: 'fas fa-exchange-alt',
      command: () => {
        // If multiple items are selected, transfer all of them
        if (hasSelection) {
          props.panelState.selectedItems.forEach(item => {
            emit("transfer", item, props.panelNumber);
          });
        } else if (selectedItemForTransfer.value) {
          // Fallback to single item if no selection
          emit("transfer", selectedItemForTransfer.value, props.panelNumber);
        }
      }
    }
  ];
});

const onRowContextMenu = (event: any) => {
  selectedItemForTransfer.value = event.data;
  contextMenu.value.show(event.originalEvent);
};
</script>

<template>
  <Panel :header="panelTitle" class="h-full min-w-0" :pt="{ content: { class: 'flex flex-col p-0', style: 'height: calc(85vh - 150px)' } }">
    <template #icons>
      <Badge 
        v-if="panelState.items.length > 0" 
        :value="panelState.items.length" 
        class="ml-2" 
      />
    </template>
    
    <!-- Panel Controls -->
    <Toolbar class="mb-3 flex-shrink-0">
      <template #start>
        <div class="flex gap-2">
          <Button 
            label="Paste" 
            icon="fas fa-paste" 
            size="small"
            @click="handlePaste"
            :disabled="comparisonInProgress || panelState.loading"
            :loading="panelState.loading"
          />
          <Button 
            label="Load" 
            icon="fas fa-folder-open" 
            size="small"
            @click="handleLoad"
            :disabled="comparisonInProgress || panelState.loading"
            :loading="panelState.loading"
          />
          <Button 
            label="Remove" 
            icon="fas fa-trash" 
            severity="danger"
            size="small"
            @click="handleRemove"
            :disabled="panelState.selectedItems.length === 0 || comparisonInProgress || panelState.loading"
            :loading="panelState.loading"
          />
          <Button 
            label="Clear" 
            icon="fas fa-times" 
            severity="secondary"
            size="small"
            @click="handleClear"
            :disabled="panelState.items.length === 0 || comparisonInProgress || panelState.loading"
            :loading="panelState.loading"
          />
        </div>
      </template>
    </Toolbar>

    <!-- Panel Data Table -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <DataTable 
        :selection="selectedItems"
        @update:selection="handleSelectionUpdate"
        :value="panelState.items"
        selection-mode="multiple"
        :meta-key-selection="false"
        scrollable
        scroll-height="calc(85vh - 250px)"
        class="text-sm"
        :loading="panelState.loading"
        @row-contextmenu="onRowContextMenu"
        :pt="{
          table: { class: 'min-w-full' },
          thead: { class: 'bg-surface-100 dark:bg-surface-800' },
          tbody: { class: 'bg-white dark:bg-surface-900' }
        }"
      >
        <Column selection-mode="multiple" header-style="width: 3rem" />
        <Column field="id" header="ID" sortable header-style="width: 4rem" />
        <Column field="length" header="Length" sortable header-style="width: 6rem">
          <template #body="{ data }">
            <span class="font-mono text-xs">{{ formatNumber(data.length) }}</span>
          </template>
        </Column>
        <Column field="preview" header="Data" header-style="width: auto">
          <template #body="{ data }">
            <div class="font-mono text-xs text-surface-700 dark:text-surface-300 truncate max-w-48">
              {{ data.preview }}
            </div>
          </template>
        </Column>
        <Column field="type" header="Type" sortable header-style="width: 5rem">
          <template #body="{ data }">
            <Badge 
              :value="data.type" 
              :data-type="data.type"
              class="type-badge"
            />
          </template>
        </Column>
        <Column field="timestamp" header="Time" sortable header-style="width: 9rem">
          <template #body="{ data }">
            <span class="text-xs text-surface-600 dark:text-surface-400">
              {{ formatTimestamp(data.timestamp) }}
            </span>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Context Menu -->
    <ContextMenu 
      ref="contextMenu" 
      :model="contextMenuItems" 
      class="text-sm"
    />
  </Panel>
</template>

<style scoped>
/* Ensure proper height constraints for scrolling */
:deep(.p-panel-content) {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

:deep(.p-datatable-wrapper) {
  overflow: auto !important;
}

/* Custom scrollbar for better UX */
:deep(.p-datatable-wrapper)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

:deep(.p-datatable-wrapper)::-webkit-scrollbar-track {
  background: var(--surface-200);
  border-radius: 4px;
}

:deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb {
  background: var(--surface-400);
  border-radius: 4px;
}

:deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb:hover {
  background: var(--surface-500);
}

/* Dark mode scrollbar */
[data-mode="dark"] :deep(.p-datatable-wrapper)::-webkit-scrollbar-track {
  background: var(--surface-700);
}

[data-mode="dark"] :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb {
  background: var(--surface-600);
}

[data-mode="dark"] :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb:hover {
  background: var(--surface-500);
}
</style>

<script lang="ts">
export default {
  name: 'ComparePanel'
};
</script>