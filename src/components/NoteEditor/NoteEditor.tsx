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
    const [editMode, setEditMode] = useState<'plain' | 'markdown'>('markdown');
    const [capturePageContext, setCapturePageContext] = useState(capturePageByDefault);

    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setTags(note.tags);
            setEditMode(note.editMode);
        } else {
            setTitle('');
            setContent('');
            setTags([]);
            setEditMode('markdown');
        }
    }, [note]);

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

    // 組裝筆記資料（共用邏輯）
    const buildNote = async (): Promise<Note> => {
        let pageContext: Note['pageContext'] = undefined;

        if (capturePageContext) {
            try {
                // 取得所有視窗的 active tabs，過濾掉擴充功能／瀏覽器內部頁面
                const tabs = await chrome.tabs.query({ active: true });
                const tab = tabs.find(
                    (t) =>
                        t.url &&
                        !t.url.startsWith('chrome://') &&
                        !t.url.startsWith('chrome-extension://') &&
                        !t.url.startsWith('about:') &&
                        !t.url.startsWith('edge://')
                );
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

    // 自動儲存（只對已存在的筆記生效，不關閉編輯器）
    const handleAutoSave = async () => {
        if (!note || !onAutoSave) return; // 新建筆記不自動儲存
        const savedNote = await buildNote();
        onAutoSave(savedNote);
    };

    useAutoSave(handleAutoSave, autoSaveInterval, [title, content, tags, editMode]);

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
                        onChange={(e) => setCapturePageContext(e.target.checked)}
                    />
                    記錄網頁
                </label>
            </div>

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
