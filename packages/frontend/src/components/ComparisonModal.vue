<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox';
import Badge from 'primevue/badge';

import { ComparisonResult, ComparisonDiff, generateComparisonStats } from '../utils/comparisonEngine';

// Props
interface Props {
  visible: boolean;
  comparisonResult: ComparisonResult | null;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean];
  'close': [];
}>();

// State
const syncViews = ref(false);
const leftScrollArea = ref<HTMLElement>();
const rightScrollArea = ref<HTMLElement>();

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const comparisonStats = computed(() => {
  if (!props.comparisonResult) return null;
  
  // Use the fixed stats function with the comparison type
  return generateComparisonStats(
    props.comparisonResult.diffs1, 
    props.comparisonResult.diffs2, 
    props.comparisonResult.type
  );
});

// Methods
const getDiffClass = (type: ComparisonDiff['type']): string => {
  switch (type) {
    case 'added':
      return 'bg-green-700 text-white font-medium';
    case 'deleted':
      return 'bg-red-700 text-white font-medium';
    case 'modified':
      return 'bg-orange-700 text-white font-medium';
    case 'unchanged':
      return 'text-surface-700 dark:text-surface-300';
    default:
      return '';
  }
};

const handleClose = () => {
  emit('close');
  emit('update:visible', false);
};

// Sync scrolling functionality
const handleScroll = (event: Event, isLeft: boolean) => {
  if (!syncViews.value) return;
  
  const source = event.target as HTMLElement;
  const target = isLeft ? rightScrollArea.value : leftScrollArea.value;
  
  if (target && source.scrollTop !== target.scrollTop) {
    target.scrollTop = source.scrollTop;
  }
  
  if (target && source.scrollLeft !== target.scrollLeft) {
    target.scrollLeft = source.scrollLeft;
  }
};

const setupScrollListeners = () => {
  if (leftScrollArea.value) {
    leftScrollArea.value.addEventListener('scroll', (e) => handleScroll(e, true));
  }
  if (rightScrollArea.value) {
    rightScrollArea.value.addEventListener('scroll', (e) => handleScroll(e, false));
  }
};

const removeScrollListeners = () => {
  if (leftScrollArea.value) {
    leftScrollArea.value.removeEventListener('scroll', (e) => handleScroll(e, true));
  }
  if (rightScrollArea.value) {
    rightScrollArea.value.removeEventListener('scroll', (e) => handleScroll(e, false));
  }
};

// Watch for visibility changes to setup scroll listeners
watch(isVisible, (newVisible) => {
  if (newVisible) {
    nextTick(() => {
      setupScrollListeners();
    });
  } else {
    removeScrollListeners();
  }
});

onMounted(() => {
  if (isVisible.value) {
    setupScrollListeners();
  }
});

onUnmounted(() => {
  removeScrollListeners();
});
</script>

