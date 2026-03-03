// 同步儲存空間使用量元件（支援 compact / detailed 兩種模式）
import React from 'react';
import type { SyncStorageUsage } from '../../types/note';

interface SyncStorageStatusProps {
    usage: SyncStorageUsage | null;
    mode?: 'compact' | 'detailed';
}

// 格式化位元組為可讀字串（KB）
function formatBytes(bytes: number): string {
    return (bytes / 1024).toFixed(1) + ' KB';
}

// 根據使用百分比決定顏色
function getColor(percentage: number): { bar: string; text: string } {
    if (percentage >= 85) return { bar: 'bg-red-500', text: 'text-red-600' };
    if (percentage >= 60) return { bar: 'bg-yellow-500', text: 'text-yellow-600' };
    return { bar: 'bg-green-500', text: 'text-green-600' };
}

export const SyncStorageStatus: React.FC<SyncStorageStatusProps> = ({
    usage,
    mode = 'compact',
}) => {
    if (!usage) {
        return (
            <span className="text-xs text-gray-400">
                同步儲存：讀取中...
            </span>
        );
    }

    const { bytesInUse, quotaBytes, percentage } = usage;
    const colors = getColor(percentage);
    const remaining = quotaBytes - bytesInUse;

    // 簡潔模式：一行文字，適合頁面底部
    if (mode === 'compact') {
        return (
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>☁️</span>
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                <span className={colors.text}>
                    {percentage}%
                </span>
            </div>
        );
    }

    // 詳細模式：進度條 + 數值，適合 Settings Modal
    return (
        <div>
            <h3 className="font-medium mb-2">☁️ 同步儲存空間</h3>

            {/* 進度條 */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                    className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {/* 數值 */}
            <div className="flex justify-between text-sm text-gray-600">
                <span>
                    已使用 <strong className={colors.text}>{formatBytes(bytesInUse)}</strong>
                    {' / '}
                    {formatBytes(quotaBytes)}
                </span>
                <span>
                    剩餘 <strong>{formatBytes(remaining)}</strong>
                </span>
            </div>

            {percentage >= 85 && (
                <p className="text-xs text-red-500 mt-2">
                    ⚠️ 同步儲存空間即將滿載，建議匯出備份或清理筆記
                </p>
            )}
        </div>
    );
};
