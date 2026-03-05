// Popup 彈出視窗頁面（320×600px 快速筆記模式）
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNotesStore } from '../store/useNotesStore';
import { NoteList } from '../components/NoteList';
import { NoteEditor } from '../components/NoteEditor';
import { Button } from '../components/shared';
import { SearchBar } from '../components/SearchBar/SearchBar';
import { useSearch } from '../hooks/useSearch';
import type { Note } from '../types/note';
import { SYNC_CAPACITY_BLOCK_MESSAGE } from '../services/storage';
import '../index.css';

const PopupApp: React.FC = () => {
    const {
        notes,
        settings,
        selectedNoteId,
        unsyncedNoteIds,
        loadNotes,
        loadSettings,
        createNote,
        updateNote,
        deleteNote,
        selectNote,
    } = useNotesStore();

    const [isCreating, setIsCreating] = useState(false);
    const hasShownAutoSaveErrorRef = useRef(false);
    const { searchQuery, setSearchQuery, selectedTags, setSelectedTags, filteredNotes, allTags } = useSearch(notes);

    useEffect(() => {
        loadNotes();
        loadSettings();
    }, []);

    const handleCreateNote = () => {
        setIsCreating(true);
        selectNote(null);
    };

    const handleSaveNote = async (note: Note) => {
        try {
            if (note.id) {
                await updateNote(note);
            } else {
                await createNote(note.title, note.content, note.tags, note.editMode, note.pageContext);
            }
            setIsCreating(false);
            selectNote(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : SYNC_CAPACITY_BLOCK_MESSAGE;
            alert(message);
        }
    };

    // 自動儲存：只更新筆記，不關閉編輯器
    const handleAutoSaveNote = async (note: Note) => {
        if (note.id) {
            try {
                await updateNote(note);
                hasShownAutoSaveErrorRef.current = false;
            } catch (error) {
                console.warn('自動儲存失敗:', error);
                const message = error instanceof Error ? error.message : SYNC_CAPACITY_BLOCK_MESSAGE;
                if (!hasShownAutoSaveErrorRef.current) {
                    alert(message);
                    hasShownAutoSaveErrorRef.current = true;
                }
            }
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        selectNote(null);
    };

    const handleOpenSidebar = () => {
        // 使用 windowId 開啟側邊欄，promise chain 確保順序正確
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
            .then(() => chrome.windows.getCurrent())
            .then((win) => {
                if (win.id !== undefined) {
                    return chrome.sidePanel.open({ windowId: win.id });
                }
            })
            .then(() => window.close())
            .catch((err) => {
                console.error('開啟側邊欄失敗:', err);
                window.close();
            });
    };

    const handleOpenWindow = () => {
        chrome.runtime.sendMessage({ action: 'openWindow' });
        window.close();
    };

    const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;
    const showEditor = isCreating || selectedNote;

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {!showEditor ? (
                <>
                    {/* 頂部標題 + 搜尋列 */}
                    <div className="p-3 border-b bg-gray-50">
                        <h1 className="text-lg font-bold text-gray-800 mb-2">📝 輕筆記</h1>
                        <SearchBar
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            selectedTags={selectedTags}
                            onTagsChange={setSelectedTags}
                            availableTags={allTags}
                            actions={
                                <>
                                    <button
                                        onClick={handleOpenSidebar}
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-md transition-colors flex-shrink-0"
                                        title="開啟側邊欄模式"
                                    >
                                        📖
                                    </button>
                                    <button
                                        onClick={handleOpenWindow}
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-md transition-colors flex-shrink-0"
                                        title="開啟獨立視窗模式"
                                    >
                                        🪟
                                    </button>
                                </>
                            }
                        />
                    </div>

                    {/* 筆記列表 */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <NoteList
                            notes={filteredNotes}
                            selectedNoteId={selectedNoteId}
                            unsyncedNoteIds={unsyncedNoteIds}
                            showNoteSizeIcon={settings.showNoteSizeIcon}
                            onSelectNote={selectNote}
                            onDeleteNote={deleteNote}
                        />
                    </div>

                    {/* 底部按鈕區 */}
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
                    onAutoSave={handleAutoSaveNote}
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
