/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView, placeholder } from "@codemirror/view";
import { Page } from "../types";
import { cn } from "../lib/utils";
import { Maximize2, Minimize2, Type, Plus } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { spellcheckPlugin } from "../lib/cm-spellcheck";
import { checkWord, getSuggestions, addWordToDictionary } from "../lib/spellcheck";

interface EditorProps {
  page: Page | null;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string, isManual?: boolean) => void;
  isFocusMode: boolean;
  onToggleFocus: () => void;
  isTypewriterMode: boolean;
  onToggleTypewriter: () => void;
  wordCount: number;
  isSpellCheckEnabled: boolean;
}

export function Editor({
  page,
  onContentChange,
  onTitleChange,
  isFocusMode,
  onToggleFocus,
  isTypewriterMode,
  onToggleTypewriter,
  wordCount,
  isSpellCheckEnabled,
}: EditorProps) {
  const [isHoveringTop, setIsHoveringTop] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const editorRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isFocusMode) {
      setIsHoveringTop(e.clientY < 50);
    }
  };

  const handleMouseLeave = () => {
    if (isFocusMode) {
      setIsHoveringTop(false);
    }
  };

  const handleEditorChange = (value: string, viewUpdate: any) => {
    onContentChange(value);
    
    if (isFocusMode) {
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isSpellCheckEnabled) return;

    const view = editorRef.current?.view;
    if (!view) return;

    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    if (pos === null) return;

    const line = view.state.doc.lineAt(pos);
    const text = line.text;
    const offset = pos - line.from;

    // Find word at position
    const wordRegex = /[a-zA-Z']+/g;
    let match;
    let foundWord = "";

    while ((match = wordRegex.exec(text)) !== null) {
      if (offset >= match.index && offset <= match.index + match[0].length) {
        foundWord = match[0];
        break;
      }
    }

    if (foundWord) {
      const sugs = getSuggestions(foundWord);
      if (sugs.length > 0 || !checkWord(foundWord)) { // Check if misspelled
        e.preventDefault();
        setSuggestions({
          word: foundWord,
          suggestions: sugs.slice(0, 3),
          x: e.clientX,
          y: e.clientY,
          from: line.from + text.indexOf(foundWord),
          to: line.from + text.indexOf(foundWord) + foundWord.length
        });
      }
    }
  };

  const applySuggestion = (newWord: string) => {
    if (!suggestions || !editorRef.current?.view) return;
    const view = editorRef.current.view;
    
    view.dispatch({
      changes: { from: suggestions.from, to: suggestions.to, insert: newWord }
    });
    setSuggestions(null);
  };

  const handleAddToDictionary = () => {
    if (!suggestions) return;
    addWordToDictionary(suggestions.word);
    setSuggestions(null);
  };

  useEffect(() => {
    const handleClickOutside = () => setSuggestions(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Reset typing state when focus mode changes
  useEffect(() => {
    setIsTyping(false);
  }, [isFocusMode]);

  const editorExtensions = useMemo(() => {
    const extensions = [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      placeholder("Start writing..."),
      EditorView.theme({
        "&": {
          fontSize: "var(--flow-font-size, 20px)",
          fontFamily: "var(--flow-font-family, 'Inter', ui-sans-serif, system-ui, sans-serif)",
          lineHeight: "var(--flow-line-height, 1.8)",
          height: "100%",
          backgroundColor: "transparent",
          color: "var(--theme-textPrimary)",
          overflow: isTypewriterMode ? "auto !important" : "hidden !important",
        },
        ".cm-content": {
          padding: isTypewriterMode ? "0 50vw 50vh 50vw" : "0 0 50vh 0",
          caretColor: "var(--theme-accentPrimary) !important",
          whiteSpace: isTypewriterMode ? "pre !important" : "pre-wrap !important",
        },
        ".cm-cursor, .cm-dropCursor": {
          borderLeft: "2px solid var(--theme-accentPrimary) !important",
          marginLeft: "-1px",
        },
        ".cm-focused .cm-cursor": {
          display: "block !important",
          visibility: "visible !important",
          animation: "cm-blink 1.2s steps(1) infinite",
        },
        "@keyframes cm-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        ".cm-line": {
          padding: "0 4px",
        },
        ".cm-activeLine": {
          backgroundColor: isTypewriterMode ? "var(--theme-sidebarItemHover)" : "transparent",
          borderRadius: "4px",
        },
        ".cm-misspelled": {
          textDecoration: "underline wavy #ef4444",
          textDecorationThickness: "1px",
          textUnderlineOffset: "2px",
        },
        ".cm-gutters": {
          display: "none",
        },
        "&.cm-focused": {
          outline: "none",
        },
        ".cm-scroller": {
          overflow: "auto !important",
        },
        ".cm-header-1": { fontSize: "1.8em", fontWeight: "700", display: "block", marginBottom: "0.5em", color: "var(--theme-textPrimary)" },
        ".cm-header-2": { fontSize: "1.5em", fontWeight: "600", display: "block", marginBottom: "0.4em", color: "var(--theme-textPrimary)" },
        ".cm-header-3": { fontSize: "1.2em", fontWeight: "600", display: "block", marginBottom: "0.3em", color: "var(--theme-textPrimary)" },
      }),
    ];

    if (isSpellCheckEnabled) {
      extensions.push(spellcheckPlugin());
    }

    if (isTypewriterMode) {
      extensions.push(EditorView.updateListener.of((update) => {
        if (update.selectionSet || update.docChanged) {
          // Use a small delay to ensure the DOM has updated
          setTimeout(() => {
            update.view.dispatch({
              effects: EditorView.scrollIntoView(update.view.state.selection.main.head, { y: "center", x: "center" })
            });
          }, 0);
        }
      }));
    }

    return extensions;
  }, [isTypewriterMode, isSpellCheckEnabled]);

  if (!page) {
    return (
      <div className="flex h-full flex-col items-center justify-center" style={{ backgroundColor: "var(--theme-editorBg)" }}>
        <div className="max-w-md text-center">
          <h2 className="text-xl font-medium" style={{ color: "var(--theme-textPrimary)" }}>
            Select a page or create a new one.
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--theme-textSecondary)" }}>
            Flow is a distraction-free space for your thoughts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full flex-col transition-all duration-300",
        isFocusMode ? "p-0" : "p-8 md:p-12"
      )}
      style={{ backgroundColor: "var(--theme-editorBg)" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-col h-full",
          isFocusMode ? "max-w-4xl pt-24" : ""
        )}
      >
        <div 
          className={cn(
            "mb-12 flex items-center justify-between transition-opacity duration-300",
            isFocusMode ? (isHoveringTop ? "opacity-100" : "opacity-0") : "opacity-100"
          )}
        >
          <input
            type="text"
            value={page.title}
            onChange={(e) => onTitleChange(e.target.value, true)}
            onFocus={() => onTitleChange(page.title, true)}
            placeholder="Page Title"
            className={cn(
              "w-full bg-transparent text-4xl font-bold tracking-tight outline-none",
              isFocusMode ? "opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity duration-500" : ""
            )}
            style={{
              color: "var(--theme-textPrimary)",
            }}
          />
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleTypewriter}
              className={cn(
                "rounded-md p-2 transition-colors",
                isTypewriterMode
                  ? "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                  : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
                isFocusMode ? "fixed right-20 top-8 z-50" : ""
              )}
              title="Typewriter Mode"
            >
              <Type size={20} />
            </button>
            <button
              onClick={onToggleFocus}
              className={cn(
                "rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
                isFocusMode ? "fixed right-8 top-8 z-50" : ""
              )}
              title="Focus Mode"
            >
              {isFocusMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden" onContextMenu={handleContextMenu}>
          <CodeMirror
            ref={editorRef}
            value={page.content}
            height="100%"
            theme="none"
            extensions={editorExtensions}
            onChange={(value, viewUpdate) => handleEditorChange(value, viewUpdate)}
            className="h-full scrollbar-hide"
            basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              highlightActiveLine: isTypewriterMode,
            }}
          />
        </div>

        {/* Spell Check Suggestions */}
        {suggestions && (
          <div 
            className="fixed z-[100] w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            style={{ left: suggestions.x, top: suggestions.y }}
            onClick={(e) => e.stopPropagation()}
            role="menu"
            aria-label="Spelling suggestions"
          >
            <div className="border-b border-zinc-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:border-zinc-800">
              Suggestions for "{suggestions.word}"
            </div>
            {suggestions.suggestions.length > 0 ? (
              suggestions.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => applySuggestion(s)}
                  className="flex w-full items-center px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  role="menuitem"
                >
                  {s}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-zinc-500 italic">No suggestions found</div>
            )}
            <div className="border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={handleAddToDictionary}
                className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                role="menuitem"
              >
                <Plus size={14} />
                <span>Add to Dictionary</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Status Bar */}
      <div
        className={cn(
          "fixed bottom-6 right-8 flex items-center space-x-4 text-[10px] font-medium uppercase tracking-widest text-zinc-400 transition-opacity duration-300",
          (isFocusMode && isTyping) ? "opacity-0" : (isFocusMode ? "opacity-0 hover:opacity-100" : "opacity-100")
        )}
      >
        <span>{wordCount} Words</span>
        <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-800" />
        <span>{page.content.length} Characters</span>
      </div>
    </div>
  );
}