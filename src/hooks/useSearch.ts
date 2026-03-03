// 搜尋 + 標籤篩選 Hook
import { useState, useMemo } from 'react';
import type { Note } from '../types/note';

export function useSearch(notes: Note[]) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // 取得所有不重複的標籤
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        notes.forEach((note) => {
            note.tags.forEach((tag) => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [notes]);

    // 依搜尋關鍵字和標籤篩選筆記
    const filteredNotes = useMemo(() => {
        return notes.filter((note) => {
            // 關鍵字搜尋（標題 + 內容）
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !query ||
                note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query);

            // 標籤篩選（選取的標籤全部都要符合）
            const matchesTags =
                selectedTags.length === 0 ||
                selectedTags.every((tag) => note.tags.includes(tag));

            return matchesSearch && matchesTags;
        });
    }, [notes, searchQuery, selectedTags]);

    return {
        searchQuery,
        setSearchQuery,
        selectedTags,
        setSelectedTags,
        filteredNotes,
        allTags,
    };
}
