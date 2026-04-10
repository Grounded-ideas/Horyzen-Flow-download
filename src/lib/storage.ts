import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

// Assuming Page type is defined elsewhere or used as any for this example
export interface Page {
  id: string;
  title: string;
  content: string;
  createdAt: number;  // Required
  updatedAt: number;
  isPinned: boolean;
  isManuallyEdited?: boolean;
  templateName?: string;
}

const STORAGE_KEY = "flow_pages";

export const storage = {
  getLocalStoragePages(): Page[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  clearLocalStorage() {
    localStorage.removeItem(STORAGE_KEY);
  },

  async getPages(): Promise<Page[]> {
  try {
    const appData = await appDataDir();
    const pagesPath = await join(appData, 'pages.json');
    const fileExists = await exists(pagesPath);
    if (!fileExists) {
      await mkdir(appData, { recursive: true });
      return [];
    }
    const data = await readTextFile(pagesPath);
    const pages = JSON.parse(data) || [];
    // Ensure each page has createdAt (migration for old pages)
    return pages.map((p: any) => ({
      ...p,
      createdAt: p.createdAt || p.updatedAt || Date.now(),
      isManuallyEdited: p.isManuallyEdited || false,
    }));
  } catch (error) {
    console.error("Failed to get pages:", error);
    return [];
  }
},

async savePage(page: Page, retries = 2): Promise<{ success: boolean }> {
  try {
    const appData = await appDataDir();
    const pagesPath = await join(appData, 'pages.json');
    await mkdir(appData, { recursive: true });
    let pages = await this.getPages();
    const existingIndex = pages.findIndex(p => p.id === page.id);
    if (existingIndex >= 0) {
      // Preserve createdAt if it exists
      pages[existingIndex] = { 
        ...page, 
        createdAt: pages[existingIndex].createdAt || page.createdAt || Date.now() 
      };
    } else {
      pages.push({ ...page, createdAt: page.createdAt || Date.now() });
    }
    await writeTextFile(pagesPath, JSON.stringify(pages, null, 2));
    return { success: true };
  } catch (error) {
    if (retries > 0) return this.savePage(page, retries - 1);
    throw error;
  }
},

  async deletePage(id: string): Promise<{ success: boolean }> {
    try {
      const appData = await appDataDir();
      const pagesPath = await join(appData, 'pages.json');
      let pages = await this.getPages();
      pages = pages.filter(p => p.id !== id);
      await writeTextFile(pagesPath, JSON.stringify(pages, null, 2));
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
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
