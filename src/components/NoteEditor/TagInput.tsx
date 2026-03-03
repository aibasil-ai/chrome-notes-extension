// 標籤輸入元件（含自動完成）
import React, { useState, KeyboardEvent } from 'react';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    availableTags: string[];
}

export const TagInput: React.FC<TagInputProps> = ({
    tags,
    onChange,
    availableTags,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const suggestions = availableTags.filter(
        (tag) =>
            !tags.includes(tag) &&
            tag.toLowerCase().includes(inputValue.toLowerCase())
    );

    const addTag = (tag: string) => {
        if (tag && !tags.includes(tag)) {
            onChange([...tags, tag]);
            setInputValue('');
            setShowSuggestions(false);
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            addTag(inputValue.trim());
        }
    };

    return (
        <div className="relative">
            <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded flex items-center gap-1"
                    >
                        {tag}
                        <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-blue-600"
                        >
                            ✕
                        </button>
                    </span>
                ))}
            </div>

            <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="新增標籤..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {suggestions.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => addTag(tag)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100"
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
