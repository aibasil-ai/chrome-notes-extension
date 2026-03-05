// 筆記項目元件
import React, { useMemo } from 'react';
import type { Note } from '../../types/note';

interface NoteItemProps {
    note: Note;
    isSelected: boolean;
    isUnsynced: boolean;
    showNoteSizeIcon: boolean;
    onClick: () => void;
    onDelete: () => void;
}

export const NoteItem: React.FC<NoteItemProps> = ({
    note,
    isSelected,
    isUnsynced,
    showNoteSizeIcon,
    onClick,
    onDelete,
}) => {
    const warningEmojiClassName =
        'inline-flex h-[14px] w-[14px] items-center justify-center leading-none align-middle';

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 計算筆記佔用容量
    const noteSize = useMemo(() => {
        const bytes = new TextEncoder().encode(JSON.stringify(note)).length;
        if (bytes < 1024) return `${bytes}B`;
        return `${(bytes / 1024).toFixed(1)}KB`;
    }, [note]);

    return (
        <div
            className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
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
                        if (confirm(`確定要刪除「${note.title || '無標題'}」嗎？`)) {
                            onDelete();
                        }
                    }}
                    className="text-gray-400 hover:text-red-600 ml-2 transition-colors"
                    title="刪除"
                >
                    ✕
                </button>
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 flex-wrap">
                <span>{formatDate(note.updatedAt)}</span>
                {showNoteSizeIcon && (
                    <span
                        className="text-[11px] leading-none text-gray-400 cursor-help tabular-nums"
                        title={`容量：${noteSize}`}
                    >
                        {noteSize}
                    </span>
                )}
                {isUnsynced && (
                    <span
                        className={`${warningEmojiClassName} text-amber-500 cursor-help`}
                        style={{ fontSize: '14px', transform: 'translateY(-1.5px)' }}
                        title="此筆記未同步至雲端（超過儲存限制）"
                    >
                        ⚠️
                    </span>
                )}
                {note.pageContext && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            chrome.tabs.create({ url: note.pageContext!.url });
                        }}
                        className="hover:scale-125 transition-transform cursor-pointer"
                        title={`開啟：${note.pageContext.pageTitle || note.pageContext.url}`}
                    >
                        🔗
                    </button>
                )}
                {note.editMode === 'markdown' && (
                    <span className="text-gray-400">MD</span>
                )}
                {note.tags.map((tag) => (
                    <span
                        key={tag}
                        className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
};
