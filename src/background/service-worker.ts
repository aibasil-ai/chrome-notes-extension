// Chrome Notes Extension — Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
    console.log('Chrome Notes Extension installed');
});

// 預設不用側邊欄取代 popup
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error(error));

// 監聽來自各頁面的訊息，切換開啟不同介面模式
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'openSidebar') {
        // 切換為側邊欄模式：下次點圖示開啟側邊欄
        chrome.sidePanel
            .setPanelBehavior({ openPanelOnActionClick: true })
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.action === 'switchToPopup') {
        // 切換為 Popup 模式：下次點圖示開啟 popup
        chrome.sidePanel
            .setPanelBehavior({ openPanelOnActionClick: false })
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.action === 'openWindow') {
        chrome.windows.create({
            url: chrome.runtime.getURL('window.html'),
            type: 'popup',
            width: 900,
            height: 700,
        });
        sendResponse({ success: true });
    }
});
