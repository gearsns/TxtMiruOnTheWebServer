import { TocData } from "@/core";

/**
 * 目次ページからサブタイトル一覧を抽出する
 */
export const extractSubtitles = (doc: Document, url: string, workId: string, maxPage: number): TocData => {
    const toc: TocData = {
        title: "",
        author: "",
        toc_url: url,
        story: "",
        subtitles: []
    };
    try {
        const script_data = doc.getElementById("__NEXT_DATA__");
        if (!script_data) {
            return toc;
        }
        const json = JSON.parse(script_data.innerHTML);
        const apolloState = json.props?.pageProps?.__APOLLO_STATE__;
        if (!apolloState) return toc;
        // ROOT_QUERYから該当するworkの参照（__ref）を探す
        const rootQuery = apolloState.ROOT_QUERY;
        const workRefKey = Object.keys(rootQuery).find(k => k.includes(`work({"id":"${workId}"}`));
        if (!workRefKey) return toc;
        const topWorkId = rootQuery[workRefKey || ""]?.__ref;
        const topWork = apolloState[topWorkId || ""];
        if (!topWork) return toc;
        // 基本情報の抽出
        const authorName = apolloState[topWork.author?.__ref]?.activityName || "";
        toc.title = topWork.title || "";
        toc.author = authorName;
        toc.story = `${topWork.catchphrase || ""}\n${topWork.introduction || ""}`.trim();
        // 目次データのフラット化
        let globalIndex = 0;
        toc.subtitles = (topWork.tableOfContentsV2 || []).flatMap((tocRef: any) => {
            const subToc = apolloState[tocRef.__ref];
            const chapterTitle = apolloState[subToc?.chapter?.__ref]?.title || "";

            return (subToc?.episodeUnions || []).map((episodeRef: any) => {
                const episode = apolloState[episodeRef.__ref];
                globalIndex++;
                return {
                    subtitle: episode?.title || "",
                    href: `/works/${workId}/episodes/${episode?.id}`,
                    index: globalIndex,
                    subdate: episode?.publishedAt || "",
                    subupdate: episode?.lastPublishedAt || "",
                    chapter: chapterTitle,
                };
            });
        }).slice(0, maxPage);
        return toc;
    } catch (e) {
        console.log(e)
        return toc;
    }
};

export const extractEpisode = (doc: Document): string => {
    let ellist: string = "";
    for (const el of doc.getElementsByClassName("js-episode-body")) {
        ellist += el.outerHTML;
    }
    return ellist;
}
