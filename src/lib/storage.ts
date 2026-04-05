/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Page } from "../types";
import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/plugin-path';

const STORAGE_KEY = "flow_pages";

export const storage = {
  // LocalStorage methods (for migration)
  getLocalStoragePages(): Page[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((p: any) => ({
        id: p.id || Math.random().toString(36).substring(2, 15),
        title: p.title || "",
        content: p.content || "",
        createdAt: p.createdAt || Date.now(),
        updatedAt: p.updatedAt || Date.now(),
        isPinned: p.isPinned || false,
      }));
    } catch (e) {
      console.error("Failed to parse pages from storage", e);
      return [];
    }
  },

  clearLocalStorage() {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Backend File System methods
  async getPages(): Promise<Page[]> {
    try {
      const appData = await appDataDir();
      const pagesPath = await join(appData, 'pages.json');
      
      const fileExists = await exists(pagesPath);
      if (!fileExists) {
        // FIXED: changed createDir to mkdir
        await mkdir(appData, { recursive: true });
        return [];
      }
      
      const data = await readTextFile(pagesPath);
      const pages = JSON.parse(data);
      
      // Deduplicate by ID to prevent React key warnings
      const seen = new Set<string>();
      const uniquePages = [];
      
      for (const p of pages) {
        if (!p.id) continue;
        if (!seen.has(p.id)) {
          seen.add(p.id);
          uniquePages.push({
            id: p.id,
            title: p.title || "",
            content: p.content || "",
            createdAt: p.createdAt || Date.now(),
            updatedAt: p.updatedAt || Date.now(),
            isPinned: p.isPinned || false,
            isManuallyEdited: p.isManuallyEdited || false,
            templateName: p.templateName || "",
          });
        }
      }
      
      return uniquePages;
    } catch (error) {
      console.error("Error loading pages from FS:", error);
      return [];
    }
  },

  async savePage(page: Page, retries = 2) {
    try {
      const appData = await appDataDir();
      const pagesPath = await join(appData, 'pages.json');
      
      // FIXED: changed createDir to mkdir
      await mkdir(appData, { recursive: true });
      
      let pages: Page[] = [];
      try {
        const data = await readTextFile(pagesPath);
        pages = JSON.parse(data);
      } catch {
        // File doesn't exist or is empty
      }
      
      // Update or add the page
      const existingIndex = pages.findIndex(p => p.id === page.id);
      if (existingIndex >= 0) {
        pages[existingIndex] = page;
      } else {
        pages.push(page);
      }
      
      await writeTextFile(pagesPath, JSON.stringify(pages, null, 2));
      return { success: true };
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying savePage for ${page.id}, attempts left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.savePage(page, retries - 1);
      }
      console.error("Error saving page to FS:", error);
      throw error;
    }
  },

  async deletePage(id: string) {
    try {
      const appData = await appDataDir();
      const pagesPath = await join(appData, 'pages.json');
      
      let pages: Page[] = [];
      try {
        const data = await readTextFile(pagesPath);
        pages = JSON.parse(data);
      } catch {
        // File doesn't exist
        return { success: true };
      }
      
      // Remove the page
      pages = pages.filter(p => p.id !== id);
      
      await writeTextFile(pagesPath, JSON.stringify(pages, null, 2));
      return { success: true };
    } catch (error) {
      console.error("Error deleting page from FS:", error);
      throw error;
    }
  },
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
