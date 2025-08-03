import { SDK } from "caido:plugin";
import { mkdir, readFile, writeFile, readdir, rm } from "fs/promises";
import * as path from "path";
import { CompareItem } from "../types";

/**
 * File utilities for Compare plugin storage
 */

export async function ensureCompareDirectories(sdk: SDK): Promise<boolean> {
  try {
    const dataDir = getCompareDataDir(sdk);
    const panel1Dir = getPanel1Dir(sdk);
    const panel2Dir = getPanel2Dir(sdk);
    
    await mkdir(dataDir, { recursive: true });
    await mkdir(panel1Dir, { recursive: true });
    await mkdir(panel2Dir, { recursive: true });
    
    sdk.console.log("Compare directories initialized successfully");
    return true;
  } catch (error) {
    sdk.console.error("Failed to initialize compare directories: " + (error as Error).message);
    return false;
  }
}

export function getCompareDataDir(sdk: SDK): string {
  return path.join(sdk.meta.path(), "compare-data");
}

export function getPanel1Dir(sdk: SDK): string {
  return path.join(getCompareDataDir(sdk), "panel1");
}

export function getPanel2Dir(sdk: SDK): string {
  return path.join(getCompareDataDir(sdk), "panel2");
}

export function getPanelDir(sdk: SDK, panelNumber: 1 | 2): string {
  return panelNumber === 1 ? getPanel1Dir(sdk) : getPanel2Dir(sdk);
}

export function getItemPath(sdk: SDK, panelNumber: 1 | 2, itemId: number): string {
  const panelDir = getPanelDir(sdk, panelNumber);
  return path.join(panelDir, `${itemId}.json`);
}

export async function saveItemToFile(sdk: SDK, panelNumber: 1 | 2, item: CompareItem): Promise<boolean> {
  try {
    const itemPath = getItemPath(sdk, panelNumber, item.id);
    
    // Prepare item for storage (convert Date to string)
    const storageItem = {
      ...item,
      timestamp: item.timestamp.toISOString()
    };
    
    await writeFile(itemPath, JSON.stringify(storageItem, null, 2));
    sdk.console.log(`Saved item ${item.id} to panel ${panelNumber} file`);
    return true;
  } catch (error) {
    sdk.console.error(`Failed to save item ${item.id} to file: ${(error as Error).message}`);
    return false;
  }
}

export async function deleteItemFile(sdk: SDK, panelNumber: 1 | 2, itemId: number): Promise<boolean> {
  try {
    const itemPath = getItemPath(sdk, panelNumber, itemId);
    await rm(itemPath);
    sdk.console.log(`Deleted item ${itemId} file from panel ${panelNumber}`);
    return true;
  } catch (error) {
    // If the file doesn't exist, that's actually fine - consider it successful
    if ((error as any).code === 'ENOENT') {
      sdk.console.log(`Item ${itemId} file already didn't exist - considering deletion successful`);
      return true;
    }
    sdk.console.error(`Failed to delete item ${itemId} file: ${(error as Error).message}`);
    return false;
  }
}

export async function loadItemsFromFiles(sdk: SDK, panelNumber: 1 | 2): Promise<CompareItem[]> {
  const items: CompareItem[] = [];
  
  try {
    const panelDir = getPanelDir(sdk, panelNumber);
    const files = await readdir(panelDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const itemPath = path.join(panelDir, file);
          const content = await readFile(itemPath, 'utf8');
          const storageItem = JSON.parse(content);
          
          // Convert timestamp string back to Date
          const item: CompareItem = {
            ...storageItem,
            timestamp: new Date(storageItem.timestamp)
          };
          
          items.push(item);
        } catch (fileError) {
          sdk.console.warn(`Failed to load item from file ${file}: ${(fileError as Error).message}`);
        }
      }
    }
    
    sdk.console.log(`Loaded ${items.length} items from panel ${panelNumber} files`);
  } catch (error) {
    sdk.console.error(`Failed to load items from panel ${panelNumber}: ${(error as Error).message}`);
  }
  
  return items;
}

export async function clearPanelFiles(sdk: SDK, panelNumber: 1 | 2): Promise<boolean> {
  try {
    const panelDir = getPanelDir(sdk, panelNumber);
    
    // Check if directory exists first
    try {
      const files = await readdir(panelDir);
      
      const deletePromises = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(panelDir, file);
          return rm(filePath).catch(error => {
            // If file doesn't exist, that's fine
            if ((error as any).code !== 'ENOENT') {
              sdk.console.warn(`Failed to delete file ${file}: ${(error as Error).message}`);
            }
          });
        });
      
      await Promise.all(deletePromises);
      sdk.console.log(`Cleared ${files.filter(f => f.endsWith('.json')).length} files from panel ${panelNumber}`);
    } catch (dirError) {
      // If directory doesn't exist, that's fine - nothing to clear
      if ((dirError as any).code === 'ENOENT') {
        sdk.console.log(`Panel ${panelNumber} directory doesn't exist - nothing to clear`);
        return true;
      }
      throw dirError;
    }
    
    return true;
  } catch (error) {
    sdk.console.error(`Failed to clear panel ${panelNumber} files: ${(error as Error).message}`);
    return false;
  }
}

export async function loadAllItemsFromFiles(sdk: SDK): Promise<{ panel1: CompareItem[], panel2: CompareItem[] }> {
  const [panel1Items, panel2Items] = await Promise.all([
    loadItemsFromFiles(sdk, 1),
    loadItemsFromFiles(sdk, 2)
  ]);
  
  return {
    panel1: panel1Items,
    panel2: panel2Items
  };
}