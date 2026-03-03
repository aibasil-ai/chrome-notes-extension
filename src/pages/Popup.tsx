// Popup 彈出視窗頁面（320×600px 快速筆記模式）
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNotesStore } from '../store/useNotesStore';
import { NoteList } from '../components/NoteList';
import { NoteEditor } from '../components/NoteEditor';
import { Button } from '../components/shared';
import { useSearch } from '../hooks/useSearch';
import type { Note } from '../types/note';
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

    const handleOpenSidebar = () => {
        chrome.runtime.sendMessage({ action: 'openSidebar' });
    };

    const handleOpenWindow = () => {
        chrome.runtime.sendMessage({ action: 'openWindow' });
        window.close();
    };

    const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;
    const showEditor = isCreating || selectedNote;

    return (
        <div className="w-[320px] h-[600px] flex flex-col bg-white">
            {!showEditor ? (
                <>
                    {/* 頂部標題 + 搜尋列 */}
                    <div className="p-3 border-b bg-gray-50">
                        <h1 className="text-lg font-bold text-gray-800 mb-2">📝 筆記</h1>
                        <input
                            type="text"
                            placeholder="搜尋筆記..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>

                    {/* 筆記列表 */}
                    <div className="flex-1 overflow-y-auto">
                        <NoteList
                            notes={filteredNotes.slice(0, 10)}
                            selectedNoteId={selectedNoteId}
                            onSelectNote={selectNote}
                            onDeleteNote={deleteNote}
                        />
                    </div>

                    {/* 底部按鈕區 */}
                    <div className="p-3 border-t space-y-2">
                        <Button onClick={handleCreateNote} variant="primary" className="w-full">
                            + 新增筆記
                        </Button>
                        <div className="flex gap-2">
                            <button
                                onClick={handleOpenSidebar}
                                className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-700"
                                title="開啟側邊欄模式"
                            >
                                📖 側邊欄
                            </button>
                            <button
                                onClick={handleOpenWindow}
                                className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-700"
                                title="開啟獨立視窗模式"
                            >
                                🪟 獨立視窗
                            </button>
                        </div>
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
