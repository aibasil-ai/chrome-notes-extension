// Zustand Store — 筆記狀態管理
import { create } from 'zustand';
import type { Note, AppSettings, SyncStorageUsage } from '../types/note';
import { storageService } from '../services/storage';
import { generateUUID } from '../utils/uuid';

interface NotesState {
    notes: Note[];
    settings: AppSettings;
    isLoading: boolean;
    selectedNoteId: string | null;
    syncUsage: SyncStorageUsage | null;

    // 資料讀取
    loadNotes: () => Promise<void>;
    loadSettings: () => Promise<void>;
    loadSyncUsage: () => Promise<void>;

    // 筆記 CRUD
    createNote: (title: string, content: string, tags: string[], pageContext?: Note['pageContext']) => Promise<void>;
    updateNote: (note: Note) => Promise<void>;
    deleteNote: (noteId: string) => Promise<void>;
    selectNote: (noteId: string | null) => void;

    // 設定
    updateSettings: (settings: AppSettings) => Promise<void>;

    // 匯入
    importNotes: (importedNotes: Note[]) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
    notes: [],
    settings: {
        defaultEditMode: 'markdown',
        autoSaveInterval: 3000,
        capturePageByDefault: false,
        theme: 'auto',
    },
    isLoading: false,
    selectedNoteId: null,
    syncUsage: null,

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

    loadSyncUsage: async () => {
        try {
            const syncUsage = await storageService.getSyncStorageUsage();
            set({ syncUsage });
        } catch (error) {
            console.error('Failed to load sync usage:', error);
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
        await get().loadSyncUsage();
    },

    updateNote: async (note) => {
        const updatedNote = { ...note, updatedAt: Date.now() };
        await storageService.saveNote(updatedNote);
        set((state) => ({
            notes: state.notes.map((n) => (n.id === note.id ? updatedNote : n)),
        }));
        await get().loadSyncUsage();
    },

    deleteNote: async (noteId) => {
        await storageService.deleteNote(noteId);
        set((state) => ({
            notes: state.notes.filter((n) => n.id !== noteId),
            selectedNoteId: state.selectedNoteId === noteId ? null : state.selectedNoteId,
        }));
        await get().loadSyncUsage();
    },

    selectNote: (noteId) => {
        set({ selectedNoteId: noteId });
    },

    updateSettings: async (settings) => {
        await storageService.saveSettings(settings);
        set({ settings });
    },

    importNotes: async (importedNotes) => {
        const { notes } = get();
        const existingIds = new Set(notes.map((n) => n.id));

        // 只匯入不存在的筆記
        const newNotes = importedNotes.filter((n) => !existingIds.has(n.id));

        for (const note of newNotes) {
            await storageService.saveNote(note);
        }

        await get().loadNotes();
        await get().loadSyncUsage();
    },
}));
