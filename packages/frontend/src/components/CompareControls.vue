<script setup lang="ts">
import Button from "primevue/button";
import { computed } from "vue";

import type { PanelState } from "../types";

interface Props {
  panel1State: PanelState;
  panel2State: PanelState;
  comparisonInProgress: boolean;
}

const props = defineProps<Props>();

const canCompare = computed(() => {
  return (
    !props.comparisonInProgress &&
    props.panel1State.items.length > 0 &&
    props.panel2State.items.length > 0 &&
    props.panel1State.selectedItems.length === 1 &&
    props.panel2State.selectedItems.length === 1
  );
});

const emit = defineEmits<{
  compareWords: [];
  compareBytes: [];
}>();

const handleCompareWords = () => emit("compareWords");
const handleCompareBytes = () => emit("compareBytes");
</script>

<template>
  <div class="py-3 flex justify-center">
    <div class="flex gap-4">
      <Button
        label="Compare Words"
        icon="fas fa-spell-check"
        :disabled="!canCompare"
        class="min-w-32"
        @click="handleCompareWords"
      />
      <Button
        label="Compare Bytes"
        icon="fas fa-code"
        :disabled="!canCompare"
        severity="secondary"
        class="min-w-32"
        @click="handleCompareBytes"
      />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: "CompareControls",
};
</script>
