import { UpdateDataItem } from "./types";

// テスト時に外から注入・モックしやすいように、関数の外で1度だけ生成
const dOMParser = new DOMParser();

export const fetchDocument = async (url: string, signal?: AbortSignal): Promise<Document> => {
    const res = await fetch(url, { credentials: 'include', signal });
    const text = await res.text();
    return dOMParser.parseFromString(text, "text/html");
};

export const updateNovelData = async (url: string, updateData: UpdateDataItem[], signal?: AbortSignal): Promise<string> => {
    const res = await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: "update", data: updateData }),
        signal
    });
    return res.text();
};
