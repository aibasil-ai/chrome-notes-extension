// Window 獨立視窗頁面（左右分割佈局，空間更大）
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNotesStore } from '../store/useNotesStore';
import { NoteList } from '../components/NoteList';
import { NoteEditor } from '../components/NoteEditor';
import { SearchBar } from '../components/SearchBar';
import { Settings } from '../components/Settings';
import { Button, SyncStorageStatus } from '../components/shared';
import { useSearch } from '../hooks/useSearch';
import type { Note } from '../types/note';
import '../index.css';

const WindowApp: React.FC = () => {
    const {
        notes,
        settings,
        selectedNoteId,
        syncUsage,
        loadNotes,
        loadSettings,
        loadSyncUsage,
        createNote,
        updateNote,
        deleteNote,
        selectNote,
        importNotes,
    } = useNotesStore();

    const [isCreating, setIsCreating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
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
        loadSyncUsage();
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

    // 自動儲存：只更新筆記，不關閉編輯器
    const handleAutoSaveNote = async (note: Note) => {
        if (note.id) {
            await updateNote(note);
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        selectNote(null);
    };

    const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;
    const showEditor = isCreating || selectedNote;

    return (
        <div className="h-screen flex bg-white">
            {/* 左側面板 — 筆記列表 */}
            <div className="w-96 border-r flex flex-col bg-gray-50">
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold mb-3 text-gray-800">📝 Chrome Notes</h1>
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

                <div className="p-4 border-t space-y-2">
                    <SyncStorageStatus usage={syncUsage} mode="compact" />
                    <Button onClick={handleCreateNote} variant="primary" className="w-full">
                        + 新增筆記
                    </Button>
                    <Button onClick={() => setShowSettings(true)} variant="secondary" className="w-full">
                        ⚙️ 設定
                    </Button>
                </div>
            </div>

            {/* 右側面板 — 編輯器 */}
            <div className="flex-1">
                {showEditor ? (
                    <NoteEditor
                        note={selectedNote}
                        onSave={handleSaveNote}
                        onAutoSave={handleAutoSaveNote}
                        onCancel={handleCancel}
                        availableTags={allTags}
                        autoSaveInterval={settings.autoSaveInterval}
                        capturePageByDefault={settings.capturePageByDefault}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <p className="text-4xl mb-4">📝</p>
                            <p className="text-lg">選擇一個筆記或建立新筆記</p>
                            <p className="text-sm mt-2">使用左側列表管理你的筆記</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 設定 Modal */}
            {showSettings && (
                <Settings
                    notes={notes}
                    onImport={importNotes}
                    onClose={() => setShowSettings(false)}
                    syncUsage={syncUsage}
                    onRefreshUsage={loadSyncUsage}
                />
            )}
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<WindowApp />);
