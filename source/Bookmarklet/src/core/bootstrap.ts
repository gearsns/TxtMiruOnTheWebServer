import css from "./style.css?inline";
import html from "./main.html?raw";
import { initShadowDOM, loadManagerUrl, NovelManager, UIStateManager } from "./index";

// サイトごとに異なるインターフェースを定義
export interface SiteConfig {
    isSupportUrl: (origin: string) => boolean;
    applyGlobalStyle: () => void;
    siteAdapter: any; // 適切な型を入れてください
    urlCodeMatch: (href: string) => RegExpMatchArray | null;
}

export function bootstrapSite(config: SiteConfig) {
    const { isSupportUrl, applyGlobalStyle, siteAdapter, urlCodeMatch } = config;

    (async function () {
        const { origin, href } = document.location;
        if (!isSupportUrl(origin)) return;

        // --- UI・DOM初期化 ---
        const shadow = initShadowDOM(html, css);
        if (!shadow) return;
        applyGlobalStyle();

        const ui = new UIStateManager(shadow);
        const defaultUrl = (window as any).defNovelListUrl || "";
        const manager = new NovelManager(shadow, ui, siteAdapter, defaultUrl);

        // DOM要素のキャッシュ
        const elModalAdd = shadow.getElementById("ModalAdd")!;
        const elInput = shadow.getElementById("NovelListNcodeInput") as HTMLInputElement;
        const elError = shadow.getElementById("InputError")!;
        const elModelRemove = shadow.getElementById("ModalRemove")!;
        const urlInput = shadow.getElementById("NovelListUrl") as HTMLInputElement;
        const styleElModalAdd = elModalAdd.style;
        const styleElModelRemove = elModelRemove.style;

        // --- UI限定のハンドラー ---
        const openAddModal = () => {
            styleElModalAdd.display = "block";
            elError.textContent = "";
            const match = urlCodeMatch(href);
            if (match?.groups?.ncode) elInput.value = match.groups.ncode;
            elInput.focus();
        };

        const openRemoveModal = () => {
            ui.setErrorMessage("");
            if (!manager.novelListUrl) {
                ui.setErrorMessage("お気に入り管理URLを指定してください");
            } else if (shadow.querySelector(".NovelListNcode:checked")) {
                styleElModelRemove.display = "block";
            } else {
                ui.setErrorMessage("削除する小説を選択してください。");
            }
        };

        // --- マッパーによるイベントハンドラーの定義 ---
        const actionMapper: Record<string, (el: HTMLElement) => void | Promise<void>> = {
            ListRefresh: () => manager.refreshNovelList(),
            ListCheck: () => manager.handleListCheck(),
            UploadNovel: () => manager.handleUploadNovel(),
            AddNovel: () => openAddModal(),
            CancelNcode: () => { styleElModalAdd.display = "none"; },
            RemoveNovel: () => openRemoveModal(),
            CancelRemove: () => { styleElModelRemove.display = "none"; },
            SubmitRemove: async () => {
                await manager.handleSubmitRemove();
                styleElModelRemove.display = "none";
            },
            SubmitNcode: async () => {
                const addError = await manager.handleSubmitNcode(elInput.value.trim());
                if (addError) elError.textContent = addError;
                else styleElModalAdd.display = "none";
            },
            SaveUrl: () => urlInput && manager.handleSaveUrl(urlInput.value),
            Close: () => {
                const container = shadow.getElementById("container");
                if (container) container.style.display = "none";
                document.documentElement.style.overflowY = "auto";
            },
            ListBulkSelect: (el) => {
                const isChecked = (el as HTMLInputElement).checked;
                shadow.querySelectorAll<HTMLInputElement>(".NovelListNcode")
                    .forEach(cb => cb.checked = isChecked);
            }
        };

        // --- イベント委譲 ---
        shadow.addEventListener("click", async (event) => {
            const target = event.target as HTMLElement;
            if (target === elModalAdd || target === elModelRemove) {
                target.style.display = "none";
                return;
            }
            const clickableElement = target?.closest("button, input[type='button'], a, [id]");
            if (!clickableElement?.id) return;

            const action = actionMapper[clickableElement.id];
            if (action) {
                await action(clickableElement as HTMLElement);
            }
        });

        // --- 特殊イベント ---
        shadow.querySelector("#Loading .spinner")?.addEventListener("dblclick", () => ui.hideLoading());

        // --- 初期起動フロー ---
        if (!manager.novelListUrl) manager.novelListUrl = await loadManagerUrl();
        if (urlInput) urlInput.value = manager.novelListUrl;

        if (manager.novelListUrl) {
            if ((window as any).defNovelListUrl) {
                const urlArea = shadow.getElementById("NovelListUrlArea");
                if (urlArea) urlArea.style.display = "none";
            }
            await manager.refreshNovelList();
        }
    })();
}
