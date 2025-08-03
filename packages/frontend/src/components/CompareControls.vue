<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";
import type { PanelState } from "../types";

// Props
interface Props {
  panel1State: PanelState;
  panel2State: PanelState;
  comparisonInProgress: boolean;
}

const props = defineProps<Props>();

// Computed properties for button states
const canCompare = computed(() => {
  return (
    !props.comparisonInProgress &&
    props.panel1State.items.length > 0 &&
    props.panel2State.items.length > 0 &&
    props.panel1State.selectedItems.length === 1 &&
    props.panel2State.selectedItems.length === 1
  );
});

// Emits
const emit = defineEmits<{
  compareWords: [];
  compareBytes: [];
}>();

// Event handlers
const handleCompareWords = () => emit("compareWords");
const handleCompareBytes = () => emit("compareBytes");
</script>

<template>
  <div class="border-t border-surface-300 dark:border-surface-700 mt-4 pt-4 bg-surface-0 dark:bg-surface-900">
    <div class="flex justify-center">
      <div class="flex gap-4">
        <Button 
          label="Compare Words" 
          icon="fas fa-spell-check" 
          @click="handleCompareWords"
          :disabled="!canCompare"
          class="min-w-32"
        />
        <Button 
          label="Compare Bytes" 
          icon="fas fa-binary" 
          @click="handleCompareBytes"
          :disabled="!canCompare"
          severity="secondary"
          class="min-w-32"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'CompareControls'
};
</script>