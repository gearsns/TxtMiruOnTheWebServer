import { NovelItem } from "./types";
import { parseNovelList, fetchRawNovelList, deleteFavoriteNovel } from "./novel-service";
import { UIStateManager } from "./ui-state";
import { renderNovelTable, updateItemUI } from "./dom-renderer";
import { updateNovelData } from "./api";
import { saveManagerUrl } from "./storage";
import { NovelSiteAdapter } from "./novel-site-adapter";
import { getUpdateData } from "./scraper";

export class NovelManager {
    public novelList: NovelItem[] = [];

    constructor(
        private shadow: ShadowRoot,
        private ui: UIStateManager,
        private siteAdapter: NovelSiteAdapter,
        public novelListUrl: string = "",
        private readonly novelListTopUrl: string = location.origin
    ) { }

    /**
     * URLの存在チェック。なければエラーをセットして false を返す
     */
    private checkUrl(): boolean {
        if (this.novelListUrl) return true;
        this.ui.setErrorMessage("お気に入り管理URLを指定してください");
        return false;
    }

    /**
     * UI制御（ローディング・エラーハンドリング）を共通化するラッパー
     */
    private async runTask(
        loadingMsg: string,
        errorMsgs: { abort: string; general: string },
        task: (ui: UIStateManager, signal?: AbortSignal) => Promise<void>
    ): Promise<boolean> {
        const { ui } = this;
        ui.setErrorMessage("");
        ui.showLoading(loadingMsg);
        try {
            await task(ui, ui.abortController?.signal);
            return true;
        } catch (error) {
            ui.setErrorMessage(
                ui.isAbortError(error) ? errorMsgs.abort : errorMsgs.general
            );
            return false;
        } finally {
            ui.hideLoading();
        }
    }

    // 1. リスト更新処理
    async refreshNovelList() {
        const { novelListUrl, novelListTopUrl, siteAdapter, shadow } = this;
        if (!this.checkUrl()) return;

        await this.runTask(
            "小説の一覧を取得しています...",
            { abort: "小説一覧の取得を中断しました。", general: "小説一覧の取得に失敗しました。" },
            async (_, signal) => {
                this.novelList = [];
                const result = await fetchRawNovelList(novelListUrl, signal);
                if (result?.values) {
                    this.novelList = parseNovelList(result.values, novelListTopUrl, siteAdapter.urlCodeMatch);
                    renderNovelTable(shadow, this.novelList, novelListTopUrl);
                }
            }
        );
    }

    // 2. 小説の更新チェック処理
    async handleListCheck() {
        const { shadow, novelList, siteAdapter, novelListTopUrl } = this;
        const hasChecked = shadow.querySelector(".NovelListNcode:checked");
        const cond = hasChecked ? ".NovelListItem:has(.NovelListNcode:checked)" : ".NovelListItem";
        const targets = Array.from(this.shadow.querySelectorAll<HTMLElement>(cond));

        await this.runTask(
            "更新をチェックしています...",
            { abort: "小説の更新を中断しました。", general: "エラーが発生しました。" },
            async (ui, signal) => {
                for (const item of targets) {
                    const ncode = item.getAttribute("ncode")!;
                    ui.showLoading(`${item.getAttribute("title")}\n情報を取得しています...`);

                    const foundItem = novelList.find(e => e.ncode === ncode);
                    if (!foundItem) continue;

                    const toc = await siteAdapter.createToc(ncode, foundItem.total + 20, novelListTopUrl, signal);
                    foundItem.newToc = toc;

                    if (toc.subtitles.length > foundItem.total) {
                        updateItemUI(item, toc.subtitles.length);
                    }
                    await ui.waitSeconds();
                }
            }
        );
    }

    // 3. 小説のアップロード処理
    async handleUploadNovel() {
        const { novelListUrl, shadow, novelList, novelListTopUrl, siteAdapter } = this;
        if (!this.checkUrl()) return;

        const targets = Array.from(shadow.querySelectorAll<HTMLElement>(".NovelListItem:has(.NovelListNcode:checked)"));
        let updateFlag = false;

        await this.runTask(
            "小説をUploadします...",
            { abort: "処理を中断しました。", general: "登録中にエラーが発生しました。" },
            async (ui, signal) => {
                for (const item of targets) {
                    const ncode = item.getAttribute("ncode")!;
                    const rawTitle = item.getAttribute("title");
                    const title = rawTitle ? `${ncode} : ${rawTitle}` : `小説[${ncode}]`;
                    ui.showLoading(`${title}\n情報を取得しています...`);

                    const updateData = await getUpdateData(ncode, novelList, novelListTopUrl, ui, siteAdapter);
                    if (updateData.length > 0) {
                        ui.showLoading(`${title}\n${updateData.length - 1}件分をUploadしています...`);
                        await updateNovelData(novelListUrl, updateData, signal);
                        updateFlag = true;
                    }
                }

                if (updateFlag) {
                    await this.refreshNovelList();
                } else {
                    ui.setErrorMessage("Uploadする小説を選択してください。");
                }
            }
        );
    }

    // 5. 小説追加の実行
    async handleSubmitNcode(ncode: string): Promise<string | null> {
        const { novelList, novelListUrl, siteAdapter, novelListTopUrl } = this;
        if (!ncode) return "入力されていません。";
        if (novelList.some(e => e.ncode === ncode)) return "既に登録されています。";

        const success =await this.runTask(
            `小説[${ncode}]を登録中...`,
            { abort: "処理を中断しました。", general: "登録中にエラーが発生しました。" },
            async (ui, signal) => {
                const updateData = await getUpdateData(ncode, novelList, novelListTopUrl, ui, siteAdapter);
                if (updateData.length > 0) {
                    await updateNovelData(novelListUrl, updateData, signal);
                    await this.refreshNovelList();
                }
            }
        );

        return success ? null : "エラーが発生しました。";
    }

    // 7. 小説削除の実行
    async handleSubmitRemove() {
        const { shadow, novelList, novelListUrl } = this;
        const checkedItems = Array.from(shadow.querySelectorAll<HTMLInputElement>(".NovelListNcode:checked"));

        await this.runTask(
            "お気に入りから削除しています...",
            { abort: "処理を中断しました。", general: "削除中にエラーが発生しました。" },
            async (ui, signal) => {
                for (const item of checkedItems) {
                    const foundItem = novelList.find(e => e.ncode === item.value);
                    if (!foundItem) continue;

                    ui.showLoading(`${foundItem.title}\nお気に入りから削除しています...`);
                    const success = await deleteFavoriteNovel(novelListUrl, foundItem.id, signal);
                    if (!success) throw new Error();
                }
                ui.setErrorMessage("お気に入りを削除しました。");
                await this.refreshNovelList();
            }
        );
    }

    // 8. 管理URLの保存
    async handleSaveUrl(url: string) {
        this.novelListUrl = url.trim();
        await saveManagerUrl(this.novelListUrl);
        await this.refreshNovelList();
    }
}
