// 搜尋列元件（含標籤篩選）
import React, { useState } from 'react';

interface SearchBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
    availableTags: string[];
    actions?: React.ReactNode; // 加入額外按鈕的 prop
}

export const SearchBar: React.FC<SearchBarProps> = ({
    searchQuery,
    onSearchChange,
    selectedTags,
    onTagsChange,
    availableTags,
    actions
}) => {
    const [showTagFilter, setShowTagFilter] = useState(false);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            onTagsChange(selectedTags.filter((t) => t !== tag));
        } else {
            onTagsChange([...selectedTags, tag]);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-1 items-center">
                <input
                    type="text"
                    placeholder="搜尋筆記..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={() => setShowTagFilter(!showTagFilter)}
                    className={`p-1.5 border rounded-md transition-colors ${showTagFilter || selectedTags.length > 0
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-100'
                        }`}
                    title="標籤篩選"
                >
                    🏷️
                </button>
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="p-1.5 border rounded-md hover:bg-gray-100 transition-colors"
                        title="清除搜尋"
                    >
                        ✕
                    </button>
                )}
                {/* 插入右側額外的按鈕 */}
                {actions}
            </div>

            {showTagFilter && availableTags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
                    {availableTags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-2 py-1 text-sm rounded transition-colors ${selectedTags.includes(tag)
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border hover:bg-gray-100'
                                }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
