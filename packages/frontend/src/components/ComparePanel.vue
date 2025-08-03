<script setup lang="ts">
import { ref, computed } from "vue";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Toolbar from "primevue/toolbar";
import Panel from "primevue/panel";
import Badge from "primevue/badge";
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
  "update:selection": [items: CompareItem[]];
}>();

// Computed
const selectedItems = computed({
  get: () => props.panelState.selectedItems,
  set: (value: CompareItem[]) => emit("update:selection", value)
});

const panelTitle = computed(() => `Panel ${props.panelNumber}`);

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
</script>

<template>
  <Panel :header="panelTitle" class="h-full flex flex-col min-w-0">
    <template #icons>
      <Badge 
        v-if="panelState.items.length > 0" 
        :value="panelState.items.length" 
        class="ml-2" 
      />
    </template>
    
    <!-- Panel Controls -->
    <Toolbar class="mb-3">
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
    <div class="flex-1 overflow-hidden min-w-0">
      <DataTable 
        :selection="selectedItems"
        @update:selection="handleSelectionUpdate"
        :value="panelState.items"
        selection-mode="multiple"
        :meta-key-selection="false"
        scrollable
        scroll-height="100%"
        class="text-sm"
        :loading="panelState.loading"
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
        <Column field="timestamp" header="Time" sortable header-style="width: 6rem">
          <template #body="{ data }">
            <span class="text-xs text-surface-600 dark:text-surface-400">
              {{ formatTimestamp(data.timestamp) }}
            </span>
          </template>
        </Column>
      </DataTable>
    </div>
  </Panel>
</template>

<script lang="ts">
export default {
  name: 'ComparePanel'
};
</script>