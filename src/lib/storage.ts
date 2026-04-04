/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Page } from "../types";

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
      const response = await fetch("/api/pages");
      if (!response.ok) throw new Error("Failed to fetch pages");
      const data = await response.json();
      
      // Deduplicate by ID to prevent React key warnings
      const seen = new Set<string>();
      const uniquePages = [];
      
      for (const p of data) {
        if (!p.id) continue;
        if (!seen.has(p.id)) {
          seen.add(p.id);
          uniquePages.push({
            id: p.id,
            title: p.title || "",
            content: p.content || "",
            createdAt: p.createdAt || Date.now(),
            updatedAt: p.updatedAt || Date.now(),
            isPinned: p.pinned || false,
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
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(page),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Failed to save page");
      }
      return await response.json();
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
      const response = await fetch(`/api/pages/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete page");
      return await response.json();
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
