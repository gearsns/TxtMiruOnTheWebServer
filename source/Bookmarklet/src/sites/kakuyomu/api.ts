import { fetchDocument, TocData } from "@/core";
import { extractSubtitles } from "./parser";

export const createToc = async (ncode: string, maxPage: number, topUrl: string, signal?: AbortSignal): Promise<TocData> => {
    const tocUrl = `${topUrl}/works/${ncode}`;
    const infoDocument = await fetchDocument(tocUrl, signal);
    return extractSubtitles(infoDocument, tocUrl, ncode, maxPage);
};
