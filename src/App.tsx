import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Sidebar } from "./components/Sidebar";
import { Editor } from "./components/Editor";
import { Page } from "./types";
import { storage, debounce } from "./lib/storage";
import { cn } from "./lib/utils";
import { FileText, Command, Keyboard, Plus, X } from "lucide-react";
import { searchManager } from "./lib/search-index";
import { ShortcutPalette } from "./components/ShortcutPalette";
import { StatusBar } from "./components/StatusBar";
import { Settings } from "./components/Settings";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { useTheme } from "./context/ThemeContext";
import { trackSession, loadAnalytics, updateCurrentSession } from "./lib/analytics";
import { initSpellchecker } from "./lib/spellcheck";
import { BUILTIN_TEMPLATES, processTemplate } from "./lib/templates";
import { jsPDF } from "jspdf";
import { marked } from "marked";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { check } from "@tauri-apps/plugin-updater";
import { ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

export default function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [syncStatus, setSyncStatus] = useState<Record<string, 'synced' | 'saving' | 'error'>>({});
  const pendingSaves = useRef<Set<string>>(new Set());
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTypewriterMode, setIsTypewriterMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isShortcutPaletteOpen, setIsShortcutPaletteOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [quickCaptureContent, setQuickCaptureContent] = useState("");

  // Phase 3 State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isSpellCheckEnabled, setIsSpellCheckEnabled] = useState(true);
  const { currentThemeId, setTheme, isDarkMode, toggleDarkMode, typography, setTypography } = useTheme();
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [dailyWordTarget, setDailyWordTarget] = useState(500);

  // Analytics tracking
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [sessionWordCount, setSessionWordCount] = useState(0);
  const sessionRef = useRef({ startTime: Date.now(), wordCount: 0 });

  // WebSocket for file changes
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    let refreshTimeout: NodeJS.Timeout | null = null;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "FILE_CHANGE") {
        // Debounce the refresh to allow multiple file events settle
        if (refreshTimeout) clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          storage.getPages().then((loadedPages) => {
            setPages((currentPages) => {
              // Create a map of existing pages for quick lookup
              const currentPagesMap = new Map(currentPages.map(p => [p.id, p]));
              
              // Merge logic: preserve local state for pages currently being saved
              const mergedPages = loadedPages.map(loadedPage => {
                const currentPage = currentPagesMap.get(loadedPage.id);
                if (!currentPage) return loadedPage;
                
                // If we are currently saving this page, ignore the external change
                if (pendingSaves.current.has(loadedPage.id)) {
                  return currentPage;
                }
                
                // If the user has manually edited the title, preserve it
                if (currentPage.isManuallyEdited && !loadedPage.isManuallyEdited) {
                  return { ...loadedPage, title: currentPage.title, isManuallyEdited: true };
                }
                
                return loadedPage;
              });

              // Keep pages that are in currentPages but NOT in loadedPages 
              // ONLY if they are in pendingSaves (might be a rename in progress)
              const ghostPages = currentPages.filter(cp => 
                !loadedPages.some(lp => lp.id === cp.id) && 
                pendingSaves.current.has(cp.id)
              );

              // Final deduplication just in case
              const finalPages = [...mergedPages, ...ghostPages];
              const seen = new Set<string>();
              return finalPages.filter(p => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
              });
            });
            searchManager.buildIndex(loadedPages);
          });
        }, 500);
      }
    };

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      ws.close();
    };
  }, []);

  // Load pages on mount and handle migration
  useEffect(() => {
    const init = async () => {
      const localPages = storage.getLocalStoragePages();
      
      if (localPages.length > 0) {
        console.log("Migrating pages from localStorage to File System...");
        let migratedCount = 0;
        for (const page of localPages) {
          try {
            await storage.savePage(page);
            migratedCount++;
          } catch (error) {
            console.error(`Failed to migrate page ${page.id}:`, error);
          }
        }
        
        if (migratedCount === localPages.length) {
          storage.clearLocalStorage();
          console.log("Migration complete.");
        } else {
          console.warn(`Migration partially complete: ${migratedCount}/${localPages.length} pages migrated.`);
          // We don't clear localStorage if some failed, but we should probably mark them as migrated
          // For now, let's just clear it if at least some were migrated to avoid infinite loops
          // or better, only clear the ones that succeeded.
          // But clearLocalStorage is all or nothing.
          // Let's just clear it if we tried all of them, to avoid getting stuck.
          storage.clearLocalStorage();
        }
      }

      const loadedPages = await storage.getPages();
      setPages(loadedPages);
      searchManager.buildIndex(loadedPages);
      
      const lastActiveId = localStorage.getItem("flow-last-active-id");
      const defaultPageId = localStorage.getItem("flow-default-page-id");
      
      if (lastActiveId && loadedPages.find(p => p.id === lastActiveId)) {
        setActivePageId(lastActiveId);
      } else if (defaultPageId && loadedPages.find(p => p.id === defaultPageId)) {
        setActivePageId(defaultPageId);
      } else if (loadedPages.length > 0) {
        setActivePageId(loadedPages[0].id);
      }

      // Load theme and settings from backend
      try {
        const settingsResponse = await fetch("/api/settings");
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          if (settings.themeId) setTheme(settings.themeId);
          if (settings.spellCheck !== undefined) {
            setIsSpellCheckEnabled(settings.spellCheck);
          }
          if (settings.dailyWordTarget !== undefined) {
            setDailyWordTarget(settings.dailyWordTarget);
          }
          if (settings.typography) {
            Object.entries(settings.typography).forEach(([key, value]) => {
              setTypography(key, value as string);
            });
          }
        }
      } catch (error) {
        console.error("Failed to load settings from backend:", error);
        // Fallback to localStorage
        const savedThemeId = localStorage.getItem("app-theme");
        if (savedThemeId) {
          setTheme(savedThemeId);
        }
        const savedSpellCheck = localStorage.getItem("flow-spellcheck");
        if (savedSpellCheck !== null) {
          setIsSpellCheckEnabled(JSON.parse(savedSpellCheck));
        }
      }

      // Load analytics
      loadAnalytics().catch(err => console.error("Failed to load analytics:", err));
      
      // Initialize spellchecker
      initSpellchecker().catch(err => console.error("Failed to init spellchecker:", err));
    };
    
    init();
  }, []);

  // Track session on unmount
  useEffect(() => {
    const handleUnload = () => {
      if (sessionRef.current.wordCount > 0) {
        trackSession({
          id: uuidv4(),
          startTime: new Date(sessionRef.current.startTime).toISOString(),
          endTime: new Date().toISOString(),
          wordsWritten: sessionRef.current.wordCount,
        });
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  // Check for updates on app start
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update && update.available) {
          const confirmed = await ask(
            `Update available: ${update.version}. Would you like to update and restart?`,
            { title: "Update Available" }
          );
          if (confirmed) {
            await update.downloadAndInstall();
            await relaunch();
          }
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    checkForUpdates();
  }, []);

  const activePage = useMemo(() => {
    return pages.find((p) => p.id === activePageId) || null;
  }, [pages, activePageId]);

  const wordCount = useMemo(() => {
    if (!activePage) return 0;
    return activePage.content.trim().split(/\s+/).filter(Boolean).length;
  }, [activePage]);

  const charCount = useMemo(() => {
    if (!activePage) return 0;
    return activePage.content.length;
  }, [activePage]);

  const lineCount = useMemo(() => {
    if (!activePage) return 0;
    return activePage.content.split("\n").length;
  }, [activePage]);

  const filteredPages = useMemo(() => {
    let result = pages;
    if (searchQuery) {
      const searchResults = searchManager.search(searchQuery);
      result = pages.filter((p) => 
        searchResults.includes(p.id)
      );
    }

    const sorted = [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });

    return sorted;
  }, [pages, searchQuery]);

  const finalizePageTitle = useCallback((id: string) => {
    setPages((prev) => {
      const pageIndex = prev.findIndex((p) => p.id === id);
      if (pageIndex === -1) return prev;

      const page = prev[pageIndex];
      // ONLY extract if NOT manually edited and title is empty
      if (!page.isManuallyEdited && (!page.title || page.title.trim() === "")) {
        const firstLine = page.content.trim().split("\n")[0];
        const newTitle = firstLine ? firstLine.replace(/^#+\s*/, "").substring(0, 50) : "";
        
        if (newTitle) {
          const updatedPage = { ...page, title: newTitle };
          storage.savePage(updatedPage);
          searchManager.updatePage(updatedPage);
          
          const next = [...prev];
          next[pageIndex] = updatedPage;
          return next;
        }
      }
      return prev;
    });
  }, []);

  const handlePageSelect = useCallback((id: string) => {
    if (activePageId && activePageId !== id) {
      finalizePageTitle(activePageId);
    }
    setActivePageId(id);
    localStorage.setItem("flow-last-active-id", id);
    if (isFocusMode) setIsFocusMode(false);
  }, [activePageId, finalizePageTitle, isFocusMode]);

  const handlePageCreate = useCallback(async (template?: typeof BUILTIN_TEMPLATES[0]) => {
    if (activePageId) {
      finalizePageTitle(activePageId);
    }

    const now = Date.now();
    const title = template ? template.name : "";
    const content = template ? processTemplate(template.content, title) : "";
    const id = uuidv4();
    
    const newPage: Page = {
      id,
      title,
      content,
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      isManuallyEdited: false,
      templateName: template ? template.name : "Blank Page",
    };
    
    // Clear search first to ensure visibility
    setSearchQuery("");
    
    // Optimistic update
    setPages((prev) => [newPage, ...prev]);
    setActivePageId(newPage.id);
    localStorage.setItem("flow-last-active-id", newPage.id);
    
    // Mark as pending save
    pendingSaves.current.add(id);
    setSyncStatus(prev => ({ ...prev, [id]: 'saving' }));

    try {
      await storage.savePage(newPage);
      setSyncStatus(prev => ({ ...prev, [id]: 'synced' }));
      searchManager.updatePage(newPage);
    } catch (error) {
      console.error("Failed to create page file:", error);
      // Rollback on error
      setPages(prev => prev.filter(p => p.id !== id));
      setSyncStatus(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      // Keep in pending for a bit to let FS events settle
      setTimeout(() => {
        pendingSaves.current.delete(id);
      }, 1000);
      setIsTemplatePickerOpen(false);
    }
  }, [activePageId, finalizePageTitle]);

  const handleDuplicatePage = useCallback(async (id: string) => {
    const pageToDuplicate = pages.find(p => p.id === id);
    if (!pageToDuplicate) return;

    const now = Date.now();
    const newPage: Page = {
      ...pageToDuplicate,
      id: uuidv4(),
      title: pageToDuplicate.title ? `${pageToDuplicate.title} (Copy)` : "No Title (Copy)",
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      isManuallyEdited: true,
    };

    setPages(prev => [newPage, ...prev]);
    setActivePageId(newPage.id);
    await storage.savePage(newPage);
    searchManager.updatePage(newPage);
  }, [pages]);

  const handleSetDefaultPage = useCallback((id: string) => {
    localStorage.setItem("flow-default-page-id", id);
  }, []);

  const handlePagePin = useCallback(
    async (id: string) => {
      let updatedPage: Page | null = null;
      setPages((prev) => {
        return prev.map((p) => {
          if (p.id === id) {
            updatedPage = { ...p, isPinned: !p.isPinned };
            return updatedPage;
          }
          return p;
        });
      });
      if (updatedPage) {
        try {
          await storage.savePage(updatedPage);
        } catch (error) {
          console.error("Failed to pin page:", error);
          // Rollback on error
          setPages((prev) => prev.map(p => p.id === id ? { ...p, isPinned: !p.isPinned } : p));
        }
      }
    },
    []
  );

  const handlePageDelete = useCallback(
    async (id: string) => {
      setPages((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        if (activePageId === id) {
          setActivePageId(updated.length > 0 ? updated[0].id : null);
        }
        return updated;
      });
      await storage.deletePage(id);
    },
    [activePageId]
  );

  const handlePageDeselect = useCallback(() => {
    if (activePageId) {
      finalizePageTitle(activePageId);
    }
    setActivePageId(null);
  }, [activePageId, finalizePageTitle]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handlePageCreate();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        if (activePageId) handlePagePin(activePageId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsShortcutPaletteOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Backspace") {
        e.preventDefault();
        if (activePageId) handlePageDelete(activePageId);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === " ") {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePageCreate, handlePagePin, activePageId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activePageId) {
        finalizePageTitle(activePageId);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activePageId, finalizePageTitle]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (page: Page) => {
        pendingSaves.current.add(page.id);
        setSyncStatus(prev => ({ ...prev, [page.id]: 'saving' }));
        try {
          await storage.savePage(page);
          setSyncStatus(prev => ({ ...prev, [page.id]: 'synced' }));
        } catch (error) {
          setSyncStatus(prev => ({ ...prev, [page.id]: 'error' }));
        } finally {
          // Keep it in pending for a bit longer to let FS events settle
          setTimeout(() => {
            pendingSaves.current.delete(page.id);
          }, 1000);
        }
      }, 1000),
    []
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!activePageId) return;

      setPages((prev) => {
        const updated = prev.map((p) => {
          if (p.id === activePageId) {
            // Track words for analytics
            const oldWordCount = p.content.trim().split(/\s+/).filter(Boolean).length;
            const newWordCount = content.trim().split(/\s+/).filter(Boolean).length;
            if (newWordCount > oldWordCount) {
              const diff = newWordCount - oldWordCount;
              setSessionWordCount(prev => prev + diff);
              sessionRef.current.wordCount += diff;
              updateCurrentSession(sessionRef.current.wordCount);
            }

            const updatedPage = { ...p, content, updatedAt: Date.now() };
            debouncedSave(updatedPage);
            
            // Update search index
            searchManager.updatePage(updatedPage);
            
            return updatedPage;
          }
          return p;
        });
        return updated;
      });
    },
    [activePageId, debouncedSave]
  );

  const handleTitleChange = useCallback(
    (title: string, isManual: boolean = true) => {
      if (!activePageId) return;
      setPages((prev) => {
        const updated = prev.map((p) => {
          if (p.id === activePageId) {
            const updatedPage = { 
              ...p, 
              title, 
              updatedAt: Date.now(),
              isManuallyEdited: isManual ? true : p.isManuallyEdited 
            };
            debouncedSave(updatedPage);
            searchManager.updatePage(updatedPage);
            return updatedPage;
          }
          return p;
        });
        return updated;
      });
    },
    [activePageId, debouncedSave]
  );

  const handleQuickCaptureSave = async () => {
    if (!quickCaptureContent.trim()) {
      setIsQuickCaptureOpen(false);
      return;
    }

    const now = Date.now();
    const newPage: Page = {
      id: uuidv4(),
      title: "Quick Capture",
      content: quickCaptureContent,
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      templateName: "Quick Capture",
    };
    setPages((prev) => {
      const next = [newPage, ...prev];
      return next;
    });
    setActivePageId(newPage.id);
    setSearchQuery("");
    await storage.savePage(newPage);
    searchManager.updatePage(newPage);
    setQuickCaptureContent("");
    setIsQuickCaptureOpen(false);
  };

  const saveSettings = async (updates: any) => {
    try {
      const currentSettings = await fetch("/api/settings").then(r => r.json()).catch(() => ({}));
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentSettings, ...updates }),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const handleToggleSpellCheck = () => {
    const newState = !isSpellCheckEnabled;
    setIsSpellCheckEnabled(newState);
    localStorage.setItem("flow-spellcheck", JSON.stringify(newState));
    saveSettings({ spellCheck: newState });
  };

  const handleTypographyChange = (key: string, value: string) => {
    setTypography(key, value);
    saveSettings({ typography: { ...typography, [key]: value } });
  };

  const handleDailyWordTargetChange = useCallback(async (value: number) => {
    setDailyWordTarget(value);
    saveSettings({ dailyWordTarget: value });
    
    // Also update analytics goal
    try {
      const analytics = await import("./lib/analytics");
      const data = await analytics.loadAnalytics();
      data.dailyGoal = value;
      await analytics.saveAnalytics();
    } catch (error) {
      console.error("Failed to update daily goal in analytics:", error);
    }
  }, []);

  const handleExportPDF = async () => {
    if (!activePage) return;
    const doc = new jsPDF();
    const html = await marked(activePage.content);
    
    doc.setFontSize(24);
    doc.text(activePage.title || "Untitled", 20, 20);
    doc.setFontSize(12);
    
    // Simple text export for now, could be improved with html2canvas
    const splitText = doc.splitTextToSize(activePage.content, 170);
    doc.text(splitText, 20, 40);
    
    doc.save(`${activePage.title || "Untitled"}.pdf`);
  };

  const handleExportDOCX = async () => {
    if (!activePage) return;
    try {
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activePage.title || "Untitled",
          content: activePage.content,
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activePage.title || "Untitled"}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error("DOCX export failed:", error);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)] text-[var(--text-color)] transition-colors duration-300">
        <div
          className={cn(
            "h-full w-72 shrink-0 transition-all duration-300 ease-in-out",
            isFocusMode ? "-ml-72" : "ml-0"
          )}
        >
          <Sidebar
            pages={filteredPages}
            syncStatus={syncStatus}
            activePageId={activePageId}
            onPageSelect={handlePageSelect}
            onPageCreate={() => setIsTemplatePickerOpen(true)}
            onPageDelete={handlePageDelete}
            onPagePin={handlePagePin}
            onPageDuplicate={handleDuplicatePage}
            onPageSetDefault={handleSetDefaultPage}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAnalytics={() => setIsAnalyticsOpen(true)}
            onPageDeselect={handlePageDeselect}
          />
        </div>

        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {activePage ? (
              <Editor
                page={activePage}
                onContentChange={handleContentChange}
                onTitleChange={handleTitleChange}
                isFocusMode={isFocusMode}
                onToggleFocus={() => setIsFocusMode(!isFocusMode)}
                isTypewriterMode={isTypewriterMode}
                onToggleTypewriter={() => setIsTypewriterMode(!isTypewriterMode)}
                wordCount={wordCount}
                isSpellCheckEnabled={isSpellCheckEnabled}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
                  <FileText size={32} />
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Welcome to Flow
                </h2>
                <p className="mt-2 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
                  A minimalist, distraction-free space for your thoughts.
                </p>
                <button
                  onClick={() => setIsTemplatePickerOpen(true)}
                  className="mt-8 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Create your first page
                </button>
              </div>
            )}
          </div>

          <StatusBar 
            wordCount={wordCount} 
            charCount={charCount} 
            lineCount={lineCount} 
            target={dailyWordTarget}
          />
        </main>

        <ShortcutPalette 
          isOpen={isShortcutPaletteOpen} 
          onClose={() => setIsShortcutPaletteOpen(false)} 
        />

        <Settings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onTypographyChange={handleTypographyChange}
          isSpellCheckEnabled={isSpellCheckEnabled}
          onToggleSpellCheck={handleToggleSpellCheck}
          onExportPDF={handleExportPDF}
          onExportDOCX={handleExportDOCX}
          dailyWordTarget={dailyWordTarget}
          onDailyWordTargetChange={handleDailyWordTargetChange}
        />

        <AnalyticsDashboard
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
        />

        {/* Template Picker Modal */}
        {isTemplatePickerOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-sm dark:bg-black/40">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 p-6 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Choose a Template</h2>
                <button onClick={() => setIsTemplatePickerOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3">
                <button
                  onClick={() => handlePageCreate()}
                  className="flex flex-col items-start rounded-xl border border-zinc-100 p-4 text-left transition-all hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                    <Plus size={20} />
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Blank Page</span>
                  <span className="mt-1 text-xs text-zinc-500">Start from scratch</span>
                </button>
                {BUILTIN_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handlePageCreate(template)}
                    className="flex flex-col items-start rounded-xl border border-zinc-100 p-4 text-left transition-all hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-950/30">
                      <FileText size={20} />
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{template.name}</span>
                    <span className="mt-1 text-xs text-zinc-500 truncate w-full">{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isQuickCaptureOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm dark:bg-black/40">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Quick Capture</h2>
                <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  Ctrl + Enter to save
                </kbd>
              </div>
              <textarea
                autoFocus
                value={quickCaptureContent}
                onChange={(e) => setQuickCaptureContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === "Enter") {
                    handleQuickCaptureSave();
                  }
                  if (e.key === "Escape") {
                    setIsQuickCaptureOpen(false);
                  }
                }}
                placeholder="What's on your mind?"
                className="h-48 w-full resize-none bg-transparent p-4 text-sm outline-none dark:text-zinc-100"
              />
              <div className="flex justify-end border-t border-zinc-100 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                <button
                  onClick={() => setIsQuickCaptureOpen(false)}
                  className="mr-2 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickCaptureSave}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
