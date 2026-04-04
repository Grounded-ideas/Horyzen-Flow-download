/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Plus, Trash2, FileText, Search, Pin, PinOff, Moon, Sun, Settings as SettingsIcon, BarChart2, X, Copy, Edit2, Star } from "lucide-react";
import { Page } from "../types";
import { cn, formatDate } from "../lib/utils";
import React, { useState, useEffect, useCallback, useRef } from "react";
import * as ReactWindow from 'react-window';
// @ts-ignore
import { FixedSizeList } from 'react-window';
// @ts-ignore
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { useTheme } from "../context/ThemeContext";

const List = FixedSizeList;

interface SidebarProps {
  pages: Page[];
  syncStatus: Record<string, 'synced' | 'saving' | 'error'>;
  activePageId: string | null;
  onPageSelect: (id: string) => void;
  onPageCreate: () => void;
  onPageDelete: (id: string) => void;
  onPagePin: (id: string) => void;
  onPageDuplicate: (id: string) => void;
  onPageSetDefault: (id: string) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
  onToggleDarkMode?: () => void;
  onPageDeselect: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  page: Page;
  onClose: () => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSetDefault: (id: string) => void;
  onRename: (id: string) => void;
  onClosePage: () => void;
}

function ContextMenu({ x, y, page, onClose, onPin, onDelete, onDuplicate, onSetDefault, onRename, onClosePage }: ContextMenuProps) {
  useEffect(() => {
    const handleGlobalClick = () => onClose();
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [onClose]);

  return (
    <div 
      className="fixed z-[100] w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onPin(page.id); onClose(); }}
        className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {page.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        <span>{page.isPinned ? "Unpin from Top" : "Pin to Top"}</span>
      </button>
      <button
        onClick={() => { onRename(page.id); onClose(); }}
        className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Edit2 size={14} />
        <span>Rename</span>
      </button>
      <button
        onClick={() => { onDuplicate(page.id); onClose(); }}
        className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Copy size={14} />
        <span>Duplicate</span>
      </button>
      <button
        onClick={() => { onSetDefault(page.id); onClose(); }}
        className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Star size={14} />
        <span>Set as Default</span>
      </button>
      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
      <button
        onClick={() => { onClosePage(); onClose(); }}
        className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <X size={14} />
        <span>Close Page</span>
      </button>
      <button
        onClick={() => { onDelete(page.id); onClose(); }}
        className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <Trash2 size={14} />
        <span>Delete Page</span>
      </button>
    </div>
  );
}

export function Sidebar({
  pages,
  syncStatus,
  activePageId,
  onPageSelect,
  onPageCreate,
  onPageDelete,
  onPagePin,
  onPageDuplicate,
  onPageSetDefault,
  searchQuery,
  onSearch,
  onOpenSettings,
  onOpenAnalytics,
  onToggleDarkMode,
  onPageDeselect,
}: SidebarProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, page: Page } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { isDarkMode, toggleDarkMode: ctxToggleDarkMode } = useTheme();

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleTheme = () => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      ctxToggleDarkMode();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setLocalSearchQuery(query);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      onSearch(query);
    }, 300);
  };

  const handleClearSearch = () => {
    setLocalSearchQuery("");
    onSearch("");
  };

  const handleContextMenu = (e: React.MouseEvent, page: Page) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, page });
  };

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  return (
    <div 
      className="flex h-full w-72 min-w-[288px] flex-col border-r sidebar"
      style={{
        backgroundColor: "var(--theme-sidebarBg)",
        borderColor: "var(--theme-borderColor)"
      }}
    >
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center space-x-2">
          <img
            src="/asset/Flow.svg"
            alt="Flow Logo"
            className="h-6 w-6 brand-icon small object-contain"
          />
          <h1 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Flow
          </h1>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={toggleTheme}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={onPageCreate}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title="New Page (Cmd+N)"
            aria-label="New Page"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Search pages..."
            value={localSearchQuery}
            onChange={handleSearch}
            className="w-full rounded-lg border py-2 pl-9 pr-8 text-sm outline-none focus:border-zinc-400 dark:text-white"
            style={{
              backgroundColor: "var(--theme-buttonBg)",
              borderColor: "var(--theme-borderColor)",
              color: "var(--theme-textPrimary)"
            }}
          />
          {localSearchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-0 py-2 overflow-hidden relative min-h-0">
        {!isInitialized ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
          </div>
        ) : pages.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center px-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600">
              <FileText size={20} />
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">No pages found</p>
            <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">Create a new page to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-1 px-2 overflow-y-auto h-full scrollbar-hide">
            {pages.map((page) => {
              const isActive = activePageId === page.id;
              const status = syncStatus[page.id] || 'synced';
              return (
                <div
                  key={page.id}
                  className={cn(
                    "group relative flex h-14 shrink-0 cursor-pointer items-center rounded-lg px-3 transition-all duration-150 sidebar-item",
                    isActive && "active"
                  )}
                  style={{
                    backgroundColor: isActive ? "var(--theme-sidebarItemActive)" : "transparent",
                    color: isActive ? "var(--theme-textPrimary)" : "var(--theme-textSecondary)"
                  }}
                  onClick={() => onPageSelect(page.id)}
                  onContextMenu={(e) => handleContextMenu(e, page)}
                >
                  <div className={cn(
                    "mr-3 flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  )} style={{
                    backgroundColor: isActive ? "var(--theme-buttonBg)" : "transparent",
                    color: isActive ? "var(--theme-pageOutlineColor)" : "var(--theme-textSecondary)"
                  }}>
                    {page.isPinned ? <Pin size={16} className="fill-current" /> : <FileText size={16} />}
                  </div>
                  <div className="flex-1 overflow-hidden text-left">
                    <p className={cn(
                      "truncate text-sm font-medium",
                      !page.title && "italic opacity-70"
                    )} style={{
                      color: isActive ? "var(--theme-textPrimary)" : (!page.title ? "var(--theme-textSecondary)" : "var(--theme-textPrimary)")
                    }}>
                      {page.title || "No Title"}
                    </p>
                    <div className="flex items-center space-x-1.5">
                      <p className={cn(
                        "truncate text-[10px] opacity-50",
                        isActive ? "text-white/80" : "text-zinc-500"
                      )}>
                        {formatDate(page.updatedAt)}
                      </p>
                      {status === 'saving' && (
                        <span className={cn(
                          "flex h-1.5 w-1.5 animate-pulse rounded-full",
                          isActive ? "bg-white" : "bg-orange-500"
                        )} />
                      )}
                      {status === 'error' && (
                        <span className="flex h-1.5 w-1.5 rounded-full bg-red-500" title="Sync Error" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu 
          {...contextMenu} 
          onClose={() => setContextMenu(null)}
          onPin={onPagePin}
          onDelete={onPageDelete}
          onDuplicate={onPageDuplicate}
          onSetDefault={onPageSetDefault}
          onRename={(id) => {
            onPageSelect(id);
            // Focus title field is handled in Editor
          }}
          onClosePage={onPageDeselect}
        />
      )}

      <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenAnalytics}
            className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            aria-label="View Analytics"
          >
            <BarChart2 size={14} />
            <span>Stats</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            aria-label="Open Settings"
          >
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
