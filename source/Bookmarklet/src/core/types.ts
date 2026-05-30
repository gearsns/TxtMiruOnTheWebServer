export interface SubtitleItem {
    subtitle?: string;
    href?: string;
    index?: string | number;
    subdate?: string;
    subupdate?: string;
    chapter?: string;
}

export interface NovelItem {
    id: string;
    ncode: string;
    total: number;
    page: number;
    title: string;
    author: string;
    newToc?: TocData;
    url: string;
}

export interface TocData {
    title: string;
    author: string;
    toc_url: string;
    story: string;
    subtitles: SubtitleItem[];
}

export interface UpdateDataItem {
    url: string;
    content: string;
    id?: string | number | null;
}

declare global {
    interface Window {
        defNovelListUrl?: string;
    }
}

