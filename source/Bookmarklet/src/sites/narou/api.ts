import { fetchDocument, sleep, TocData } from "@/core";
import { createShortStorySubtitle, extractInfoParams, extractLastPage, extractSubtitles } from "./parser";

export const createToc = async (ncode: string, maxPage: number, topUrl: string, signal?: AbortSignal): Promise<TocData> => {
    const infoDocument = await fetchDocument(`${topUrl}/novelview/infotop/ncode/${ncode}`, signal);
    const param = extractInfoParams(infoDocument);

    const url = `${topUrl}/${ncode}`;
    const topDocument = await fetchDocument(url, signal);
    const subtitles = extractSubtitles(topDocument);

    const lastPage = extractLastPage(topDocument);

    let page = 2;
    while (page <= lastPage && subtitles.length < maxPage) {
        await sleep(100);
        const pageDocument = await fetchDocument(`${url}/?p=${page++}`, signal);
        subtitles.push(...extractSubtitles(pageDocument));
    }

    // 短編（エピソード一覧がなく、本文がある場合）の処理
    if (subtitles.length === 0 && topDocument.querySelector(".p-novel__body")) {
        subtitles.push(createShortStorySubtitle(ncode, param));
    }

    return {
        title: topDocument.querySelector(".p-novel__title")?.textContent ?? "",
        author: param["作者名"] ?? "",
        toc_url: url,
        story: param["あらすじ"] ?? "",
        subtitles: subtitles.slice(0, maxPage)
    };
};
