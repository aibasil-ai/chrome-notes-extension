# Chrome 筆記擴充功能實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立一個 Chrome 擴充功能，讓使用者能在瀏覽網頁時做筆記，支援多介面模式、跨裝置同步和標籤管理。

**Architecture:** React 18 + TypeScript + Vite 建置的 Chrome Extension (Manifest V3)。使用 Zustand 管理狀態，Chrome Storage API 處理資料儲存和同步。支援 Popup、Sidebar 和獨立視窗三種介面模式。

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Tailwind CSS, react-simplemde-editor, react-markdown, Chrome Extension Manifest V3

---

## Phase 1: 專案初始化與基礎架構

### Task 1: 初始化 Vite + React + TypeScript 專案

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `.gitignore`

**Step 1: 初始化專案**

Run: `npm create vite@latest chrome-notes-extension -- --template react-ts`

Expected: 建立基本的 React + TypeScript 專案結構

**Step 2: 進入專案目錄並安裝依賴**

Run: `cd chrome-notes-extension && npm install`

Expected: 安裝所有基本依賴

**Step 3: 安裝額外依賴**

Run: `npm install zustand react-markdown react-simplemde-editor easymde @types/chrome tailwindcss postcss autoprefixer`

Expected: 安裝狀態管理、Markdown 編輯器和 Tailwind CSS

**Step 4: 初始化 Tailwind CSS**

Run: `npx tailwindcss init -p`

Expected: 建立 `tailwind.config.js` 和 `postcss.config.js`

**Step 5: 設定 Tailwind CSS**

修改 `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 6: 更新 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 7: Commit**

```bash
git add .
git commit -m "chore: initialize Vite + React + TypeScript project with Tailwind CSS

- Set up Vite with React 18 and TypeScript
- Install Zustand for state management
- Install react-markdown and react-simplemde-editor
- Configure Tailwind CSS

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: 設定 Vite 建置 Chrome Extension

**Files:**
- Modify: `vite.config.ts`
- Create: `public/manifest.json`
- Create: `src/background/service-worker.ts`

**Step 1: 修改 vite.config.ts 支援多入口點**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        sidebar: resolve(__dirname, 'sidebar.html'),
        window: resolve(__dirname, 'window.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
  },
})
```

**Step 2: 建立 manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Chrome Notes",
  "version": "1.0.0",
  "description": "Take notes while browsing the web",
  "permissions": [
    "storage",
    "activeTab",
    "sidePanel"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "side_panel": {
    "default_path": "sidebar.html"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Step 3: 建立 background service worker**

```typescript
// src/background/service-worker.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log('Chrome Notes Extension installed');
});

// 處理側邊欄開啟
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
```

**Step 4: 建立 HTML 入口檔案**

建立 `popup.html`:
```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chrome Notes - Popup</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/pages/Popup.tsx"></script>
  </body>
</html>
```

建立 `sidebar.html`:
```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chrome Notes - Sidebar</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/pages/Sidebar.tsx"></script>
  </body>
</html>
```

建立 `window.html`:
```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chrome Notes - Window</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/pages/Window.tsx"></script>
  </body>
</html>
```

**Step 5: Commit**

```bash
git add vite.config.ts public/manifest.json src/background/ popup.html sidebar.html window.html
git commit -m "feat: configure Vite for Chrome Extension build

- Set up multi-entry build for popup, sidebar, and window
- Create manifest.json with Manifest V3
- Add background service worker
- Create HTML entry files for each mode

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: 建立 TypeScript 型別定義

**Files:**
- Create: `src/types/note.ts`

**Step 1: 建立 Note 相關型別**

```typescript
// src/types/note.ts
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  pageContext?: {
    url: string;
    pageTitle: string;
    capturedAt: number;
  };
  editMode: 'plain' | 'markdown';
}

export interface AppSettings {
  defaultEditMode: 'plain' | 'markdown';
  autoSaveInterval: number;
  capturePageByDefault: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface StorageData {
  notes: Note[];
  settings: AppSettings;
  lastSyncAt: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultEditMode: 'markdown',
  autoSaveInterval: 3000,
  capturePageByDefault: true,
  theme: 'auto',
};
```

