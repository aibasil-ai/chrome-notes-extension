// 自動儲存 Hook
import { useEffect, useRef } from 'react';

export function useAutoSave(
    callback: () => void,
    delay: number,
    dependencies: unknown[]
) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // 跳過首次渲染（避免載入時觸發儲存）
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback();
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);
}
