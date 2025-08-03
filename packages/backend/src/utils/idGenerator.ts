import { SDK } from "caido:plugin";
import { CompareStore } from "../stores/compareStore";

/**
 * ID Generator for Compare plugin
 * Generates sequential IDs starting from 1
 */
export class IdGenerator {
  private static instance: IdGenerator;
  private currentId: number = 0;

  private constructor() {}

  static get(): IdGenerator {
    if (!IdGenerator.instance) {
      IdGenerator.instance = new IdGenerator();
    }
    return IdGenerator.instance;
  }

  /**
   * Initialize the ID generator by finding the highest existing ID
   */
  initialize(): void {
    const store = CompareStore.get();
    const panel1Items = store.getPanel1Items();
    const panel2Items = store.getPanel2Items();
    
    // Find the highest existing ID
    let maxId = 0;
    [...panel1Items, ...panel2Items].forEach(item => {
      if (item.id > maxId) {
        maxId = item.id;
      }
    });
    
    // Start from the next available ID (if no items exist, start from 0 so next ID will be 1)
    this.currentId = maxId;
  }

  /**
   * Generate the next sequential ID
   */
  generateId(): number {
    this.currentId++;
    return this.currentId;
  }

  /**
   * Reset the ID counter (useful for testing)
   */
  reset(): void {
    this.currentId = 0;
  }
}