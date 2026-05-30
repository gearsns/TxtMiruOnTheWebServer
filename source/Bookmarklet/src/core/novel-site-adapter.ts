import { TocData } from "./types";

export interface NovelSiteAdapter {
    createToc: (
        ncode: string,
        limit: number,
        topUrl: string,
        signal?: AbortSignal
    ) => Promise<TocData>;

    extractEpisode: (
        doc: Document
    ) => string;

    urlCodeMatch: (
        url: string
    ) => RegExpMatchArray | null;

    getNcodeUrl: (
        ncode: string
    ) => string;
}
