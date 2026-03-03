// 設定 Modal 元件（匯出 / 匯入 / 同步儲存狀態）
import React, { useState, useRef, useEffect } from 'react';
import { Button, SyncStorageStatus } from '../shared';
import { exportService } from '../../services/export';
import type { Note, SyncStorageUsage } from '../../types/note';

interface SettingsProps {
    notes: Note[];
    onImport: (notes: Note[]) => Promise<void>;
    onClose: () => void;
    syncUsage: SyncStorageUsage | null;
    onRefreshUsage: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ notes, onImport, onClose, syncUsage, onRefreshUsage }) => {
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 開啟時讀取最新使用量
    useEffect(() => {
        onRefreshUsage();
    }, []);

    const handleExport = () => {
        exportService.downloadJSON(notes);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setError(null);

        try {
            const importedNotes = await exportService.importFromFile(file);
            await onImport(importedNotes);
            alert(`成功匯入 ${importedNotes.length} 筆筆記`);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : '匯入失敗');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <h2 className="text-xl font-bold mb-4">⚙️ 設定</h2>

                <div className="space-y-5">
                    {/* 同步儲存空間 */}
                    <SyncStorageStatus usage={syncUsage} mode="detailed" />

                    <hr className="border-gray-200" />

                    {/* 匯出 */}
                    <div>
                        <h3 className="font-medium mb-2">📤 匯出筆記</h3>
                        <p className="text-sm text-gray-600 mb-2">
                            將所有筆記匯出為 JSON 檔案
                        </p>
                        <Button onClick={handleExport} variant="secondary">
                            匯出 JSON（{notes.length} 筆）
                        </Button>
                    </div>

                    {/* 匯入 */}
                    <div>
                        <h3 className="font-medium mb-2">📥 匯入筆記</h3>
                        <p className="text-sm text-gray-600 mb-2">
                            從 JSON 檔案匯入筆記（會合併到現有筆記）
                        </p>
                        <Button
                            onClick={handleImportClick}
                            variant="secondary"
                            disabled={isImporting}
                        >
                            {isImporting ? '匯入中...' : '選擇檔案'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* 錯誤訊息 */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <Button onClick={onClose} variant="primary">
                        關閉
                    </Button>
                </div>
            </div>
        </div>
    );
};
