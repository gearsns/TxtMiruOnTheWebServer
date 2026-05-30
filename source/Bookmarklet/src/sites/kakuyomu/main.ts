import { bootstrapSite } from "@core/bootstrap";
import { createToc } from "./api";
import { extractEpisode } from "./parser";
import { applyGlobalStyle } from "./ui";
import { urlCodeMatch, isSupportUrl, getNcodeUrl } from "./utils";

const siteAdapter = {
    createToc,
    extractEpisode,
    urlCodeMatch,
    getNcodeUrl
};

// 共通ロジックに自サイトのモジュールを注入して実行！
bootstrapSite({
  isSupportUrl,
  applyGlobalStyle,
  siteAdapter,
  urlCodeMatch
});
