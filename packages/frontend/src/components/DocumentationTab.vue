<script setup lang="ts">
import { ref } from 'vue';

interface Emits {
  (e: 'switch-tab', tab: string): void;
}

const emit = defineEmits<Emits>();

// Toast notification system
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const toasts = ref<Toast[]>([]);
let toastId = 0;

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  const id = toastId++;
  const toast = { id, message, type };
  toasts.value.push(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    const index = toasts.value.findIndex((t: Toast) => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  }, 3000);
};

// Copy to clipboard with specific toast messages
const copyToClipboard = (text: string, type: string) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      if (type === 'email') {
        showToast('Email copied to clipboard!', 'success');
      } else if (type === 'linkedin') {
        showToast('LinkedIn copied to clipboard!', 'success');
      } else if (type === 'twitter') {
        showToast('X/Twitter copied to clipboard!', 'success');
      } else if (type === 'website') {
        showToast('Website copied to clipboard!', 'success');
      } else {
        showToast('Link copied to clipboard!', 'success');
      }
    })
    .catch(err => {
      console.error('Failed to copy text:', err);
      
      // Fallback method
      try {
        const tempInput = document.createElement('input');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        if (type === 'email') {
          showToast('Email copied to clipboard!', 'success');
        } else if (type === 'linkedin') {
          showToast('LinkedIn copied to clipboard!', 'success');
        } else if (type === 'twitter') {
          showToast('X/Twitter copied to clipboard!', 'success');
        } else if (type === 'website') {
          showToast('Website copied to clipboard!', 'success');
        } else {
          showToast('Link copied to clipboard!', 'success');
        }
      } catch (e) {
        console.error('Fallback copy method failed:', e);
        showToast('Failed to copy link', 'error');
      }
    });
};
</script>

