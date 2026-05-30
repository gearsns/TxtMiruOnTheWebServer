import { escapeHtml, NovelItem, UIStateManager, UpdateDataItem } from "@core";
import { NovelSiteAdapter } from "./novel-site-adapter";

export const getUpdateData = async (
    ncode: string,
    novelList: NovelItem[],
    topUrl: string,
    ui: UIStateManager,
    siteAdapter: NovelSiteAdapter,
): Promise<UpdateDataItem[]> => {
    const foundItem = novelList.find(e => e.ncode === ncode);
    const total = foundItem?.total ?? 0;
    const toc = foundItem?.newToc || await siteAdapter.createToc(ncode, total + 20, topUrl, ui.abortController?.signal);

    await ui.waitSeconds();

    const addPage = toc.subtitles.length - total;
    if (addPage <= 0) return [];

    const updateData: UpdateDataItem[] = [{
        url: `${topUrl}/${siteAdapter.getNcodeUrl(ncode)}/toc.json`,
        content: JSON.stringify(toc),
        id: foundItem?.id ?? null
    }];

    for (let i = 0; i < addPage; i++) {
        const item = toc.subtitles[i + total];
        if (!item.href) continue;
        const url = `${topUrl}${item.href}`;

        const htmlText = await fetch(url, { credentials: 'include', signal: ui.abortController?.signal }).then(res => res.text());
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');

        let content = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${escapeHtml(doc.title)}</title></head>`;
        if (item.chapter) content += `<h3 class="p-novel__subtitle-chapter">${escapeHtml(item.chapter)}</h3>`;
        if (item.subtitle) content += `<h3 class="p-novel__subtitle-episode">${escapeHtml(item.subtitle)}</h3>`;

        content += siteAdapter.extractEpisode(doc);
        updateData.push({ url, content });
    }
    return updateData;
};
