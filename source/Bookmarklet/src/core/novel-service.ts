import { NovelItem } from "./types";

/**
 * APIから取得した生データをアプリ用のNovelItem配列に変換・フィルタリングする（純粋関数）
 */
export function parseNovelList(
    apiValues: any[],
    novelListTopUrl: string,
    urlCodeMatch: (url: string) => RegExpMatchArray | null
): NovelItem[] {
    const novelList: NovelItem[] = [];
    if (!apiValues) return novelList;

    for (const item of apiValues) {
        if (!item.url.startsWith(novelListTopUrl) || item.source !== "GoogleDrive") continue;

        const match = urlCodeMatch(item.url);
        if (match?.groups?.ncode) {
            novelList.push({
                id: item.id,
                ncode: match.groups.ncode,
                total: item.max_page,
                page: item.cur_page,
                title: item.name,
                author: item.author,
                url: item.url,
            });
        }
    }
    return novelList;
}

/**
 * 外部APIからお気に入りリストを取得する関数
 */
export async function fetchRawNovelList(
    managerUrl: string,
    signal?: AbortSignal
): Promise<any> {
    const res = await fetch(`${managerUrl}?func=get_favorites`, { signal });
    if (!res.ok) throw new Error("Fetch failed");
    return await res.json();
}

/**
 * お気に入りから削除するAPIリクエスト
 */
export async function deleteFavoriteNovel(
    managerUrl: string,
    id: string,
    signal?: AbortSignal
): Promise<boolean> {
    const res = await fetch(`${managerUrl}?func=delete_favorite&id=${id}`, { signal });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.result;
}
