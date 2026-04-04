import { Page } from "../types";

interface SearchIndex {
  terms: { [word: string]: string[] };
  pages: {
    [pageId: string]: {
      title: string;
      titleTerms: string[];
      contentTerms: string[];
    };
  };
}

export class SearchManager {
  private index: SearchIndex = { terms: {}, pages: {} };

  buildIndex(pages: Page[]) {
    const newIndex: SearchIndex = { terms: {}, pages: {} };

    pages.forEach((page) => {
      const titleTerms = this.tokenize(page.title);
      const contentTerms = this.tokenize(page.content);
      const allTerms = new Set([...titleTerms, ...contentTerms]);

      newIndex.pages[page.id] = {
        title: page.title,
        titleTerms,
        contentTerms,
      };

      allTerms.forEach((term) => {
        if (!newIndex.terms[term]) {
          newIndex.terms[term] = [];
        }
        newIndex.terms[term].push(page.id);
      });
    });

    this.index = newIndex;
    this.saveIndex();
  }

  updatePage(page: Page) {
    // Remove old terms
    const oldPage = this.index.pages[page.id];
    if (oldPage) {
      const oldTerms = new Set([...oldPage.titleTerms, ...oldPage.contentTerms]);
      oldTerms.forEach((term) => {
        if (this.index.terms[term]) {
          this.index.terms[term] = this.index.terms[term].filter((id) => id !== page.id);
        }
      });
    }

    // Add new terms
    const titleTerms = this.tokenize(page.title);
    const contentTerms = this.tokenize(page.content);
    const allTerms = new Set([...titleTerms, ...contentTerms]);

    this.index.pages[page.id] = {
      title: page.title,
      titleTerms,
      contentTerms,
    };

    allTerms.forEach((term) => {
      if (!this.index.terms[term]) {
        this.index.terms[term] = [];
      }
      if (!this.index.terms[term].includes(page.id)) {
        this.index.terms[term].push(page.id);
      }
    });

    this.saveIndex();
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 1);
  }

  search(query: string): string[] {
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return [];

    // Simple intersection of results for each term
    let results: string[] | null = null;

    queryTerms.forEach((term) => {
      const pageIds = this.index.terms[term] || [];
      if (results === null) {
        results = [...pageIds];
      } else {
        results = results.filter((id) => pageIds.includes(id));
      }
    });

    return results || [];
  }

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  private async saveIndex() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    
    this.saveTimeout = setTimeout(async () => {
      try {
        const response = await fetch("/api/search-index", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.index),
        });
        if (!response.ok) {
          console.warn("Failed to save search index (server error)");
        }
      } catch (error) {
        console.error("Failed to save search index:", error);
      }
    }, 2000); // Debounce for 2 seconds
  }

  async loadIndex() {
    try {
      const response = await fetch("/api/search-index");
      if (response.ok) {
        this.index = await response.json();
      }
    } catch (error) {
      console.error("Failed to load search index:", error);
    }
  }
}

export const searchManager = new SearchManager();
