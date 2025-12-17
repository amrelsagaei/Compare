<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Toolbar from "primevue/toolbar";
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
  <div class="h-full flex flex-col bg-surface-50 dark:bg-surface-900 rounded-md border border-surface-200 dark:border-surface-700 overflow-hidden">
    <!-- Panel Header -->
    <div class="flex items-center justify-between px-3 py-2 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 flex-shrink-0">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-surface-800 dark:text-white">{{ panelTitle }}</span>
      </div>
    </div>
    
    <!-- Panel Controls -->
    <Toolbar class="flex-shrink-0 border-b border-surface-200 dark:border-surface-700">
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
        scroll-height="flex"
        class="text-sm h-full"
        :loading="panelState.loading"
        @row-contextmenu="onRowContextMenu"
        removable-sort
        :pt="{
          root: { class: 'h-full flex flex-col' },
          wrapper: { class: 'flex-1 min-h-0' },
          table: { class: 'min-w-full' },
          thead: { class: 'bg-surface-100 dark:bg-surface-800' },
          tbody: { class: 'bg-white dark:bg-surface-900' },
          bodyRow: ({ context }: any) => ({
            class: [
              'cursor-pointer',
              context.selected 
                ? 'bg-surface-700 dark:bg-surface-700' 
                : context.index % 2 === 0 
                  ? 'bg-surface-800 dark:bg-surface-800' 
                  : 'bg-surface-900 dark:bg-surface-900'
            ].join(' ')
          })
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
            <span class="text-xs text-surface-400 dark:text-surface-300">
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
  </div>
</template>

<style scoped>
:deep(.p-datatable) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.p-datatable-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: auto !important;
}

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

[data-mode="dark"] :deep(.p-datatable-wrapper)::-webkit-scrollbar-track {
  background: var(--surface-700);
}

[data-mode="dark"] :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb {
  background: var(--surface-600);
}

[data-mode="dark"] :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb:hover {
  background: var(--surface-500);
}

:deep(.p-datatable-tbody > tr.p-datatable-row-selected),
:deep(.p-datatable-tbody > tr.p-highlight) {
  background-color: #3f3f46 !important;
}

:deep(.p-datatable-tbody > tr.p-datatable-row-selected > td),
:deep(.p-datatable-tbody > tr.p-highlight > td) {
  background-color: transparent !important;
}

:deep(.p-datatable-tbody > tr.p-datatable-row-selected:hover),
:deep(.p-datatable-tbody > tr.p-highlight:hover) {
  background-color: #7c7c7cff !important;
}
</style>

<script lang="ts">
export default {
  name: 'ComparePanel'
};
</script>