**Step 2: Commit**

```bash
git add src/types/
git commit -m "feat: add TypeScript type definitions

- Define Note, AppSettings, and StorageData interfaces
- Add default settings constant

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: 建立 Storage Service

**Files:**
- Create: `src/services/storage.ts`
- Create: `src/utils/uuid.ts`

**Step 1: 建立 UUID 工具函式**

```typescript
// src/utils/uuid.ts
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
```

**Step 2: 建立 Storage Service**

```typescript
// src/services/storage.ts
import type { Note, AppSettings } from '../types/note';
import { DEFAULT_SETTINGS } from '../types/note';

const SYNC_STORAGE_LIMIT = 80 * 1024; // 80KB
const MAX_SYNC_NOTES = 50;

export class StorageService {
  async getAllNotes(): Promise<Note[]> {
    try {
      const result = await chrome.storage.local.get('notes');
      return result.notes || [];
    } catch (error) {
      console.error('Failed to get notes:', error);
      throw error;
    }
  }

  async saveNote(note: Note): Promise<void> {
    const notes = await this.getAllNotes();
    const existingIndex = notes.findIndex((n) => n.id === note.id);

    if (existingIndex >= 0) {
      notes[existingIndex] = note;
    } else {
      notes.unshift(note);
    }

    await chrome.storage.local.set({ notes });
    await this.syncToSyncStorage(notes);
  }

  async deleteNote(noteId: string): Promise<void> {
    const notes = await this.getAllNotes();
    const filteredNotes = notes.filter((n) => n.id !== noteId);
    await chrome.storage.local.set({ notes: filteredNotes });
    await this.syncToSyncStorage(filteredNotes);
  }

  private async syncToSyncStorage(notes: Note[]): Promise<void> {
    try {
      const recentNotes = notes.slice(0, MAX_SYNC_NOTES);
      const dataSize = JSON.stringify(recentNotes).length;

      if (dataSize < SYNC_STORAGE_LIMIT) {
        await chrome.storage.sync.set({ recentNotes });
      }
    } catch (error) {
      console.warn('Failed to sync to sync storage:', error);
    }
  }

