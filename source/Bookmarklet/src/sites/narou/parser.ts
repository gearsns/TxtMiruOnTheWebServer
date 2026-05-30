import { SubtitleItem } from "@/core";

/**
 * 目次ページからサブタイトル一覧を抽出する
 */
export const extractSubtitles = (doc: Document): SubtitleItem[] => {
    let chapter = "";
    const elements = doc.querySelectorAll(".p-eplist > .p-eplist__sublist, .p-eplist > .p-eplist__chapter-title");

    return Array.from(elements).map((el): SubtitleItem | null => {
        if (!el.classList.contains("p-eplist__sublist")) {
            chapter = el.textContent?.trim() ?? "";
            return null;
        }

        const elSubtitle = el.querySelector<HTMLAnchorElement>(".p-eplist__subtitle");
        const elCreateDate = el.querySelector(".p-eplist__update");
        const href = elSubtitle?.href.replace(/https:\/\/.*\.syosetu\.com/, "") ?? "";

        return {
            chapter,
            subtitle: elSubtitle?.textContent?.trim() ?? "",
            href,
            index: href.split("/")[2] ?? "",
            subdate: elCreateDate?.querySelector("span")?.title.replace(" 改稿", "") ?? "",
            subupdate: elCreateDate?.textContent?.trim().split("\n")[0] ?? ""
        };
    }).filter((item): item is SubtitleItem => item !== null);
};

/**
 * 情報トップページから定義データをキー・バリューのオブジェクトとして抽出する
 */
export const extractInfoParams = (infoDoc: Document): Record<string, string> => {
    return Array.from(infoDoc.querySelectorAll(".p-infotop-data__title"))
        .reduce<Record<string, string>>((acc, el) => {
            const val = el.nextElementSibling?.textContent?.trim() ?? "";
            return el.textContent ? { ...acc, [el.textContent.trim()]: val } : acc;
        }, {});
};

/**
 * ページャーから最終ページ数を取得する
 */
export const extractLastPage = (doc: Document): number => {
    const lastPageEl = doc.querySelector<HTMLAnchorElement>(".c-pager__item--last");
    if (!lastPageEl) return 1;
    return parseInt(lastPageEl.href.match(/\?p=(\d+)/)?.[1] || "1", 10);
};

/**
 * 短編小説用のダミーサブタイトルを生成する
 */
export const createShortStorySubtitle = (ncode: string, params: Record<string, string>): SubtitleItem => ({
    subtitle: "",
    href: `/${ncode}`,
    subdate: params["掲載日"] ?? "",
    subupdate: params["最終更新日"] || params["最新掲載日"] || params["最終掲載日"] || "",
    index: "1",
    chapter: ""
});


export const extractEpisode = (doc: Document): string => {
    let ellist: string = "";
    for (const el of doc.getElementsByClassName("p-novel__body")) {
        el.querySelectorAll(".p-novel__subtitle-chapter, .p-novel__subtitle-episode").forEach(r => r.remove());
        ellist += el.outerHTML;
    }
    return ellist;
}
