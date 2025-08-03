import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
import { createApp } from "vue";

import { SDKPlugin } from "./plugins/sdk";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

// Command definitions for the plugin
const Commands = {
  sendToPanel1: "compare.send-to-panel-1",
  sendToPanel2: "compare.send-to-panel-2",
  sendRowsToPanel1: "compare.send-rows-to-panel-1", 
  sendRowsToPanel2: "compare.send-rows-to-panel-2",
} as const;

// Context menu command handler for Panel 1 - REQUESTS ONLY
const sendToPanel1 = async (sdk: FrontendSDK, context: any) => {
  try {
    // Extract request from context (simplified - requests only)
    let request = context.request;
    if (!request && context) {
      request = context;
    }
    
    if (!request) {
      throw new Error("No request found in context");
    }

    // Extract request information
    let requestInfo = {
      method: 'GET',
      host: request.host || 'unknown',
      path: request.path || '/',
      id: request.id || 'unknown',
      port: request.port || 80,
      isTls: request.isTls || false,
      query: request.query || '',
      raw: request.raw || ''
    };

    // Extract method from raw HTTP request
    if (request.raw && typeof request.raw === 'string') {
      const methodMatch = request.raw.match(/^([A-Z]+)\s+/);
      if (methodMatch) {
        requestInfo.method = methodMatch[1];
      }
    } else if (request.raw && request.raw.toText) {
      try {
        const rawText = request.raw.toText();
        const methodMatch = rawText.match(/^([A-Z]+)\s+/);
        if (methodMatch) {
          requestInfo.method = methodMatch[1];
        }
      } catch (e) {
        // Failed to extract method, use default
      }
    }

    // Create target URL
    const targetUrl = `${requestInfo.isTls ? "https" : "http"}://${requestInfo.host}:${requestInfo.port}`;
    const rawRequest = requestInfo.raw || '';

    // Send request to backend using the original function
    await (sdk.backend as any).addRequestToPanel(1, rawRequest, targetUrl, request);
    
    // Navigate to Compare page
    sdk.navigation.goTo("/compare");
    
    // Trigger frontend refresh
    window.dispatchEvent(new CustomEvent('compare-data-updated', { detail: { panel: 1 } }));
    
    // Show success notification
    try {
      await sdk.window.showToast("Request sent to Panel 1", {
        variant: 'success',
        duration: 3000
      });
    } catch (error) {
      console.log("Request sent to Panel 1");
    }
    
  } catch (error) {
    console.error("[Compare] Failed to send request to Panel 1:", error);
    
    // Show error notification
    try {
      await sdk.window.showToast(`Failed to send request: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        variant: 'error',
        duration: 3000
      });
    } catch (toastError) {
      console.error(`Failed to send request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Context menu command handler for Panel 2 - REQUESTS ONLY
const sendToPanel2 = async (sdk: FrontendSDK, context: any) => {
  try {
    // Extract request from context (simplified - requests only)
    let request = context.request;
    if (!request && context) {
      request = context;
    }
    
    if (!request) {
      throw new Error("No request found in context");
    }

    // Extract request information
    let requestInfo = {
      method: 'GET',
      host: request.host || 'unknown',
      path: request.path || '/',
      id: request.id || 'unknown',
      port: request.port || 80,
      isTls: request.isTls || false,
      query: request.query || '',
      raw: request.raw || ''
    };

    // Extract method from raw HTTP request
    if (request.raw && typeof request.raw === 'string') {
      const methodMatch = request.raw.match(/^([A-Z]+)\s+/);
      if (methodMatch) {
        requestInfo.method = methodMatch[1];
      }
    } else if (request.raw && request.raw.toText) {
      try {
        const rawText = request.raw.toText();
        const methodMatch = rawText.match(/^([A-Z]+)\s+/);
        if (methodMatch) {
          requestInfo.method = methodMatch[1];
        }
      } catch (e) {
        // Failed to extract method, use default
      }
    }

    // Create target URL
    const targetUrl = `${requestInfo.isTls ? "https" : "http"}://${requestInfo.host}:${requestInfo.port}`;
    const rawRequest = requestInfo.raw || '';

    // Send request to backend using the original function
    await (sdk.backend as any).addRequestToPanel(2, rawRequest, targetUrl, request);
    
    // Navigate to Compare page
    sdk.navigation.goTo("/compare");
    
    // Trigger frontend refresh
    window.dispatchEvent(new CustomEvent('compare-data-updated', { detail: { panel: 2 } }));
    
    // Show success notification
    try {
      await sdk.window.showToast("Request sent to Panel 2", {
        variant: 'success',
        duration: 3000
      });
    } catch (error) {
      console.log("Request sent to Panel 2");
    }
    
  } catch (error) {
    console.error("[Compare] Failed to send request to Panel 2:", error);
    
    // Show error notification
    try {
      await sdk.window.showToast(`Failed to send request: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        variant: 'error',
        duration: 3000
      });
    } catch (toastError) {
      console.error(`Failed to send request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Context menu command handler for request rows
const sendRowsToPanel1 = async (sdk: FrontendSDK, context: any) => {
  try {
    // Show initial notification
    try {
      await sdk.window.showToast("Processing selected requests for Panel 1...", {
        variant: 'info',
        duration: 3000
      });
    } catch (error) {
      console.log("Processing selected requests for Panel 1...");
    }
    
    if (!context || !context.requests || !context.requests.length) {
      console.error("[Compare] No requests in RequestRowContext");
      throw new Error("No requests selected");
    }
    
    const requests = context.requests.slice(0, 25); // Limit to 25 requests for safety
    const requestsToProcess = [];
    
    for (const request of requests) {
      try {
        if (!request || !request.id) {
          console.error("[Compare] Invalid request in RequestRowContext");
          continue;
        }
        
        // For RequestRow context, we need to fetch the full request data using GraphQL
        const fullRequest = await sdk.graphql.request({ id: request.id });
        if (!fullRequest.request?.raw) {
          console.error(`[Compare] No raw request data for ID: ${request.id}`);
          continue;
        }
        
        // Extract request information from the full request
        let rawRequest: string;
        if (typeof fullRequest.request.raw === 'string') {
          rawRequest = fullRequest.request.raw;
        } else if (fullRequest.request.raw && typeof fullRequest.request.raw === 'object' && 'toText' in fullRequest.request.raw) {
          rawRequest = (fullRequest.request.raw as any).toText();
        } else {
          rawRequest = String(fullRequest.request.raw);
        }
        
        if (!rawRequest || rawRequest.trim() === '') {
          console.error(`[Compare] Empty raw request data for ID: ${request.id}`);
          continue;
        }
        
        // Build target URL from request properties
        const host = request.host || fullRequest.request.host || 'unknown';
        const port = request.port || fullRequest.request.port || 80;
        const isTls = request.isTls !== undefined ? request.isTls : (port === 443);
        const targetUrl = `${isTls ? "https" : "http"}://${host}${port !== (isTls ? 443 : 80) ? `:${port}` : ''}`;
        
        requestsToProcess.push({
          rawRequest,
          targetUrl,
          originalRequest: fullRequest.request
        });
        
      } catch (error) {
        console.error(`[Compare] Error preparing request ${request.id}:`, error);
      }
    }
    
    if (requestsToProcess.length === 0) {
      throw new Error("No valid requests to process");
    }
    
    // Send all requests to backend
    for (const { rawRequest, targetUrl, originalRequest } of requestsToProcess) {
      await (sdk.backend as any).addRequestToPanel(1, rawRequest, targetUrl, originalRequest);
    }
    
    // Navigate to Compare page
    sdk.navigation.goTo("/compare");
    
    // Trigger frontend refresh
    window.dispatchEvent(new CustomEvent('compare-data-updated', { detail: { panel: 1 } }));
    
    // Show success notification
    try {
      await sdk.window.showToast(`${requestsToProcess.length} request(s) sent to Panel 1`, {
        variant: 'success',
        duration: 3000
      });
    } catch (error) {
      console.log(`${requestsToProcess.length} request(s) sent to Panel 1`);
    }
    
  } catch (error) {
    console.error("[Compare] Failed to send requests to Panel 1:", error);
    
    // Show error notification
    try {
      await sdk.window.showToast(`Failed to send requests: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        variant: 'error',
        duration: 3000
      });
    } catch (toastError) {
      console.error(`Failed to send requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Context menu command handler for request rows Panel 2
const sendRowsToPanel2 = async (sdk: FrontendSDK, context: any) => {
  try {
    // Show initial notification
    try {
      await sdk.window.showToast("Processing selected requests for Panel 2...", {
        variant: 'info',
        duration: 3000
      });
    } catch (error) {
      console.log("Processing selected requests for Panel 2...");
    }
    
    if (!context || !context.requests || !context.requests.length) {
      console.error("[Compare] No requests in RequestRowContext");
      throw new Error("No requests selected");
    }
    
    // RequestRowContext has a 'requests' array - process all selected requests  
    const requests = context.requests.slice(0, 25); // Limit to 25 requests for safety
    
    // Prepare requests for batch processing
    const requestsToProcess = [];
    
    for (const request of requests) {
      try {
        if (!request || !request.id) {
          console.error("[Compare] Invalid request in RequestRowContext");
          continue;
        }
        
        // For RequestRow context, we need to fetch the full request data using GraphQL
        const fullRequest = await sdk.graphql.request({ id: request.id });
        if (!fullRequest.request?.raw) {
          console.error(`[Compare] No raw request data for ID: ${request.id}`);
          continue;
        }
        
        // Extract request information from the full request
        let rawRequest: string;
        if (typeof fullRequest.request.raw === 'string') {
          rawRequest = fullRequest.request.raw;
        } else if (fullRequest.request.raw && typeof fullRequest.request.raw === 'object' && 'toText' in fullRequest.request.raw) {
          rawRequest = (fullRequest.request.raw as any).toText();
        } else {
          rawRequest = String(fullRequest.request.raw);
        }
        
        if (!rawRequest || rawRequest.trim() === '') {
          console.error(`[Compare] Empty raw request data for ID: ${request.id}`);
          continue;
        }
        
        // Build target URL from request properties
        const host = request.host || fullRequest.request.host || 'unknown';
        const port = request.port || fullRequest.request.port || 80;
        const isTls = request.isTls !== undefined ? request.isTls : (port === 443);
        const targetUrl = `${isTls ? "https" : "http"}://${host}${port !== (isTls ? 443 : 80) ? `:${port}` : ''}`;
        
        requestsToProcess.push({
          rawRequest,
          targetUrl,
          originalRequest: fullRequest.request
        });
        
      } catch (error) {
        console.error(`[Compare] Error preparing request ${request.id}:`, error);
      }
    }
    
    if (requestsToProcess.length === 0) {
      throw new Error("No valid requests to process");
    }
    
    // Send all requests to backend
    for (const { rawRequest, targetUrl, originalRequest } of requestsToProcess) {
      await (sdk.backend as any).addRequestToPanel(2, rawRequest, targetUrl, originalRequest);
    }
    
    // Navigate to Compare page
    sdk.navigation.goTo("/compare");
    
    // Trigger frontend refresh
    window.dispatchEvent(new CustomEvent('compare-data-updated', { detail: { panel: 2 } }));
    
    // Show success notification
    try {
      await sdk.window.showToast(`${requestsToProcess.length} request(s) sent to Panel 2`, {
        variant: 'success',
        duration: 3000
      });
    } catch (error) {
      console.log(`${requestsToProcess.length} request(s) sent to Panel 2`);
    }
    
  } catch (error) {
    console.error("[Compare] Failed to send requests to Panel 2:", error);
    
    // Show error notification
    try {
      await sdk.window.showToast(`Failed to send requests: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        variant: 'error',
        duration: 3000
      });
    } catch (toastError) {
      console.error(`Failed to send requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// This is the entry point for the frontend plugin
export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);

  // Load the PrimeVue component library
  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });

  // Provide the FrontendSDK
  app.use(SDKPlugin, sdk);

  // Create the root element for the app
  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  // Set the ID of the root element
  root.id = `plugin--compare`;

  // Mount the app to the root element
  app.mount(root);

  // Add the page to the navigation
  sdk.navigation.addPage("/compare", {
    body: root,
  });

  // Add a sidebar item with columns icon
  sdk.sidebar.registerItem("Compare", "/compare", {
    icon: "fas fa-columns",
  });

  // Register context menu commands
  sdk.commands.register(Commands.sendToPanel1, {
    name: "Send to Panel 1",
    run: (context) => sendToPanel1(sdk, context),
  });

  sdk.commands.register(Commands.sendToPanel2, {
    name: "Send to Panel 2",
    run: (context) => sendToPanel2(sdk, context),
  });

  sdk.commands.register(Commands.sendRowsToPanel1, {
    name: "Send to Panel 1",
    run: (context) => sendRowsToPanel1(sdk, context),
  });

  sdk.commands.register(Commands.sendRowsToPanel2, {
    name: "Send to Panel 2", 
    run: (context) => sendRowsToPanel2(sdk, context),
  });

  // Register context menu item for individual requests
  sdk.menu.registerItem({
    type: "Request",
    commandId: Commands.sendToPanel1,
    leadingIcon: "fas fa-columns",
  });

  sdk.menu.registerItem({
    type: "Request",
    commandId: Commands.sendToPanel2,
    leadingIcon: "fas fa-columns",
  });

  // Register context menu item for request rows (table view)
  sdk.menu.registerItem({
    type: "RequestRow",
    commandId: Commands.sendRowsToPanel1,
    leadingIcon: "fas fa-columns",
  });

  sdk.menu.registerItem({
    type: "RequestRow",
    commandId: Commands.sendRowsToPanel2,
    leadingIcon: "fas fa-columns",
  });


};