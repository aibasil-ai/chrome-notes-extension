// Window 獨立視窗頁面（左右分割佈局，空間更大）
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useNotesStore } from '../store/useNotesStore';
import { NoteList } from '../components/NoteList';
import { NoteEditor } from '../components/NoteEditor';
import { SearchBar } from '../components/SearchBar';
import { Settings } from '../components/Settings';
import { Button, SyncStorageStatus } from '../components/shared';
import { useSearch } from '../hooks/useSearch';
import type { Note } from '../types/note';
import { SYNC_CAPACITY_FULL_BLOCKED, SYNC_CAPACITY_FULL_LOCAL_ONLY } from '../services/storage';
import '../index.css';

const WindowApp: React.FC = () => {
    const {
        notes,
        settings,
        selectedNoteId,
        syncUsage,
        unsyncedNoteIds,
        loadNotes,
        loadSettings,
        loadSyncUsage,
        createNote,
        updateNote,
        deleteNote,
        selectNote,
        updateSettings,
        importNotes,
    } = useNotesStore();

    const [isCreating, setIsCreating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    // 左側面板寬度（px），預設 384（即 w-96）
    const [leftPanelWidth, setLeftPanelWidth] = useState(384);
    const isDraggingRef = useRef(false);
    const hasShownAutoSaveErrorRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
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

    // 拖曳分隔線事件處理
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingRef.current = true;
        document.body.style.cursor = 'col-resize';
        // 拖曳時禁止選取文字
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width;
            let newWidth = e.clientX - containerRect.left;
            // 限制最小寬度 250px，最大不超過容器 60%
            const minWidth = 250;
            const maxWidth = containerWidth * 0.6;
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            setLeftPanelWidth(newWidth);
        };

        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleCreateNote = () => {
        setIsCreating(true);
        selectNote(null);
    };

    const handleSaveNote = async (note: Note) => {
        try {
            const fallbackSelectedNote =
                !note.id && selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null;

            if (note.id || fallbackSelectedNote) {
                const noteToUpdate = note.id
                    ? note
                    : {
                        ...fallbackSelectedNote!,
                        title: note.title,
                        content: note.content,
                        tags: note.tags,
                        editMode: note.editMode,
                        pageContext: note.pageContext,
                    };
                await updateNote(noteToUpdate);
            } else {
                await createNote(note.title, note.content, note.tags, note.editMode, note.pageContext);
            }
            setIsCreating(false);
            selectNote(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : SYNC_CAPACITY_FULL_BLOCKED;
            alert(message);
            // 若為「僅存本機」警告，代表資料其實已成功存入本機，因此仍應關閉編輯器
            if (error instanceof Error && error.message === SYNC_CAPACITY_FULL_LOCAL_ONLY) {
                setIsCreating(false);
                selectNote(null);
            }
        }
    };

    // 自動儲存：針對新舊筆記，不關閉編輯器
    const handleAutoSaveNote = async (note: Note) => {
        try {
            if (note.id) {
                await updateNote(note);
            } else {
                const newId = await createNote(
                    note.title,
                    note.content,
                    note.tags,
                    note.editMode,
                    note.pageContext,
                    { suppressLocalOnlyWarning: true }
                );
                selectNote(newId);
                setIsCreating(false);
            }
            hasShownAutoSaveErrorRef.current = false;
        } catch (error) {
            console.warn('自動儲存失敗:', error);
            const message = error instanceof Error ? error.message : SYNC_CAPACITY_FULL_BLOCKED;
            if (!hasShownAutoSaveErrorRef.current) {
                alert(message);
                hasShownAutoSaveErrorRef.current = true;
            }
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        selectNote(null);
    };

    const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;
    const showEditor = isCreating || selectedNote;

    return (
        <div ref={containerRef} className="h-screen flex bg-white">
            {/* 左側面板 — 筆記列表 */}
            <div
                className="flex flex-col bg-gray-50 shrink-0"
                style={{ width: leftPanelWidth }}
            >
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold mb-3 text-gray-800">📝 輕筆記</h1>
                    <div className="flex gap-2 items-start">
                        <div className="flex-1 min-w-0">
                            <SearchBar
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                selectedTags={selectedTags}
                                onTagsChange={setSelectedTags}
                                availableTags={allTags}
                                actions={
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-md transition-colors border border-gray-300 hover:border-blue-300 flex-shrink-0"
                                        title="設定"
                                    >
                                        ⚙️
                                    </button>
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <NoteList
                        notes={filteredNotes}
                        selectedNoteId={selectedNoteId}
                        unsyncedNoteIds={unsyncedNoteIds}
                        showNoteSizeIcon={settings.showNoteSizeIcon}
                        onSelectNote={selectNote}
                        onDeleteNote={deleteNote}
                    />
                </div>

                <div className="p-4 border-t space-y-2">
                    <SyncStorageStatus usage={syncUsage} mode="compact" />
                    <Button onClick={handleCreateNote} variant="primary" className="w-full">
                        + 新增筆記
                    </Button>
                </div>
            </div>

            {/* 可拖曳分隔線 */}
            <div
                onMouseDown={handleMouseDown}
                className="w-1.5 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors shrink-0 relative group"
                title="拖曳調整面板寬度"
            >
                {/* 中間拖曳提示點 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gray-400 group-hover:bg-white transition-colors" />
            </div>

            {/* 右側面板 — 編輯器 */}
            <div className="flex-1 min-w-0">
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
                    settings={settings}
                    onUpdateSettings={updateSettings}
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
