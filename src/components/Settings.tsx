import React, { useState } from "react";
import { X, Check, Moon, Sun, Type, Layout, BarChart2, FileDown, Plus } from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../context/ThemeContext";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onTypographyChange: (key: any, value: string) => void;
  isSpellCheckEnabled: boolean;
  onToggleSpellCheck: () => void;
  onExportPDF: () => void;
  onExportDOCX: () => void;
  dailyWordTarget: number;
  onDailyWordTargetChange: (value: number) => void;
}

export function Settings({
  isOpen,
  onClose,
  onTypographyChange,
  isSpellCheckEnabled,
  onToggleSpellCheck,
  onExportPDF,
  onExportDOCX,
  dailyWordTarget,
  onDailyWordTargetChange,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<"appearance" | "writing" | "export">("appearance");
  const { themes, themeOrder, currentThemeId, setTheme, isDarkMode, typography, setTypography } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm dark:bg-black/40">
      <div className="flex h-[600px] w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Sidebar */}
        <div className="w-64 border-r border-zinc-100 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("appearance")}
              className={cn(
                "flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "appearance"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              )}
            >
              <Layout size={18} />
              <span>Appearance</span>
            </button>
            <button
              onClick={() => setActiveTab("writing")}
              className={cn(
                "flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "writing"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              )}
            >
              <Type size={18} />
              <span>Writing</span>
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={cn(
                "flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "export"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              )}
            >
              <FileDown size={18} />
              <span>Export</span>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {activeTab === "appearance" && (
            <div className="space-y-8">
              <section>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Themes</h3>
                <div className="grid grid-cols-2 gap-4">
                  {themeOrder.map((id) => {
                    const theme = themes[id];
                    const colors = isDarkMode ? theme.dark : theme.light;
                    return (
                      <button
                        key={id}
                        onClick={() => setTheme(id)}
                        className={cn(
                          "group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                          currentThemeId === id
                            ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                            : "border-zinc-100 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        )}
                      >
                        <div className="mb-2 flex w-full items-center justify-between">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{theme.name}</span>
                          {currentThemeId === id && <Check size={16} className="text-orange-500" />}
                        </div>
                        <div className="flex space-x-1">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.editorBg }} />
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.textPrimary }} />
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.accentPrimary }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Typography</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">Font Size</label>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-zinc-400">{typography.fontSize}</span>
                      <input 
                        type="range" 
                        min="12" 
                        max="32" 
                        value={parseInt(typography.fontSize)}
                        onChange={(e) => setTypography("fontSize", `${e.target.value}px`)}
                        className="accent-orange-500" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">Line Height</label>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-zinc-400">{typography.lineHeight}</span>
                      <input 
                        type="range" 
                        min="1.2" 
                        max="2.4" 
                        step="0.1" 
                        value={parseFloat(typography.lineHeight)}
                        onChange={(e) => setTypography("lineHeight", e.target.value)}
                        className="accent-orange-500" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">Max Width</label>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-zinc-400">{typography.maxWidth}</span>
                      <input 
                        type="range" 
                        min="400" 
                        max="1200" 
                        step="50" 
                        value={parseInt(typography.maxWidth)}
                        onChange={(e) => setTypography("maxWidth", `${e.target.value}px`)}
                        className="accent-orange-500" 
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="pt-4">
                <button
                  onClick={() => setTheme("brand")}
                  className="text-xs font-medium text-orange-500 hover:text-orange-600"
                >
                  Reset to Default Theme
                </button>
              </section>
            </div>
          )}

          {activeTab === "writing" && (
            <div className="space-y-8">
              <section>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Writing Goals</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Daily Word Target</p>
                      <p className="text-xs text-zinc-500">Set a goal for how many words you want to write each day.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{dailyWordTarget}</span>
                      <input 
                        type="range" 
                        min="100" 
                        max="5000" 
                        step="100" 
                        value={dailyWordTarget}
                        onChange={(e) => onDailyWordTargetChange(parseInt(e.target.value))}
                        className="accent-orange-500" 
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Editor Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Spell Check</p>
                      <p className="text-xs text-zinc-500">Underline misspelled words and show suggestions.</p>
                    </div>
                    <button
                      onClick={onToggleSpellCheck}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        isSpellCheckEnabled ? "bg-orange-500" : "bg-zinc-200 dark:bg-zinc-800"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform",
                          isSpellCheckEnabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "export" && (
            <div className="space-y-8">
              <section>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Export Options</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={onExportPDF}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-100 p-8 transition-all hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/30">
                      <FileDown size={24} />
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Export as PDF</span>
                    <span className="mt-1 text-xs text-zinc-500">Best for printing</span>
                  </button>
                  <button
                    onClick={onExportDOCX}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-100 p-8 transition-all hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-950/30">
                      <FileDown size={24} />
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Export as DOCX</span>
                    <span className="mt-1 text-xs text-zinc-500">Best for editing</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
