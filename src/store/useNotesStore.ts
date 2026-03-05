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
    unsyncedNoteIds: string[];

    // 資料讀取
    loadNotes: () => Promise<void>;
    loadSettings: () => Promise<void>;
    loadSyncUsage: () => Promise<void>;
    loadUnsyncedNoteIds: () => Promise<void>;

    // 筆記 CRUD
    createNote: (title: string, content: string, tags: string[], editMode: Note['editMode'], pageContext?: Note['pageContext']) => Promise<void>;
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
        defaultEditMode: 'plain',
        autoSaveInterval: 3000,
        capturePageByDefault: false,
        theme: 'auto',
    },
    isLoading: false,
    selectedNoteId: null,
    syncUsage: null,
    unsyncedNoteIds: [],

    loadNotes: async () => {
        set({ isLoading: true });
        try {
            const notes = await storageService.getAllNotes();
            set({ notes, isLoading: false });
            await get().loadUnsyncedNoteIds();
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

    loadUnsyncedNoteIds: async () => {
        try {
            const unsyncedNoteIds = await storageService.getUnsyncedNoteIds();
            set({ unsyncedNoteIds });
        } catch (error) {
            console.error('Failed to load unsynced note IDs:', error);
        }
    },

    createNote: async (title, content, tags, editMode, pageContext) => {
        const now = Date.now();
        const note: Note = {
            id: generateUUID(),
            title,
            content,
            tags,
            createdAt: now,
            updatedAt: now,
            pageContext,
            editMode,
        };

        await storageService.saveNote(note);
        set((state) => ({ notes: [note, ...state.notes] }));
        await get().loadSyncUsage();
        await get().loadUnsyncedNoteIds();
    },

    updateNote: async (note) => {
        const updatedNote = { ...note, updatedAt: Date.now() };
        await storageService.saveNote(updatedNote);
        set((state) => ({
            notes: state.notes.map((n) => (n.id === note.id ? updatedNote : n)),
        }));
        await get().loadSyncUsage();
        await get().loadUnsyncedNoteIds();
    },

    deleteNote: async (noteId) => {
        await storageService.deleteNote(noteId);
        set((state) => ({
            notes: state.notes.filter((n) => n.id !== noteId),
            selectedNoteId: state.selectedNoteId === noteId ? null : state.selectedNoteId,
        }));
        await get().loadSyncUsage();
        await get().loadUnsyncedNoteIds();
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