<script lang="ts">
export default {
  name: 'DocumentationTab'
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Main Content: Full Width Scrollable Area -->
    <div class="flex-1 overflow-y-auto p-6 bg-surface-900 dark:bg-surface-900">
      
      <!-- Quick Start Guide -->
      <div class="mb-8 bg-surface-800 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2 bg-green-500 bg-opacity-20 rounded-lg border border-green-500 border-opacity-30">
            <i class="fas fa-rocket text-white text-xl"></i>
          </div>
          <h3 class="text-xl font-bold text-surface-100 dark:text-surface-100 m-0">Quick Start Guide</h3>
        </div>
        <div class="bg-surface-700 dark:bg-surface-700 rounded-lg p-4 border border-surface-600 dark:border-surface-600">
          <p class="text-surface-300 dark:text-surface-300 mb-4">Get started with Compare in 4 simple steps:</p>
          <ol class="list-decimal pl-6 space-y-2 text-surface-100 dark:text-surface-100">
            <li><strong>Add Data:</strong> Paste content, load files, or send from HTTP History</li>
            <li><strong>Organize:</strong> Right-click items to transfer between Original and Modified</li>
            <li><strong>Select Items:</strong> Choose one item from Original and one from Modified</li>
            <li><strong>Compare:</strong> Click "Compare Words" or "Compare Bytes"</li>
            <li><strong>Analyze:</strong> Review differences with color-coded highlighting</li>
          </ol>
        </div>
      </div>

      <!-- Main Documentation Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        <!-- Data Input Methods -->
        <div class="bg-surface-800 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-blue-500 bg-opacity-20 rounded-lg border border-blue-500 border-opacity-30">
              <i class="fas fa-upload text-white text-xl"></i>
            </div>
            <h3 class="text-lg font-bold text-surface-100 dark:text-surface-100 m-0">Data Input Methods</h3>
          </div>
          <p class="text-surface-300 dark:text-surface-300 mb-4">Multiple ways to add data for comparison.</p>
          
          <h4 class="font-medium text-blue-400 dark:text-blue-400 mb-2">Available Methods:</h4>
          <ul class="list-disc pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100 mb-4">
            <li><strong>Paste:</strong> Copy content to clipboard and click "Paste"</li>
            <li><strong>Load File:</strong> Select files from your system</li>
            <li><strong>HTTP History:</strong> Right-click requests → "Compare: Send to Original/Modified"</li>
          </ul>
          
          <h4 class="font-medium text-blue-400 dark:text-blue-400 mb-2">File Support:</h4>
          <ul class="list-disc pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100">
            <li>Text files, HTTP requests/responses</li>
            <li>Up to 10MB file size limit</li>
            <li>Automatic content type detection</li>
          </ul>
        </div>

        <!-- Comparison Features -->
        <div class="bg-surface-800 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-orange-500 bg-opacity-20 rounded-lg border border-orange-500 border-opacity-30">
              <i class="fas fa-exchange-alt text-white text-xl"></i>
            </div>
            <h3 class="text-lg font-bold text-surface-100 dark:text-surface-100 m-0">Comparison Types</h3>
          </div>
          <p class="text-surface-300 dark:text-surface-300 mb-4">Choose the right comparison method for your data.</p>
          
          <h4 class="font-medium text-orange-400 dark:text-orange-400 mb-2">Word-Level Comparison:</h4>
          <ul class="list-disc pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100 mb-4">
            <li>Best for HTTP requests/responses</li>
            <li>Intelligent word-boundary detection</li>
            <li>Optimized for text content analysis</li>
          </ul>
          
          <h4 class="font-medium text-orange-400 dark:text-orange-400 mb-2">Byte-Level Comparison:</h4>
          <ul class="list-disc pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100">
            <li>Character-by-character analysis</li>
            <li>Precise difference detection</li>
            <li>Ideal for binary or encoded content</li>
          </ul>
        </div>

        <!-- Panel Management -->
        <div class="bg-surface-800 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-purple-500 bg-opacity-20 rounded-lg border border-purple-500 border-opacity-30">
              <i class="fas fa-cogs text-white text-xl"></i>
            </div>
            <h3 class="text-lg font-bold text-surface-100 dark:text-surface-100 m-0">Panel Management</h3>
          </div>
          <p class="text-surface-300 dark:text-surface-300 mb-4">Efficiently organize and manage your comparison data.</p>
          
          <h4 class="font-medium text-purple-400 dark:text-purple-400 mb-2">Operations:</h4>
          <ul class="list-disc pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100 mb-4">
            <li><strong>Remove:</strong> Delete selected items from Original/Modified</li>
            <li><strong>Clear:</strong> Remove all items from Original or Modified</li>
            <li><strong>Transfer:</strong> Right-click any item to transfer between panels</li>
            <li><strong>Multi-select:</strong> Bulk operations on multiple items</li>
          </ul>
          
          <h4 class="font-medium text-purple-400 dark:text-purple-400 mb-2">Selection:</h4>
          <ul class="list-disc pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100">
            <li>Click items to select for comparison</li>
            <li>Requires one item from Original and one from Modified</li>
            <li>Data automatically persists per project</li>
          </ul>
        </div>

        <!-- Comparison Results -->
        <div class="bg-surface-800 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-red-500 bg-opacity-20 rounded-lg border border-red-500 border-opacity-30">
              <i class="fas fa-search text-white text-xl"></i>
            </div>
            <h3 class="text-lg font-bold text-surface-100 dark:text-surface-100 m-0">Analysis Features</h3>
          </div>
          <p class="text-surface-300 dark:text-surface-300 mb-4">Advanced features to analyze comparison results.</p>
          
          <h4 class="font-medium text-red-400 dark:text-red-400 mb-2">Visual Highlighting:</h4>
          <ul class="list-disc pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100 mb-4">
            <li><span class="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs">Added</span> content in green</li>
            <li><span class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs">Deleted</span> content in red</li>
            <li><span class="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded text-xs">Modified</span> content in orange</li>
          </ul>
          
          <h4 class="font-medium text-red-400 dark:text-red-400 mb-2">Navigation:</h4>
          <ul class="list-disc pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100">
            <li>Sync Views for synchronized scrolling</li>
            <li>Side-by-side comparison layout</li>
            <li>Detailed statistics and counts</li>
          </ul>
        </div>
      </div>

      <!-- HTTP History Integration -->
      <div class="mb-8 bg-surface-800 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2 bg-indigo-500 bg-opacity-20 rounded-lg border border-indigo-500 border-opacity-30">
            <i class="fas fa-history text-white text-xl"></i>
          </div>
          <h3 class="text-xl font-bold text-surface-100 dark:text-surface-100 m-0">HTTP History Integration</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-surface-700 dark:bg-surface-700 rounded-lg p-4 border border-surface-600 dark:border-surface-600">
            <h4 class="font-medium text-indigo-400 dark:text-indigo-400 mb-2">Individual Requests:</h4>
            <ol class="list-decimal pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100">
              <li>Right-click any request in Caido HTTP History</li>
              <li>Select "Compare: Send to Original" or "Send to Modified"</li>
              <li>Request data appears automatically in Compare</li>
            </ol>
          </div>
          <div class="bg-surface-700 dark:bg-surface-700 rounded-lg p-4 border border-surface-600 dark:border-surface-600">
            <h4 class="font-medium text-indigo-400 dark:text-indigo-400 mb-2">Bulk Operations:</h4>
            <ol class="list-decimal pl-5 space-y-1 text-sm text-surface-100 dark:text-surface-100">
              <li>Select multiple requests (up to 25)</li>
              <li>Right-click → "Compare: Send to Original/Modified"</li>
              <li>All requests processed automatically</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- About Section -->
      <div class="bg-surface-800 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2 bg-primary-500 bg-opacity-20 rounded-lg border border-primary-500 border-opacity-30">
            <i class="fas fa-info-circle text-white text-xl"></i>
          </div>
          <h3 class="text-xl font-bold text-surface-100 dark:text-surface-100 m-0">About</h3>
        </div>
        
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-2xl font-bold text-surface-100 dark:text-surface-100">Compare</h3>
            <p class="text-sm text-surface-300 dark:text-surface-300">Version 1.0.0</p>
          </div>
          <button
            @click="copyToClipboard('https://github.com/amrelsagaei/compare', 'github')"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <i class="fab fa-github mr-2"></i>
            Star on GitHub
          </button>
        </div>

        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6 border-l-4 border-blue-500">
          <p class="text-surface-100 dark:text-surface-100 leading-relaxed">
            Compare is a professional Caido plugin for security professionals who need precise side-by-side 
            comparison of HTTP requests, responses, and files with visual difference highlighting.
          </p>
        </div>

        <div class="py-4 border-t border-surface-600 dark:border-surface-600">
          <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div class="text-sm text-surface-300 dark:text-surface-300">
              <span class="font-medium">Made with</span>
              <i class="fas fa-heart text-red-500 mx-1"></i>
              <span class="font-medium">by</span>
              <button
                @click="copyToClipboard('https://amrelsagaei.com', 'website')"
                class="font-medium text-primary-400 hover:text-primary-300 transition-colors ml-1"
              >
                Amr Elsagaei
              </button>
            </div>
            <div class="flex gap-4">
              <button
                @click="copyToClipboard('info@amrelsagaei.com', 'email')"
                class="text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
              >
                <i class="fas fa-envelope"></i>
                Email
              </button>
              <button
                @click="copyToClipboard('https://www.linkedin.com/in/amrelsagaei', 'linkedin')"
                class="text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
              >
                <i class="fab fa-linkedin"></i>
                LinkedIn
              </button>
              <button
                @click="copyToClipboard('https://x.com/amrelsagaei', 'twitter')"
                class="text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
              >
                <i class="fab fa-x-twitter"></i>
                X/Twitter
              </button>
            </div>
          </div>
        </div>
      </div>
      
    </div>
    
    <!-- Toast Notifications -->
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        :class="[
          'px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out',
          'flex items-center gap-2 min-w-64 max-w-96',
          toast.type === 'success' ? 'bg-green-600 text-white' :
          toast.type === 'error' ? 'bg-red-600 text-white' :
          'bg-blue-600 text-white'
        ]"
      >
        <i :class="[
          toast.type === 'success' ? 'fas fa-check-circle' :
          toast.type === 'error' ? 'fas fa-exclamation-circle' :
          'fas fa-info-circle'
        ]"></i>
        <span class="text-sm font-medium">{{ toast.message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: var(--surface-800);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: var(--surface-600);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: var(--surface-500);
}
</style>