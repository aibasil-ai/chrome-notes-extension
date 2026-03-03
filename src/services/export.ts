// JSON 匯出匯入 Service
import type { Note } from '../types/note';

export class ExportService {
    // 匯出筆記為 JSON 字串
    exportToJSON(notes: Note[]): string {
        return JSON.stringify(notes, null, 2);
    }

    // 下載 JSON 檔案
    downloadJSON(notes: Note[], filename: string = 'chrome-notes-export.json'): void {
        const json = this.exportToJSON(notes);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 從 JSON 字串匯入筆記
    async importFromJSON(jsonString: string): Promise<Note[]> {
        try {
            const data = JSON.parse(jsonString);

            if (!Array.isArray(data)) {
                throw new Error('無效格式：預期為筆記陣列');
            }

            // 驗證每筆筆記
            const notes: Note[] = data.map((item: Record<string, unknown>, index: number) => {
                if (!item.id || !item.title) {
                    throw new Error(`第 ${index + 1} 筆筆記格式錯誤：缺少必要欄位`);
                }

                return {
                    id: item.id as string,
                    title: item.title as string,
                    content: (item.content as string) || '',
                    tags: Array.isArray(item.tags) ? item.tags : [],
                    createdAt: (item.createdAt as number) || Date.now(),
                    updatedAt: (item.updatedAt as number) || Date.now(),
                    pageContext: item.pageContext as Note['pageContext'],
                    editMode: (item.editMode as Note['editMode']) || 'markdown',
                };
            });

            return notes;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`匯入筆記失敗：${error.message}`);
            }
            throw new Error('匯入筆記失敗');
        }
    }

    // 從檔案匯入筆記
    async importFromFile(file: File): Promise<Note[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const jsonString = e.target?.result as string;
                    const notes = await this.importFromJSON(jsonString);
                    resolve(notes);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('讀取檔案失敗'));
            reader.readAsText(file);
        });
    }
}

export const exportService = new ExportService();
