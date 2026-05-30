import { NovelItem } from "./types";
import { escapeHtml } from "./ui";

/**
 * 小説一覧をテーブルHTMLとしてレンダリングする
 */
export function renderNovelTable(
    shadow: ShadowRoot,
    novelList: NovelItem[],
    topUrl: string
): void {
    const elNovelListData = shadow.getElementById("NovelListData");
    if (!elNovelListData) return;

    elNovelListData.innerHTML = novelList.map(item => ``
        + `<tr class="NovelListItem" ncode="${item.ncode}" total="${item.total}" page="${item.page}" title="${escapeHtml(item.title)}">`
        + `<td>`
        + `<input type="checkbox" class="NovelListNcode" value="${item.ncode}" id="NovelListItem_${item.id}">`
        + `<label for="NovelListItem_${item.id}">${item.ncode}<span class="NovelListUpdateInfo"></span></label>`
        + `<td>${item.page}<br>${item.total}`
        + `<td><a href='${item.url}'>${escapeHtml(item.title)}</a>`
        + `<td>${escapeHtml(item.author)}`
        + `</tr>`).join("");
}

/**
 * 特定の小説行の更新情報をUIに反映する
 */
export function updateItemUI(
    itemEl: HTMLElement,
    totalCount: number
): void {
    const elUpdate = itemEl.querySelector<HTMLElement>(".NovelListUpdateInfo");
    if (elUpdate) {
        elUpdate.textContent = String(totalCount);
        elUpdate.style.display = "inline-block";
    }
    const cb = itemEl.querySelector<HTMLInputElement>(".NovelListNcode");
    if (cb) cb.checked = true;
}