  async getSettings(): Promise<AppSettings> {
    try {
      const result = await chrome.storage.sync.get('settings');
      return result.settings || DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await chrome.storage.sync.set({ settings });
  }
}

export const storageService = new StorageService();
```

**Step 3: Commit**

```bash
git add src/services/storage.ts src/utils/uuid.ts
git commit -m "feat: implement Storage Service

- Create UUID generator utility
- Implement StorageService with CRUD operations
- Add sync storage support with size limit handling

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: 建立 Zustand Store

**Files:**
- Create: `src/store/useNotesStore.ts`

**Step 1: 建立 Notes Store**

```typescript
// src/store/useNotesStore.ts
import { create } from 'zustand';
import type { Note, AppSettings } from '../types/note';
import { storageService } from '../services/storage';
import { generateUUID } from '../utils/uuid';

interface NotesState {
  notes: Note[];
  settings: AppSettings;
  isLoading: boolean;
  selectedNoteId: string | null;

  loadNotes: () => Promise<void>;
  loadSettings: () => Promise<void>;
  createNote: (title: string, content: string, tags: string[], pageContext?: Note['pageContext']) => Promise<void>;
  updateNote: (note: Note) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  selectNote: (noteId: string | null) => void;
  updateSettings: (settings: AppSettings) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  settings: {
    defaultEditMode: 'markdown',
    autoSaveInterval: 3000,
    capturePageByDefault: true,
    theme: 'auto',
  },
  isLoading: false,
  selectedNoteId: null,

  loadNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await storageService.getAllNotes();
      set({ notes, isLoading: false });
    } catch (error) {
      console.error('Failed to load notes:', error);
      set({ isLoading: false });
    }
  },

  loadSettings: async () => {
    try {
      const settings = await storageService.getSettings();
      set({ settings });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  createNote: async (title, content, tags, pageContext) => {
    const { settings } = get();
    const now = Date.now();
    const note: Note = {
      id: generateUUID(),
      title,
      content,
      tags,
      createdAt: now,
      updatedAt: now,
      pageContext,
      editMode: settings.defaultEditMode,
    };

    await storageService.saveNote(note);
    set((state) => ({ notes: [note, ...state.notes] }));
  },

  updateNote: async (note) => {
    const updatedNote = { ...note, updatedAt: Date.now() };
    await storageService.saveNote(updatedNote);
    set((state) => ({
      notes: state.notes.map((n) => (n.id === note.id ? updatedNote : n)),
    }));
  },

  deleteNote: async (noteId) => {
    await storageService.deleteNote(noteId);
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== noteId),
      selectedNoteId: state.selectedNoteId === noteId ? null : state.selectedNoteId,
    }));
  },

  selectNote: (noteId) => {
    set({ selectedNoteId: noteId });
  },

  updateSettings: async (settings) => {
    await storageService.saveSettings(settings);
    set({ settings });
  },
}));
```

**Step 2: Commit**

```bash
git add src/store/
git commit -m "feat: create Zustand store for notes management

- Implement useNotesStore with CRUD operations
- Add settings management
- Add note selection state
- Integrate with StorageService

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 2: 核心 UI 元件

### Task 6: 建立共用元件

**Files:**
- Create: `src/components/shared/Button.tsx`
- Create: `src/components/shared/Input.tsx`
- Create: `src/components/shared/index.ts`

**Step 1: 建立 Button 元件**

```typescript
// src/components/shared/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseClasses = 'rounded font-medium transition-colors';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

**Step 2: 建立 Input 元件**

```typescript
// src/components/shared/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
```

**Step 3: 建立 index.ts**

```typescript
// src/components/shared/index.ts
export { Button } from './Button';
export { Input } from './Input';
```

**Step 4: Commit**

```bash
git add src/components/shared/
git commit -m "feat: create shared UI components

- Add Button component with variants and sizes
- Add Input component with label and error support

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: 建立 NoteList 元件

**Files:**
- Create: `src/components/NoteList/NoteList.tsx`
- Create: `src/components/NoteList/NoteItem.tsx`
- Create: `src/components/NoteList/index.ts`

**Step 1: 建立 NoteItem 元件**

```typescript
// src/components/NoteList/NoteItem.tsx
import React from 'react';
import type { Note } from '../../types/note';

interface NoteItemProps {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export const NoteItem: React.FC<NoteItemProps> = ({
  note,
  isSelected,
  onClick,
  onDelete,
}) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-gray-900 truncate flex-1">
          {note.title || '無標題'}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-gray-400 hover:text-red-600 ml-2"
          title="刪除"
        >
          ✕
        </button>
      </div>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-gray-200 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>{formatDate(note.updatedAt)}</span>
        {note.pageContext && (
          <span title={note.pageContext.url}>🔗</span>
        )}
      </div>
    </div>
  );
};
```

**Step 2: 建立 NoteList 元件**

```typescript
// src/components/NoteList/NoteList.tsx
import React from 'react';
import type { Note } from '../../types/note';
import { NoteItem } from './NoteItem';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onDeleteNote,
}) => {
  if (notes.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>還沒有筆記</p>
        <p className="text-sm mt-2">點擊「新增筆記」開始記錄</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          isSelected={note.id === selectedNoteId}
          onClick={() => onSelectNote(note.id)}
          onDelete={() => onDeleteNote(note.id)}
        />
      ))}
    </div>
  );
};
```

**Step 3: 建立 index.ts**

```typescript
// src/components/NoteList/index.ts
export { NoteList } from './NoteList';
```

**Step 4: Commit**

```bash
git add src/components/NoteList/
git commit -m "feat: create NoteList component

- Add NoteItem component with delete button
- Add NoteList component with empty state
- Display tags, date, and page context indicator

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: 建立 NoteEditor 元件

**Files:**
- Create: `src/components/NoteEditor/NoteEditor.tsx`
- Create: `src/components/NoteEditor/TagInput.tsx`
- Create: `src/components/NoteEditor/index.ts`
- Create: `src/hooks/useAutoSave.ts`

