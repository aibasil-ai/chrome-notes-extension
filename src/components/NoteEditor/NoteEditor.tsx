// 筆記編輯器元件
import React, { useState, useEffect, useMemo } from 'react';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import type { Note } from '../../types/note';
import { Button, Input } from '../shared';
import { TagInput } from './TagInput';
import { useAutoSave } from '../../hooks/useAutoSave';

interface NoteEditorProps {
    note: Note | null;
    onSave: (note: Note) => void;
    onAutoSave?: (note: Note) => void;
    onCancel: () => void;
    availableTags: string[];
    autoSaveInterval: number;
    capturePageByDefault: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
    note,
    onSave,
    onAutoSave,
    onCancel,
    availableTags,
    autoSaveInterval,
    capturePageByDefault,
}) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [editMode, setEditMode] = useState<'plain' | 'markdown'>('plain');
    const [capturePageContext, setCapturePageContext] = useState(capturePageByDefault);
    const [shouldRefreshPageContext, setShouldRefreshPageContext] = useState(false);

    const areTagsEqual = (a: string[], b: string[]): boolean => {
        if (a.length !== b.length) return false;
        return a.every((tag, i) => tag === b[i]);
    };

    // 既有筆記的 autosave 僅在有實際異動時才觸發，避免無變更時跳提示。
    const hasExistingNoteChanges = (): boolean => {
        if (!note) return true;

        if (title !== note.title) return true;
        if (content !== note.content) return true;
        if (!areTagsEqual(tags, note.tags)) return true;
        if (editMode !== note.editMode) return true;

        // 取消記錄網頁：等同移除原有 pageContext
        if (!capturePageContext) {
            return note.pageContext !== undefined;
        }

        // 開啟記錄網頁 + 原本沒有 pageContext：需要建立
        if (!note.pageContext) return true;

        // 使用者勾選「儲存時更新為目前分頁網址」視為需要更新
        if (shouldRefreshPageContext) return true;

        return false;
    };

    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setTags(note.tags);
            setEditMode(note.editMode);
            // 編輯既有筆記時，若原本有記錄網頁，預設維持勾選。
            setCapturePageContext(Boolean(note.pageContext));
            setShouldRefreshPageContext(false);
        } else {
            setTitle('');
            setContent('');
            setTags([]);
            setEditMode('plain');
            setCapturePageContext(capturePageByDefault);
            setShouldRefreshPageContext(false);
        }
    }, [note, capturePageByDefault]);

    // SimpleMDE 選項（使用 useMemo 避免重新建立）
    const simpleMdeOptions = useMemo(() => ({
        spellChecker: false,
        status: false,
        toolbar: [
            'bold', 'italic', 'heading', '|',
            'quote', 'code', 'unordered-list', 'ordered-list', '|',
            'link', 'preview',
        ] as const,
    }), []);

    const captureCurrentPageContext = async (): Promise<Note['pageContext']> => {
        try {
            // 過濾函式：只保留真實網頁
            const isWebPage = (t: chrome.tabs.Tab) =>
                t.url &&
                !t.url.startsWith('chrome://') &&
                !t.url.startsWith('chrome-extension://') &&
                !t.url.startsWith('about:') &&
                !t.url.startsWith('edge://');

            // 查所有視窗的 active tabs，過濾出真實網頁
            const allTabs = await chrome.tabs.query({ active: true });
            const webTabs = allTabs.filter(isWebPage);

            // 優先選最近存取的 tab（lastAccessed 越大越新）
            const tab = webTabs.sort(
                (a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0)
            )[0];
            if (!tab) return undefined;

            return {
                url: tab.url || '',
                pageTitle: tab.title || '',
                capturedAt: Date.now(),
            };
        } catch (error) {
            console.warn('Failed to capture page context:', error);
            return undefined;
        }
    };

    // 組裝筆記資料（共用邏輯）
    const buildNote = async (): Promise<Note> => {
        let pageContext: Note['pageContext'] = undefined;

        if (capturePageContext) {
            if (note?.pageContext && !shouldRefreshPageContext) {
                // 預設沿用原本已記錄的網址，避免每次儲存都覆蓋。
                pageContext = note.pageContext;
            } else {
                // 只有新筆記或使用者明確要求更新時，才重新抓目前分頁網址。
                pageContext = await captureCurrentPageContext();
                if (!pageContext && note?.pageContext) {
                    pageContext = note.pageContext;
                }
            }
        }

        return note
            ? { ...note, title, content, tags, editMode, pageContext, updatedAt: Date.now() }
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
    };

    // 手動儲存（按鈕點擊 → 儲存並關閉編輯器）
    const handleSave = async () => {
        const savedNote = await buildNote();
        onSave(savedNote);
    };

    // 自動儲存（不關閉編輯器）
    const handleAutoSave = async () => {
        if (!onAutoSave) return;
        
        // 如果是新建筆記，且標題與內容皆為空，則不自動儲存
        if (!note && !title.trim() && !content.trim()) return;
        if (note && !hasExistingNoteChanges()) return;

        const savedNote = await buildNote();
        onAutoSave(savedNote);
    };

    useAutoSave(handleAutoSave, autoSaveInterval, [
        title,
        content,
        tags,
        editMode,
        capturePageContext,
        shouldRefreshPageContext,
    ]);

    return (
        <div className="flex flex-col h-full p-4 space-y-3">
            <Input
                type="text"
                placeholder="筆記標題"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />

            {/* 編輯模式切換 + 網頁資訊擷取 */}
            <div className="flex gap-2 items-center">
                <button
                    onClick={() => setEditMode('plain')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${editMode === 'plain' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                >
                    純文字
                </button>
                <button
                    onClick={() => setEditMode('markdown')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${editMode === 'markdown' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                >
                    Markdown
                </button>

                <label className="flex items-center gap-2 ml-auto text-sm text-gray-600">
                    <input
                        type="checkbox"
                        checked={capturePageContext}
                        onChange={(e) => {
                            setCapturePageContext(e.target.checked);
                            if (!e.target.checked) {
                                setShouldRefreshPageContext(false);
                            }
                        }}
                    />
                    記錄網頁
                </label>
            </div>
            {capturePageContext && note?.pageContext && (
                <label className="flex items-center gap-2 text-xs text-gray-600 -mt-1">
                    <input
                        type="checkbox"
                        checked={shouldRefreshPageContext}
                        onChange={(e) => setShouldRefreshPageContext(e.target.checked)}
                    />
                    儲存時更新為目前分頁網址
                </label>
            )}

            {/* 編輯區域 */}
            <div className="flex-1 min-h-0 flex flex-col">
                {editMode === 'markdown' ? (
                    <SimpleMDE
                        value={content}
                        onChange={setContent}
                        options={simpleMdeOptions}
                        className="h-full flex-1 flex flex-col"
                    />
                ) : (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="開始寫筆記..."
                        className="w-full flex-1 min-h-0 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                )}
            </div>

            {/* 標籤輸入 */}
            <TagInput tags={tags} onChange={setTags} availableTags={availableTags} />

            {/* 操作按鈕 */}
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
