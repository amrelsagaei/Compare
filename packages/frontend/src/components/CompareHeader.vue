<script setup lang="ts">
interface Props {
  currentTab?: string;
}

interface Emits {
  (e: 'switch-tab', tab: string): void;
}

withDefaults(defineProps<Props>(), {
  currentTab: 'compare'
});

const emit = defineEmits<Emits>();

const switchToTab = (tab: string) => {
  emit('switch-tab', tab);
};
</script>

<script lang="ts">
export default {
  name: 'CompareHeader'
};
</script>

<template>
  <div class="mb-4">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">
        <i class="fas fa-columns mr-2 text-primary-600"></i>
        Compare
      </h1>
      
      <!-- Navigation Buttons -->
      <div class="flex items-center gap-2">
        <!-- Back Arrow (only visible in docs) -->
        <button
          v-if="currentTab === 'docs'"
          @click="switchToTab('compare')"
          class="px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700"
        >
          <i class="fas fa-arrow-left text-sm"></i>
        </button>
        
        <!-- Docs Button (only visible in compare) -->
        <button
          v-if="currentTab === 'compare'"
          @click="switchToTab('docs')"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700"
        >
          <i class="fas fa-book text-sm"></i>
          Docs
        </button>
      </div>
    </div>
    
    <p class="text-surface-100 dark:text-surface-100">
      {{ currentTab === 'docs' 
          ? 'Master the Compare plugin with comprehensive guides and examples' 
          : 'Compare requests, responses, and files with visual difference highlighting' 
      }}
    </p>
  </div>
</template>