<template>
  <Dialog
    :visible="isVisible"
    @update:visible="isVisible = $event"
    modal
    :closable="true"
    :draggable="false"
    class="comparison-modal"
    :style="{ width: 'min(90vw, 1400px)', height: 'min(80vh, 800px)' }"
    @hide="handleClose"
  >
          <template #header>
        <div class="flex items-center gap-4">
          <i class="fas fa-columns text-primary"></i>
          <span class="text-lg font-semibold">
            Comparison Results: {{ comparisonResult?.type === 'words' ? 'Words' : 'Bytes' }}
          </span>
        </div>
      </template>

    <div v-if="comparisonResult" class="h-full flex flex-col">
      <!-- Comparison Info Header -->
      <div class="bg-surface-50 dark:bg-surface-800 p-3 rounded-lg mb-3">
        <div class="grid grid-cols-2 gap-6">
          <div>
            <h3 class="font-semibold text-sm text-surface-700 dark:text-surface-300 mb-2">
              Original (ID: {{ comparisonResult.id1 }})
            </h3>
            <div class="flex flex-wrap gap-2 text-xs">
              <Badge :value="`Length: ${comparisonResult.length1}`" severity="info" />
              <Badge :value="`Source: ${comparisonResult.source1 || 'Unknown'}`" severity="secondary" />
            </div>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-surface-700 dark:text-surface-300 mb-2">
              Modified (ID: {{ comparisonResult.id2 }})
            </h3>
            <div class="flex flex-wrap gap-2 text-xs">
              <Badge :value="`Length: ${comparisonResult.length2}`" severity="info" />
              <Badge :value="`Source: ${comparisonResult.source2 || 'Unknown'}`" severity="secondary" />
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Content -->
      <div class="flex-1 grid grid-cols-2 gap-4 min-h-0 max-h-full">
        <!-- Left Panel -->
        <div class="border border-surface-300 dark:border-surface-700 rounded-lg overflow-hidden">
          <div class="bg-surface-100 dark:bg-surface-800 px-3 py-2 border-b border-surface-300 dark:border-surface-700">
            <span class="text-sm font-medium">Original (ID: {{ comparisonResult.id1 }})</span>
          </div>
          <div 
            ref="leftScrollArea"
            class="h-full overflow-auto p-4 bg-surface-0 dark:bg-surface-900 font-mono text-sm leading-relaxed"
            style="height: calc(100% - 40px);"
          >
            <span 
              v-for="(diff, index) in comparisonResult.diffs1" 
              :key="`left-${index}`"
              :class="getDiffClass(diff.type)"
              class="whitespace-pre-wrap"
            >{{ diff.content }}</span>
          </div>
        </div>

        <!-- Right Panel -->
        <div class="border border-surface-300 dark:border-surface-700 rounded-lg overflow-hidden">
          <div class="bg-surface-100 dark:bg-surface-800 px-3 py-2 border-b border-surface-300 dark:border-surface-700">
            <span class="text-sm font-medium">Modified (ID: {{ comparisonResult.id2 }})</span>
          </div>
          <div 
            ref="rightScrollArea"
            class="h-full overflow-auto p-4 bg-surface-0 dark:bg-surface-900 font-mono text-sm leading-relaxed"
            style="height: calc(100% - 40px);"
          >
            <span 
              v-for="(diff, index) in comparisonResult.diffs2" 
              :key="`right-${index}`"
              :class="getDiffClass(diff.type)"
              class="whitespace-pre-wrap"
            >{{ diff.content }}</span>
          </div>
        </div>
      </div>
    </div>

          <template #footer>
        <div class="flex justify-between items-center w-full">
          <!-- Bottom Left - Comparison Statistics -->
          <div v-if="comparisonStats" class="flex gap-4 text-xs">
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 bg-green-600" style="border-radius: 2px;"></div>
              <span>Added: {{ comparisonStats.added }}</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 bg-red-600" style="border-radius: 2px;"></div>
              <span>Deleted: {{ comparisonStats.deleted }}</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 bg-orange-600" style="border-radius: 2px;"></div>
              <span>Modified: {{ comparisonStats.modified }}</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 bg-surface-500" style="border-radius: 2px;"></div>
              <span>Unchanged: {{ comparisonStats.unchanged }}</span>
            </div>
          </div>

          <!-- Bottom Right - Sync Views -->
          <div class="flex items-center gap-2">
            <Checkbox 
              v-model="syncViews" 
              :binary="true" 
              input-id="sync-views"
            />
            <label for="sync-views" class="text-sm font-medium">
              Sync Views
            </label>
          </div>
        </div>
      </template>
  </Dialog>
</template>

<style scoped>
.comparison-modal :deep(.p-dialog) {
  max-width: min(95vw, 1400px);
  max-height: min(90vh, 800px);
}

.comparison-modal :deep(.p-dialog-content) {
  padding: 1rem;
  height: calc(100% - 120px);
  overflow: hidden;
}

.comparison-modal :deep(.p-dialog-header) {
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
}

.comparison-modal :deep(.p-dialog-footer) {
  padding: 1rem;
  border-top: 1px solid var(--surface-border);
  flex-shrink: 0;
  margin-top: auto;
}

/* Custom highlighting styles */
.text-green-800 { color: #166534; }
.text-green-200 { color: #bbf7d0; }
.bg-green-100 { background-color: #dcfce7; }
.dark .bg-green-900\/30 { background-color: rgba(20, 83, 45, 0.3); }

.text-red-800 { color: #991b1b; }
.text-red-200 { color: #fecaca; }
.bg-red-100 { background-color: #fee2e2; }
.dark .bg-red-900\/30 { background-color: rgba(127, 29, 29, 0.3); }

.text-orange-800 { color: #9a3412; }
.text-orange-200 { color: #fed7aa; }
.bg-orange-100 { background-color: #ffedd5; }
.dark .bg-orange-900\/30 { background-color: rgba(154, 52, 18, 0.3); }
</style>

<script lang="ts">
export default {
  name: 'ComparisonModal'
};
</script>