// 筆記列表元件
import React from 'react';
import type { Note } from '../../types/note';
import { NoteItem } from './NoteItem';

interface NoteListProps {
    notes: Note[];
    selectedNoteId: string | null;
    onSelectNote: (noteId: string) => void;
    onDeleteNote: (noteId: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({
    notes,
    selectedNoteId,
    onSelectNote,
    onDeleteNote,
}) => {
    if (notes.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p className="text-2xl mb-2">📝</p>
                <p>還沒有筆記</p>
                <p className="text-sm mt-2">點擊「新增筆記」開始記錄</p>
            </div>
        );
    }

    return (
        <div className="overflow-y-auto">
            {notes.map((note) => (
                <NoteItem
                    key={note.id}
                    note={note}
                    isSelected={note.id === selectedNoteId}
                    onClick={() => onSelectNote(note.id)}
                    onDelete={() => onDeleteNote(note.id)}
                />
            ))}
        </div>
    );
};
