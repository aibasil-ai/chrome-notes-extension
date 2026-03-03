// Sidebar 側邊欄頁面
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

const SidebarApp: React.FC = () => {
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

    const handleAutoSaveNote = async (note: Note) => {
        if (note.id) {
            await updateNote(note);
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        selectNote(null);
    };

    // 切換為 Popup 模式：下次點擊圖示會開啟 popup
    const handleSwitchToPopup = () => {
        chrome.runtime.sendMessage({ action: 'switchToPopup' });
        alert('已切換！下次點擊擴充功能圖示將開啟 Popup 視窗');
    };

    const handleOpenWindow = () => {
        chrome.runtime.sendMessage({ action: 'openWindow' });
    };

    const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;
    const showEditor = isCreating || selectedNote;

    return (
        <div className="h-screen flex flex-col bg-white">
            {/* 頂部搜尋區 */}
            <div className="p-3 border-b bg-gray-50">
                <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                    availableTags={allTags}
                />
            </div>

            {/* 主要內容 */}
            <div className="flex-1 flex flex-col overflow-hidden">
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
                    <>
                        <div className="flex-1 overflow-y-auto">
                            <NoteList
                                notes={filteredNotes}
                                selectedNoteId={selectedNoteId}
                                onSelectNote={selectNote}
                                onDeleteNote={deleteNote}
                            />
                        </div>

                        <div className="p-3 border-t space-y-2">
                            <SyncStorageStatus usage={syncUsage} mode="compact" />
                            <Button onClick={handleCreateNote} variant="primary" className="w-full">
                                + 新增筆記
                            </Button>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSwitchToPopup}
                                    className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-700"
                                >
                                    📝 切換 Popup
                                </button>
                                <button
                                    onClick={handleOpenWindow}
                                    className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-700"
                                >
                                    🪟 獨立視窗
                                </button>
                                <button
                                    onClick={() => setShowSettings(true)}
                                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-700"
                                >
                                    ⚙️
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

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
root.render(<SidebarApp />);