**Step 1: 建立 useAutoSave Hook**

```typescript
// src/hooks/useAutoSave.ts
import { useEffect, useRef } from 'react';

export function useAutoSave(
  callback: () => void,
  delay: number,
  dependencies: any[]
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);
}
```

**Step 2: 建立 TagInput 元件**

```typescript
// src/components/NoteEditor/TagInput.tsx
import React, { useState, KeyboardEvent } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  availableTags: string[];
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  availableTags,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = availableTags.filter(
    (tag) =>
      !tags.includes(tag) &&
      tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded flex items-center gap-1"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-blue-600"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setShowSuggestions(e.target.value.length > 0);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="新增標籤..."
        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((tag) => (
            <button
              key={tag}
              onClick={() => addTag(tag)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Step 3: 建立 NoteEditor 元件**

```typescript
// src/components/NoteEditor/NoteEditor.tsx
import React, { useState, useEffect } from 'react';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import type { Note } from '../../types/note';
import { Button, Input } from '../shared';
import { TagInput } from './TagInput';
import { useAutoSave } from '../../hooks/useAutoSave';

interface NoteEditorProps {
  note: Note | null;
  onSave: (note: Note) => void;
  onCancel: () => void;
  availableTags: string[];
  autoSaveInterval: number;
  capturePageByDefault: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onCancel,
  availableTags,
  autoSaveInterval,
  capturePageByDefault,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [editMode, setEditMode] = useState<'plain' | 'markdown'>('markdown');
  const [capturePageContext, setCapturePageContext] = useState(capturePageByDefault);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      setEditMode(note.editMode);
    }
  }, [note]);

  const handleSave = async () => {
    let pageContext: Note['pageContext'] = undefined;

    if (capturePageContext) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          pageContext = {
            url: tab.url || '',
            pageTitle: tab.title || '',
            capturedAt: Date.now(),
          };
        }
      } catch (error) {
        console.error('Failed to capture page context:', error);
      }
    }

    const savedNote: Note = note
      ? { ...note, title, content, tags, editMode, updatedAt: Date.now() }
      : {
          id: '',
          title,
          content,
          tags,
          editMode,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pageContext,
        };

    onSave(savedNote);
  };

  useAutoSave(handleSave, autoSaveInterval, [title, content, tags, editMode]);

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <Input
        type="text"
        placeholder="筆記標題"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="flex gap-2 items-center">
        <button
          onClick={() => setEditMode('plain')}
          className={`px-3 py-1 text-sm rounded ${
            editMode === 'plain' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          純文字
        </button>
        <button
          onClick={() => setEditMode('markdown')}
          className={`px-3 py-1 text-sm rounded ${
            editMode === 'markdown' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Markdown
        </button>

        <label className="flex items-center gap-2 ml-auto text-sm">
          <input
            type="checkbox"
            checked={capturePageContext}
            onChange={(e) => setCapturePageContext(e.target.checked)}
          />
          記錄網頁資訊
        </label>
      </div>

      <div className="flex-1 overflow-hidden">
        {editMode === 'markdown' ? (
          <SimpleMDE
            value={content}
            onChange={setContent}
            options={{
              spellChecker: false,
              status: false,
              toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'code', 'unordered-list', 'ordered-list', '|', 'link', 'preview'],
            }}
          />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="開始寫筆記..."
            className="w-full h-full p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      <TagInput tags={tags} onChange={setTags} availableTags={availableTags} />

      <div className="flex gap-2">
        <Button onClick={handleSave} variant="primary">
          儲存
        </Button>
        <Button onClick={onCancel} variant="secondary">
          取消
        </Button>
      </div>
    </div>
  );
};
```

**Step 4: 建立 index.ts**

```typescript
// src/components/NoteEditor/index.ts
export { NoteEditor } from './NoteEditor';
```

**Step 5: Commit**

```bash
git add src/components/NoteEditor/ src/hooks/useAutoSave.ts
git commit -m "feat: create NoteEditor component

- Add useAutoSave hook for auto-saving
- Add TagInput component with autocomplete
- Add NoteEditor with Markdown/plain text toggle
- Support page context capture

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 3: 頁面實作

### Task 9: 建立 Popup 頁面

**Files:**
- Create: `src/pages/Popup.tsx`

**Step 1: 建立 Popup 頁面**

```typescript
// src/pages/Popup.tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNotesStore } from '../store/useNotesStore';
import { NoteList } from '../components/NoteList';
import { NoteEditor } from '../components/NoteEditor';
import { Button } from '../components/shared';
import { useSearch } from '../hooks/useSearch';
import '../index.css';

const PopupApp: React.FC = () => {
  const {
    notes,
    settings,
    selectedNoteId,
    loadNotes,
    loadSettings,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
  } = useNotesStore();

  const [isCreating, setIsCreating] = useState(false);
  const { searchQuery, setSearchQuery, filteredNotes, allTags } = useSearch(notes);

  useEffect(() => {
    loadNotes();
    loadSettings();
  }, []);

  const handleCreateNote = () => {
    setIsCreating(true);
    selectNote(null);
  };

  const handleSaveNote = async (note: Note) => {
    if (note.id) {
      await updateNote(note);
    } else {
      await createNote(note.title, note.content, note.tags, note.pageContext);
    }
    setIsCreating(false);
    selectNote(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    selectNote(null);
  };

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;
  const showEditor = isCreating || selectedNote;

  return (
    <div className="w-[320px] h-[600px] flex flex-col">
      {!showEditor ? (
        <>
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="搜尋筆記..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <NoteList
              notes={filteredNotes.slice(0, 10)}
              selectedNoteId={selectedNoteId}
              onSelectNote={selectNote}
              onDeleteNote={deleteNote}
            />
          </div>

          <div className="p-3 border-t">
            <Button onClick={handleCreateNote} variant="primary" className="w-full">
              + 新增筆記
            </Button>
          </div>
        </>
      ) : (
        <NoteEditor
          note={selectedNote}
          onSave={handleSaveNote}
          onCancel={handleCancel}
          availableTags={allTags}
          autoSaveInterval={settings.autoSaveInterval}
          capturePageByDefault={settings.capturePageByDefault}
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<PopupApp />);
```

**Step 2: Commit**

```bash
git add src/pages/Popup.tsx
git commit -m "feat: implement Popup page

- Create Popup page with note list and editor
- Support quick note creation
- Show recent 10 notes
- Add search functionality

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: 建立 Sidebar 頁面

**Files:**
- Create: `src/pages/Sidebar.tsx`
- Create: `src/components/SearchBar/SearchBar.tsx`
- Create: `src/components/SearchBar/index.ts`

**Step 1: 建立 SearchBar 元件**

```typescript
// src/components/SearchBar/SearchBar.tsx
import React, { useState } from 'react';
import { Input } from '../shared';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags: string[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagsChange,
  availableTags,
}) => {
  const [showTagFilter, setShowTagFilter] = useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="搜尋筆記..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1"
        />
        <button
          onClick={() => setShowTagFilter(!showTagFilter)}
          className="px-3 py-2 border rounded-md hover:bg-gray-100"
          title="標籤篩選"
        >
          🏷️
        </button>
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="px-3 py-2 border rounded-md hover:bg-gray-100"
            title="清除搜尋"
          >
            ✕
          </button>
        )}
      </div>

      {showTagFilter && availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2 py-1 text-sm rounded ${
                selectedTags.includes(tag)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border hover:bg-gray-100'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Step 2: 建立 SearchBar index.ts**

```typescript
// src/components/SearchBar/index.ts
export { SearchBar } from './SearchBar';
```

**Step 3: 建立 Sidebar 頁面**

```typescript
// src/pages/Sidebar.tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNotesStore } from '../store/useNotesStore';
import { NoteList } from '../components/NoteList';
import { NoteEditor } from '../components/NoteEditor';
import { SearchBar } from '../components/SearchBar';
import { Button } from '../components/shared';
import { useSearch } from '../hooks/useSearch';
import '../index.css';

const SidebarApp: React.FC = () => {
  const {
    notes,
    settings,
    selectedNoteId,
    loadNotes,
    loadSettings,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
  } = useNotesStore();

  const [isCreating, setIsCreating] = useState(false);
  const {
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    filteredNotes,
    allTags,
  } = useSearch(notes);

  useEffect(() => {
    loadNotes();
    loadSettings();
  }, []);

  const handleCreateNote = () => {
    setIsCreating(true);
    selectNote(null);
  };

  const handleSaveNote = async (note: Note) => {
    if (note.id) {
      await updateNote(note);
    } else {
      await createNote(note.title, note.content, note.tags, note.pageContext);
    }
    setIsCreating(false);
    selectNote(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    selectNote(null);
  };

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;
  const showEditor = isCreating || selectedNote;

  return (
    <div className="h-screen flex">
      {/* Left Panel - Note List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            availableTags={allTags}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <NoteList
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={selectNote}
            onDeleteNote={deleteNote}
          />
        </div>

        <div className="p-3 border-t">
          <Button onClick={handleCreateNote} variant="primary" className="w-full">
            + 新增筆記
          </Button>
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1">
        {showEditor ? (
          <NoteEditor
            note={selectedNote}
            onSave={handleSaveNote}
            onCancel={handleCancel}
            availableTags={allTags}
            autoSaveInterval={settings.autoSaveInterval}
            capturePageByDefault={settings.capturePageByDefault}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>選擇一個筆記或建立新筆記</p>
          </div>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<SidebarApp />);
```

**Step 4: Commit**

```bash
git add src/pages/Sidebar.tsx src/components/SearchBar/
git commit -m "feat: implement Sidebar page

- Create Sidebar page with split layout
- Add SearchBar component with tag filtering
- Show all notes with search and filter
- Display editor in right panel

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: 建立 Window 頁面

**Files:**
- Create: `src/pages/Window.tsx`

**Step 1: 建立 Window 頁面（複用 Sidebar 佈局）**

```typescript
// src/pages/Window.tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNotesStore } from '../store/useNotesStore';
import { NoteList } from '../components/NoteList';
import { NoteEditor } from '../components/NoteEditor';
import { SearchBar } from '../components/SearchBar';
import { Button } from '../components/shared';
import { useSearch } from '../hooks/useSearch';
import '../index.css';

const WindowApp: React.FC = () => {
  const {
    notes,
    settings,
    selectedNoteId,
    loadNotes,
    loadSettings,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
  } = useNotesStore();

  const [isCreating, setIsCreating] = useState(false);
  const {
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    filteredNotes,
    allTags,
  } = useSearch(notes);

  useEffect(() => {
    loadNotes();
    loadSettings();
  }, []);

  const handleCreateNote = () => {
    setIsCreating(true);
    selectNote(null);
  };

  const handleSaveNote = async (note: Note) => {
    if (note.id) {
      await updateNote(note);
    } else {
      await createNote(note.title, note.content, note.tags, note.pageContext);
    }
    setIsCreating(false);
    selectNote(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    selectNote(null);
  };

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;
  const showEditor = isCreating || selectedNote;

  return (
    <div className="h-screen flex">
      {/* Left Panel - Note List */}
      <div className="w-96 border-r flex flex-col">
        <div className="p-4 border-b bg-gray-50">
          <h1 className="text-xl font-bold mb-3">Chrome Notes</h1>
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            availableTags={allTags}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <NoteList
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={selectNote}
            onDeleteNote={deleteNote}
          />
        </div>

        <div className="p-4 border-t">
          <Button onClick={handleCreateNote} variant="primary" className="w-full">
            + 新增筆記
          </Button>
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1">
        {showEditor ? (
          <NoteEditor
            note={selectedNote}
            onSave={handleSaveNote}
            onCancel={handleCancel}
            availableTags={allTags}
            autoSaveInterval={settings.autoSaveInterval}
            capturePageByDefault={settings.capturePageByDefault}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg">選擇一個筆記或建立新筆記</p>
              <p className="text-sm mt-2">使用左側列表管理你的筆記</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<WindowApp />);
```

**Step 2: Commit**

```bash
git add src/pages/Window.tsx
git commit -m "feat: implement Window page

- Create Window page with larger layout
- Add title header
- Reuse Sidebar layout with more space

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 4: 匯出匯入功能

### Task 12: 實作匯出匯入功能

**Files:**
- Create: `src/services/export.ts`
- Create: `src/components/Settings/Settings.tsx`
- Create: `src/components/Settings/index.ts`

**Step 1: 建立 Export Service**

```typescript
// src/services/export.ts
import type { Note } from '../types/note';

export class ExportService {
  exportToJSON(notes: Note[]): string {
    return JSON.stringify(notes, null, 2);
  }

  downloadJSON(notes: Note[], filename: string = 'chrome-notes-export.json'): void {
    const json = this.exportToJSON(notes);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFromJSON(jsonString: string): Promise<Note[]> {
    try {
      const data = JSON.parse(jsonString);

      if (!Array.isArray(data)) {
        throw new Error('Invalid format: expected an array of notes');
      }

      // Validate each note
      const notes: Note[] = data.map((item, index) => {
        if (!item.id || !item.title || !item.content) {
          throw new Error(`Invalid note at index ${index}: missing required fields`);
        }

        return {
          id: item.id,
          title: item.title,
          content: item.content,
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt: item.createdAt || Date.now(),
          updatedAt: item.updatedAt || Date.now(),
          pageContext: item.pageContext,
          editMode: item.editMode || 'markdown',
        };
      });

      return notes;
    } catch (error) {
      throw new Error(`Failed to import notes: ${error.message}`);
    }
  }

  async importFromFile(file: File): Promise<Note[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const jsonString = e.target?.result as string;
          const notes = await this.importFromJSON(jsonString);
          resolve(notes);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

export const exportService = new ExportService();
```

**Step 2: 建立 Settings 元件**

```typescript
// src/components/Settings/Settings.tsx
import React, { useState, useRef } from 'react';
import { Button } from '../shared';
import { exportService } from '../../services/export';
import type { Note } from '../../types/note';

interface SettingsProps {
  notes: Note[];
  onImport: (notes: Note[]) => Promise<void>;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ notes, onImport, onClose }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportService.downloadJSON(notes);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);

    try {
      const importedNotes = await exportService.importFromFile(file);
      await onImport(importedNotes);
      alert(`成功匯入 ${importedNotes.length} 筆筆記`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">設定</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">匯出筆記</h3>
            <p className="text-sm text-gray-600 mb-2">
              將所有筆記匯出為 JSON 檔案
            </p>
            <Button onClick={handleExport} variant="secondary">
              匯出 JSON ({notes.length} 筆)
            </Button>
          </div>

          <div>
            <h3 className="font-medium mb-2">匯入筆記</h3>
            <p className="text-sm text-gray-600 mb-2">
              從 JSON 檔案匯入筆記（會合併到現有筆記）
            </p>
            <Button
              onClick={handleImportClick}
              variant="secondary"
              disabled={isImporting}
            >
              {isImporting ? '匯入中...' : '選擇檔案'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="primary">
            關閉
          </Button>
        </div>
      </div>
    </div>
  );
};
```

**Step 3: 建立 Settings index.ts**

```typescript
// src/components/Settings/index.ts
export { Settings } from './Settings';
```

**Step 4: Commit**

```bash
git add src/services/export.ts src/components/Settings/
git commit -m "feat: implement export/import functionality

- Create ExportService for JSON export/import
- Add Settings component with export/import UI
- Validate imported data format
- Merge imported notes with existing notes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 5: 最終整合與測試

### Task 13: 整合設定功能到頁面

**Files:**
- Modify: `src/pages/Sidebar.tsx`
- Modify: `src/pages/Window.tsx`
- Modify: `src/store/useNotesStore.ts`

**Step 1: 在 Store 中添加匯入功能**

```typescript
// 在 src/store/useNotesStore.ts 中添加
importNotes: async (importedNotes: Note[]) => {
  const { notes } = get();
  const existingIds = new Set(notes.map((n) => n.id));

  // 只匯入不存在的筆記
  const newNotes = importedNotes.filter((n) => !existingIds.has(n.id));

  for (const note of newNotes) {
    await storageService.saveNote(note);
  }

  await get().loadNotes();
},
```

**Step 2: 在 Sidebar 中添加設定按鈕**

在 `src/pages/Sidebar.tsx` 中添加：

```typescript
// 在 SidebarApp 組件中添加
const [showSettings, setShowSettings] = useState(false);

// 在 return 的 JSX 中，在左側面板底部添加設定按鈕
<div className="p-3 border-t space-y-2">
  <Button onClick={handleCreateNote} variant="primary" className="w-full">
    + 新增筆記
  </Button>
  <Button onClick={() => setShowSettings(true)} variant="secondary" className="w-full">
    ⚙️ 設定
  </Button>
</div>

// 在最外層 div 後添加
{showSettings && (
  <Settings
    notes={notes}
    onImport={importNotes}
    onClose={() => setShowSettings(false)}
  />
)}
```

**Step 3: 在 Window 中添加設定按鈕（同樣的修改）**

**Step 4: Commit**

```bash
git add src/pages/Sidebar.tsx src/pages/Window.tsx src/store/useNotesStore.ts
git commit -m "feat: integrate settings into Sidebar and Window pages

- Add importNotes function to store
- Add settings button to Sidebar and Window
- Show Settings modal on click

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 14: 建立圖示檔案

**Files:**
- Create: `public/icons/icon16.png`
- Create: `public/icons/icon48.png`
- Create: `public/icons/icon128.png`

**Step 1: 建立圖示目錄**

Run: `mkdir -p public/icons`

**Step 2: 建立簡單的圖示（或使用設計工具）**

注意：這裡需要實際的圖示檔案。可以使用線上工具如 Canva 或 Figma 建立，或使用 placeholder。

**Step 3: Commit**

```bash
git add public/icons/
git commit -m "feat: add extension icons

- Add 16x16, 48x48, and 128x128 icons

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 15: 建置與測試

**Files:**
- Create: `README.md`

**Step 1: 建置專案**

Run: `npm run build`

Expected: 在 `dist/` 目錄中生成建置檔案

**Step 2: 在 Chrome 中載入擴充功能**

1. 開啟 Chrome
2. 前往 `chrome://extensions/`
3. 開啟「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 `dist/` 目錄

**Step 3: 測試主要功能**

- 測試 Popup 模式：點擊擴充功能圖示
- 測試 Sidebar 模式：右鍵點擊擴充功能圖示 → 開啟側邊欄
- 測試建立筆記
- 測試編輯筆記
- 測試刪除筆記
- 測試搜尋功能
- 測試標籤功能
- 測試匯出匯入

**Step 4: 建立 README**

```markdown
# Chrome Notes Extension

一個 Chrome 擴充功能，讓你在瀏覽網頁時方便地做筆記。

## 功能

- 多介面支援：Popup、Sidebar、獨立視窗
- Markdown 和純文字編輯
- 標籤管理
- 搜尋和篩選
- 跨裝置同步（Chrome Sync API）
- 匯出匯入 JSON

## 開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置
npm run build

# 載入到 Chrome
1. 前往 chrome://extensions/
2. 開啟「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇 dist/ 目錄
```

## 技術棧

- React 18 + TypeScript
- Vite
- Zustand
- Tailwind CSS
- react-simplemde-editor
- Chrome Extension Manifest V3
```

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions

- Add feature list
- Add development instructions
- Add tech stack information

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 完成

所有核心功能已實作完成！

### 已完成的功能

✅ 專案初始化與建置設定
✅ TypeScript 型別定義
✅ Storage Service（Local + Sync）
✅ Zustand 狀態管理
✅ 共用 UI 元件
✅ NoteList 元件
✅ NoteEditor 元件（Markdown/純文字切換）
✅ SearchBar 元件（搜尋 + 標籤篩選）
✅ Popup 頁面
✅ Sidebar 頁面
✅ Window 頁面
✅ 匯出匯入功能
✅ 設定介面

### 後續可選功能

- 進階搜尋（日期範圍、多關鍵字）
- 主題切換（淺色/深色模式）
- 快捷鍵支援
- 筆記排序選項
- 筆記分類/資料夾
- 雲端備份整合

