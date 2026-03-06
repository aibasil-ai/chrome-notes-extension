// 輕筆記擴充套件 — Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
    console.log('輕筆記擴充套件已安裝 (Lightweight Notes Extension installed)');
});

// 預設不用側邊欄取代 popup
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error(error));

// 監聽來自各頁面的訊息，切換開啟不同介面模式
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'openSidebar') {
        // 切換為側邊欄模式，並立即開啟側邊欄
        chrome.sidePanel
            .setPanelBehavior({ openPanelOnActionClick: true })
            .then(async () => {
                // 取得當前活動分頁，然後立即開啟側邊欄
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    await chrome.sidePanel.open({ tabId: tab.id });
                }
                sendResponse({ success: true });
            })
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.action === 'switchToPopup') {
        // 切換為 Popup 模式：下次點圖示開啟 popup
        chrome.sidePanel
            .setPanelBehavior({ openPanelOnActionClick: false })
            .then(() => sendResponse({ success: true }))
            .catch((error) => {
                console.error('切換 Popup 失敗:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (message.action === 'openWindow') {
        const windowUrl = chrome.runtime.getURL('window.html');
        // 搜尋所有已開啟的視窗，檢查是否已有獨立視窗
        chrome.windows.getAll({ populate: true }, (windows) => {
            const existingWindow = windows.find((win) =>
                win.tabs?.some((tab) => tab.url === windowUrl)
            );
            if (existingWindow?.id) {
                // 已有獨立視窗，聚焦它
                chrome.windows.update(existingWindow.id, { focused: true });
            } else {
                // 沒有獨立視窗，建立新的
                chrome.windows.create({
                    url: windowUrl,
                    type: 'popup',
                    width: 900,
                    height: 700,
                });
            }
        });
        sendResponse({ success: true });
    }
});
