import sys

file_path = "src/components/NoteEditor/NoteEditor.tsx"
with open(file_path, "r") as f:
    content = f.read()

target = """    // 自動儲存（只對已存在的筆記生效，不關閉編輯器）
    const handleAutoSave = async () => {
        if (!note || !onAutoSave) return; // 新建筆記不自動儲存
        const savedNote = await buildNote();
        onAutoSave(savedNote);
    };"""

replacement = """    // 自動儲存（不關閉編輯器）
    const handleAutoSave = async () => {
        if (!onAutoSave) return;
        
        // 如果是新建筆記，且標題與內容皆為空，則不自動儲存
        if (!note && !title.trim() && !content.trim()) return;

        const savedNote = await buildNote();
        onAutoSave(savedNote);
    };"""

new_content = content.replace(target, replacement)
with open(file_path, "w") as f:
    f.write(new_content)
