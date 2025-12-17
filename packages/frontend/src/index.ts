import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
import { createApp } from "vue";

import { SDKPlugin } from "./plugins/sdk";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

// Command definitions for the plugin
const Commands = {
  sendToOriginal: "compare.send-to-original",
  sendToModified: "compare.send-to-modified",
  sendRowsToOriginal: "compare.send-rows-to-original",
  sendRowsToModified: "compare.send-rows-to-modified",
  sendResponseToOriginal: "compare.send-response-to-original",
  sendResponseToModified: "compare.send-response-to-modified",
} as const;

// Context menu command handler for Original - REQUESTS ONLY
const sendToOriginal = async (sdk: FrontendSDK, context: any) => {
  try {
    let request = context.request;
    if (!request && context) {
      request = context;
    }

    if (!request) {
      throw new Error("No request found in context");
    }

    const requestInfo = {
      method: "GET",
      host: request.host || "unknown",
      path: request.path || "/",
      id: request.id || "unknown",
      port: request.port || 80,
      isTls: request.isTls || false,
      query: request.query || "",
      raw: request.raw || "",
    };

    if (request.raw && typeof request.raw === "string") {
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

    const targetUrl = `${requestInfo.isTls ? "https" : "http"}://${requestInfo.host}:${requestInfo.port}`;
    const rawRequest = requestInfo.raw || "";

    await (sdk.backend as any).addRequestToPanel(
      1,
      rawRequest,
      targetUrl,
      request,
    );

    // Navigate to Compare page
    sdk.navigation.goTo("/compare");

    window.dispatchEvent(
      new CustomEvent("compare-data-updated", { detail: { panel: 1 } }),
    );

    try {
      await sdk.window.showToast("Request sent to Original", {
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.log("Request sent to Original");
    }
  } catch (error) {
    console.error("[Compare] Failed to send request to Original:", error);

    try {
      await sdk.window.showToast(
        `Failed to send request: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          variant: "error",
          duration: 3000,
        },
      );
    } catch (toastError) {
      console.error(
        `Failed to send request: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
};

// Context menu command handler for Modified - REQUESTS ONLY
const sendToModified = async (sdk: FrontendSDK, context: any) => {
  try {
    let request = context.request;
    if (!request && context) {
      request = context;
    }

    if (!request) {
      throw new Error("No request found in context");
    }

    const requestInfo = {
      method: "GET",
      host: request.host || "unknown",
      path: request.path || "/",
      id: request.id || "unknown",
      port: request.port || 80,
      isTls: request.isTls || false,
      query: request.query || "",
      raw: request.raw || "",
    };

    if (request.raw && typeof request.raw === "string") {
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

    const targetUrl = `${requestInfo.isTls ? "https" : "http"}://${requestInfo.host}:${requestInfo.port}`;
    const rawRequest = requestInfo.raw || "";

    await (sdk.backend as any).addRequestToPanel(
      2,
      rawRequest,
      targetUrl,
      request,
    );

    // Navigate to Compare page
    sdk.navigation.goTo("/compare");

    window.dispatchEvent(
      new CustomEvent("compare-data-updated", { detail: { panel: 2 } }),
    );

    try {
      await sdk.window.showToast("Request sent to Modified", {
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.log("Request sent to Modified");
    }
  } catch (error) {
    console.error("[Compare] Failed to send request to Modified:", error);

    try {
      await sdk.window.showToast(
        `Failed to send request: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          variant: "error",
          duration: 3000,
        },
      );
    } catch (toastError) {
      console.error(
        `Failed to send request: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
};

// Context menu command handler for request rows
const sendRowsToOriginal = async (sdk: FrontendSDK, context: any) => {
  try {
    try {
      await sdk.window.showToast(
        "Processing selected requests for Original...",
        {
          variant: "info",
          duration: 3000,
        },
      );
    } catch (error) {
      console.log("Processing selected requests for Original...");
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

        const fullRequest = await sdk.graphql.request({ id: request.id });
        if (!fullRequest.request?.raw) {
          console.error(`[Compare] No raw request data for ID: ${request.id}`);
          continue;
        }

        let rawRequest: string;
        if (typeof fullRequest.request.raw === "string") {
          rawRequest = fullRequest.request.raw;
        } else if (
          fullRequest.request.raw &&
          typeof fullRequest.request.raw === "object" &&
          "toText" in fullRequest.request.raw
        ) {
          rawRequest = (fullRequest.request.raw as any).toText();
        } else {
          rawRequest = String(fullRequest.request.raw);
        }

        if (!rawRequest || rawRequest.trim() === "") {
          console.error(
            `[Compare] Empty raw request data for ID: ${request.id}`,
          );
          continue;
        }

        const host = request.host || fullRequest.request.host || "unknown";
        const port = request.port || fullRequest.request.port || 80;
        const isTls =
          request.isTls !== undefined ? request.isTls : port === 443;
        const targetUrl = `${isTls ? "https" : "http"}://${host}${port !== (isTls ? 443 : 80) ? `:${port}` : ""}`;

        requestsToProcess.push({
          rawRequest,
          targetUrl,
          originalRequest: fullRequest.request,
        });
      } catch (error) {
        console.error(
          `[Compare] Error preparing request ${request.id}:`,
          error,
        );
      }
    }

    if (requestsToProcess.length === 0) {
      throw new Error("No valid requests to process");
    }

    for (const {
      rawRequest,
      targetUrl,
      originalRequest,
    } of requestsToProcess) {
      await (sdk.backend as any).addRequestToPanel(
        1,
        rawRequest,
        targetUrl,
        originalRequest,
      );
    }

    // Navigate to Compare page
    sdk.navigation.goTo("/compare");

    window.dispatchEvent(
      new CustomEvent("compare-data-updated", { detail: { panel: 1 } }),
    );

    try {
      await sdk.window.showToast(
        `${requestsToProcess.length} request(s) sent to Original`,
        {
          variant: "success",
          duration: 3000,
        },
      );
    } catch (error) {
      console.log(`${requestsToProcess.length} request(s) sent to Original`);
    }
  } catch (error) {
    console.error("[Compare] Failed to send requests to Original:", error);

    try {
      await sdk.window.showToast(
        `Failed to send requests: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          variant: "error",
          duration: 3000,
        },
      );
    } catch (toastError) {
      console.error(
        `Failed to send requests: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
};

// Context menu command handler for request rows Modified
const sendRowsToModified = async (sdk: FrontendSDK, context: any) => {
  try {
    try {
      await sdk.window.showToast(
        "Processing selected requests for Modified...",
        {
          variant: "info",
          duration: 3000,
        },
      );
    } catch (error) {
      console.log("Processing selected requests for Modified...");
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

        const fullRequest = await sdk.graphql.request({ id: request.id });
        if (!fullRequest.request?.raw) {
          console.error(`[Compare] No raw request data for ID: ${request.id}`);
          continue;
        }

        let rawRequest: string;
        if (typeof fullRequest.request.raw === "string") {
          rawRequest = fullRequest.request.raw;
        } else if (
          fullRequest.request.raw &&
          typeof fullRequest.request.raw === "object" &&
          "toText" in fullRequest.request.raw
        ) {
          rawRequest = (fullRequest.request.raw as any).toText();
        } else {
          rawRequest = String(fullRequest.request.raw);
        }

        if (!rawRequest || rawRequest.trim() === "") {
          console.error(
            `[Compare] Empty raw request data for ID: ${request.id}`,
          );
          continue;
        }

        const host = request.host || fullRequest.request.host || "unknown";
        const port = request.port || fullRequest.request.port || 80;
        const isTls =
          request.isTls !== undefined ? request.isTls : port === 443;
        const targetUrl = `${isTls ? "https" : "http"}://${host}${port !== (isTls ? 443 : 80) ? `:${port}` : ""}`;

        requestsToProcess.push({
          rawRequest,
          targetUrl,
          originalRequest: fullRequest.request,
        });
      } catch (error) {
        console.error(
          `[Compare] Error preparing request ${request.id}:`,
          error,
        );
      }
    }

    if (requestsToProcess.length === 0) {
      throw new Error("No valid requests to process");
    }

    for (const {
      rawRequest,
      targetUrl,
      originalRequest,
    } of requestsToProcess) {
      await (sdk.backend as any).addRequestToPanel(
        2,
        rawRequest,
        targetUrl,
        originalRequest,
      );
    }

    // Navigate to Compare page
    sdk.navigation.goTo("/compare");

    window.dispatchEvent(
      new CustomEvent("compare-data-updated", { detail: { panel: 2 } }),
    );

    try {
      await sdk.window.showToast(
        `${requestsToProcess.length} request(s) sent to Modified`,
        {
          variant: "success",
          duration: 3000,
        },
      );
    } catch (error) {
      console.log(`${requestsToProcess.length} request(s) sent to Modified`);
    }
  } catch (error) {
    console.error("[Compare] Failed to send requests to Modified:", error);

    try {
      await sdk.window.showToast(
        `Failed to send requests: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          variant: "error",
          duration: 3000,
        },
      );
    } catch (toastError) {
      console.error(
        `Failed to send requests: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
};

// Context menu command handler for Response to Original
const sendResponseToOriginal = async (sdk: FrontendSDK, context: any) => {
  try {
    const response = context.response;

    if (!response) {
      throw new Error("No response found in context");
    }

    let rawResponse = "";
    if (response.raw && typeof response.raw === "string") {
      rawResponse = response.raw;
    } else if (response.raw && response.raw.toText) {
      try {
        rawResponse = response.raw.toText();
      } catch (e) {
        throw new Error("Failed to extract response data");
      }
    }

    if (!rawResponse || rawResponse.trim() === "") {
      throw new Error("Empty response data");
    }

    let sourceUrl = "http_response";
    if (context.request) {
      const req = context.request;
      const host = req.host || "unknown";
      const port = req.port || 80;
      const isTls = req.isTls || false;
      sourceUrl = `${isTls ? "https" : "http"}://${host}${port !== (isTls ? 443 : 80) ? `:${port}` : ""}${req.path || "/"}`;
    }

    await (sdk.backend as any).addResponseToPanel(1, rawResponse, sourceUrl, {
      host: context.request?.host,
      port: context.request?.port,
      isTls: context.request?.isTls,
    });

    // Navigate to Compare page
    sdk.navigation.goTo("/compare");

    window.dispatchEvent(
      new CustomEvent("compare-data-updated", { detail: { panel: 1 } }),
    );

    try {
      await sdk.window.showToast("Response sent to Original", {
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.log("Response sent to Original");
    }
  } catch (error) {
    console.error("[Compare] Failed to send response to Original:", error);

    try {
      await sdk.window.showToast(
        `Failed to send response: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          variant: "error",
          duration: 3000,
        },
      );
    } catch (toastError) {
      console.error(
        `Failed to send response: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
};

// Context menu command handler for Response to Modified
const sendResponseToModified = async (sdk: FrontendSDK, context: any) => {
  try {
    const response = context.response;

    if (!response) {
      throw new Error("No response found in context");
    }

    let rawResponse = "";
    if (response.raw && typeof response.raw === "string") {
      rawResponse = response.raw;
    } else if (response.raw && response.raw.toText) {
      try {
        rawResponse = response.raw.toText();
      } catch (e) {
        throw new Error("Failed to extract response data");
      }
    }

    if (!rawResponse || rawResponse.trim() === "") {
      throw new Error("Empty response data");
    }

    let sourceUrl = "http_response";
    if (context.request) {
      const req = context.request;
      const host = req.host || "unknown";
      const port = req.port || 80;
      const isTls = req.isTls || false;
      sourceUrl = `${isTls ? "https" : "http"}://${host}${port !== (isTls ? 443 : 80) ? `:${port}` : ""}${req.path || "/"}`;
    }

    await (sdk.backend as any).addResponseToPanel(2, rawResponse, sourceUrl, {
      host: context.request?.host,
      port: context.request?.port,
      isTls: context.request?.isTls,
    });

    // Navigate to Compare page
    sdk.navigation.goTo("/compare");

    window.dispatchEvent(
      new CustomEvent("compare-data-updated", { detail: { panel: 2 } }),
    );

    try {
      await sdk.window.showToast("Response sent to Modified", {
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.log("Response sent to Modified");
    }
  } catch (error) {
    console.error("[Compare] Failed to send response to Modified:", error);

    try {
      await sdk.window.showToast(
        `Failed to send response: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          variant: "error",
          duration: 3000,
        },
      );
    } catch (toastError) {
      console.error(
        `Failed to send response: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
};

// This is the entry point for the frontend plugin
export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);

  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });

  app.use(SDKPlugin, sdk);

  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  root.id = `plugin--compare`;

  app.mount(root);

  sdk.navigation.addPage("/compare", {
    body: root,
  });

  sdk.sidebar.registerItem("Compare", "/compare", {
    icon: "fas fa-columns",
  });

  // Register context menu commands
  sdk.commands.register(Commands.sendToOriginal, {
    name: "Send to Original",
    run: (context) => sendToOriginal(sdk, context),
  });

  sdk.commands.register(Commands.sendToModified, {
    name: "Send to Modified",
    run: (context) => sendToModified(sdk, context),
  });

  sdk.commands.register(Commands.sendRowsToOriginal, {
    name: "Send to Original",
    run: (context) => sendRowsToOriginal(sdk, context),
  });

  sdk.commands.register(Commands.sendRowsToModified, {
    name: "Send to Modified",
    run: (context) => sendRowsToModified(sdk, context),
  });

  // Register context menu item for individual requests
  sdk.menu.registerItem({
    type: "Request",
    commandId: Commands.sendToOriginal,
    leadingIcon: "fas fa-columns",
  });

  sdk.menu.registerItem({
    type: "Request",
    commandId: Commands.sendToModified,
    leadingIcon: "fas fa-columns",
  });

  // Register context menu item for request rows (table view)
  sdk.menu.registerItem({
    type: "RequestRow",
    commandId: Commands.sendRowsToOriginal,
    leadingIcon: "fas fa-columns",
  });

  sdk.menu.registerItem({
    type: "RequestRow",
    commandId: Commands.sendRowsToModified,
    leadingIcon: "fas fa-columns",
  });

  // Register context menu commands for responses
  sdk.commands.register(Commands.sendResponseToOriginal, {
    name: "Send to Original",
    run: (context) => sendResponseToOriginal(sdk, context),
  });

  sdk.commands.register(Commands.sendResponseToModified, {
    name: "Send to Modified",
    run: (context) => sendResponseToModified(sdk, context),
  });

  // Register context menu items for responses
  sdk.menu.registerItem({
    type: "Response",
    commandId: Commands.sendResponseToOriginal,
    leadingIcon: "fas fa-columns",
  });

  sdk.menu.registerItem({
    type: "Response",
    commandId: Commands.sendResponseToModified,
    leadingIcon: "fas fa-columns",
  });
};
