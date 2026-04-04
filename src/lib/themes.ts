export interface ThemeColors {
  sidebarBg: string;
  editorBg: string;
  textPrimary: string;
  textSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
  accentMuted: string;
  borderColor: string;
  buttonBg: string;
  buttonHover: string;
  sidebarItemActive: string;
  sidebarItemHover: string;
  pageOutlineColor: string;
}

export interface Theme {
  id: string;
  name: string;
  isDefault: boolean;
  light: ThemeColors;
  dark: ThemeColors;
}

export const themesData: { themes: Record<string, Theme>; themeOrder: string[] } = {
  "themes": {
    "brand": {
      "id": "brand",
      "name": "Flow Brand",
      "isDefault": true,
      "light": {
        "sidebarBg": "#f5f7f6",
        "editorBg": "#ffffff",
        "textPrimary": "#1a1f1e",
        "textSecondary": "#5a6b66",
        "accentPrimary": "#418C83",
        "accentSecondary": "#2d6b63",
        "accentMuted": "#8fa8a2",
        "borderColor": "#e2e8e6",
        "buttonBg": "#eef2f0",
        "buttonHover": "#e2e8e6",
        "sidebarItemActive": "#418C8320",
        "sidebarItemHover": "#418C8310",
        "pageOutlineColor": "#418C83"
      },
      "dark": {
        "sidebarBg": "#1e2226",
        "editorBg": "#282C31",
        "textPrimary": "#edf2f7",
        "textSecondary": "#a0aec0",
        "accentPrimary": "#418C83",
        "accentSecondary": "#5aa69d",
        "accentMuted": "#4a5b56",
        "borderColor": "#3a4048",
        "buttonBg": "#3a4048",
        "buttonHover": "#4a525c",
        "sidebarItemActive": "#418C8320",
        "sidebarItemHover": "#418C8310",
        "pageOutlineColor": "#5aa69d"
      }
    },
    "classic": {
      "id": "classic",
      "name": "Classic",
      "isDefault": false,
      "light": {
        "sidebarBg": "#fafafa",
        "editorBg": "#ffffff",
        "textPrimary": "#18181b",
        "textSecondary": "#71717a",
        "accentPrimary": "#f27d26",
        "accentSecondary": "#f27d26",
        "accentMuted": "#71717a",
        "borderColor": "#e4e4e7",
        "buttonBg": "#f4f4f5",
        "buttonHover": "#e4e4e7",
        "sidebarItemActive": "#f27d2620",
        "sidebarItemHover": "#f27d2610",
        "pageOutlineColor": "#f27d26"
      },
      "dark": {
        "sidebarBg": "#1A1A1A",
        "editorBg": "#09090b",
        "textPrimary": "#f4f4f5",
        "textSecondary": "#a1a1aa",
        "accentPrimary": "#f27d26",
        "accentSecondary": "#f27d26",
        "accentMuted": "#a1a1aa",
        "borderColor": "#27272a",
        "buttonBg": "#27272a",
        "buttonHover": "#3f3f46",
        "sidebarItemActive": "#f27d2620",
        "sidebarItemHover": "#f27d2610",
        "pageOutlineColor": "#f27d26"
      }
    },
    "solarized": {
      "id": "solarized",
      "name": "Solarized",
      "isDefault": false,
      "light": {
        "sidebarBg": "#fafafa",
        "editorBg": "#fdf6e3",
        "textPrimary": "#657b83",
        "textSecondary": "#93a1a1",
        "accentPrimary": "#268bd2",
        "accentSecondary": "#268bd2",
        "accentMuted": "#93a1a1",
        "borderColor": "#eee8d5",
        "buttonBg": "#f4f4f5",
        "buttonHover": "#e4e4e7",
        "sidebarItemActive": "#268bd220",
        "sidebarItemHover": "#268bd210",
        "pageOutlineColor": "#268bd2"
      },
      "dark": {
        "sidebarBg": "#1A1A1A",
        "editorBg": "#002b36",
        "textPrimary": "#839496",
        "textSecondary": "#586e75",
        "accentPrimary": "#268bd2",
        "accentSecondary": "#268bd2",
        "accentMuted": "#586e75",
        "borderColor": "#073642",
        "buttonBg": "#27272a",
        "buttonHover": "#3f3f46",
        "sidebarItemActive": "#268bd220",
        "sidebarItemHover": "#268bd210",
        "pageOutlineColor": "#268bd2"
      }
    },
    "github": {
      "id": "github",
      "name": "GitHub",
      "isDefault": false,
      "light": {
        "sidebarBg": "#fafafa",
        "editorBg": "#ffffff",
        "textPrimary": "#24292e",
        "textSecondary": "#6a737d",
        "accentPrimary": "#0366d6",
        "accentSecondary": "#0366d6",
        "accentMuted": "#6a737d",
        "borderColor": "#e1e4e8",
        "buttonBg": "#f4f4f5",
        "buttonHover": "#e4e4e7",
        "sidebarItemActive": "#0366d620",
        "sidebarItemHover": "#0366d610",
        "pageOutlineColor": "#0366d6"
      },
      "dark": {
        "sidebarBg": "#161b22",
        "editorBg": "#0d1117",
        "textPrimary": "#c9d1d9",
        "textSecondary": "#8b949e",
        "accentPrimary": "#58a6ff",
        "accentSecondary": "#58a6ff",
        "accentMuted": "#8b949e",
        "borderColor": "#30363d",
        "buttonBg": "#21262d",
        "buttonHover": "#30363d",
        "sidebarItemActive": "#58a6ff20",
        "sidebarItemHover": "#58a6ff10",
        "pageOutlineColor": "#58a6ff"
      }
    },
    "dracula": {
      "id": "dracula",
      "name": "Dracula",
      "isDefault": false,
      "light": {
        "sidebarBg": "#f0ede8",
        "editorBg": "#faf8f5",
        "textPrimary": "#2d2a2a",
        "textSecondary": "#6b6b6b",
        "accentPrimary": "#bd93f9",
        "accentSecondary": "#bd93f9",
        "accentMuted": "#6b6b6b",
        "borderColor": "#e0dbd3",
        "buttonBg": "#e8e4dc",
        "buttonHover": "#ddd8ce",
        "sidebarItemActive": "#bd93f920",
        "sidebarItemHover": "#bd93f910",
        "pageOutlineColor": "#bd93f9"
      },
      "dark": {
        "sidebarBg": "#1A1A1A",
        "editorBg": "#282a36",
        "textPrimary": "#f8f8f2",
        "textSecondary": "#6272a4",
        "accentPrimary": "#bd93f9",
        "accentSecondary": "#bd93f9",
        "accentMuted": "#6272a4",
        "borderColor": "#44475a",
        "buttonBg": "#27272a",
        "buttonHover": "#3f3f46",
        "sidebarItemActive": "#bd93f920",
        "sidebarItemHover": "#bd93f910",
        "pageOutlineColor": "#bd93f9"
      }
    },
    "monokai": {
      "id": "monokai",
      "name": "Monokai",
      "isDefault": false,
      "light": {
        "sidebarBg": "#f0ece0",
        "editorBg": "#f9f6ee",
        "textPrimary": "#2c2c2c",
        "textSecondary": "#7a7a5a",
        "accentPrimary": "#a6e22e",
        "accentSecondary": "#a6e22e",
        "accentMuted": "#7a7a5a",
        "borderColor": "#e0dcc8",
        "buttonBg": "#e8e4d4",
        "buttonHover": "#ddd8c4",
        "sidebarItemActive": "#a6e22e20",
        "sidebarItemHover": "#a6e22e10",
        "pageOutlineColor": "#a6e22e"
      },
      "dark": {
        "sidebarBg": "#1A1A1A",
        "editorBg": "#272822",
        "textPrimary": "#f8f8f2",
        "textSecondary": "#75715e",
        "accentPrimary": "#a6e22e",
        "accentSecondary": "#a6e22e",
        "accentMuted": "#75715e",
        "borderColor": "#3e3d32",
        "buttonBg": "#27272a",
        "buttonHover": "#3f3f46",
        "sidebarItemActive": "#a6e22e20",
        "sidebarItemHover": "#a6e22e10",
        "pageOutlineColor": "#a6e22e"
      }
    }
  },
  "themeOrder": ["brand", "classic", "solarized", "github", "dracula", "monokai"]
};
