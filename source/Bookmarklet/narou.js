(async function () {
    let NovelListUrl = window.defNovelListUrl || "";
    const BaseNovelListNarouTopUrl = "https://ncode.syosetu.com";
    const BaseNovelListNarou18TopUrl = "https://novel18.syosetu.com";
    let NovelListNarouTopUrl = BaseNovelListNarouTopUrl;
    if (!document.getElementById("NovelListStyle")) {
        const elNovelListStyle = document.createElement("style");
        elNovelListStyle.id = "NovelListStyle";
        elNovelListStyle.textContent = `
            #NovelList table,#NovelList button,#NovelList input {
                margin: 2px; border: 1px solid gray; padding: 2px;
            }
            .NovelListBox {
                z-index: 100; position: fixed;
                padding: 0; margin: 0;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                background: #00000030;
            }
            .NovelListInnerBox {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                padding: 20px;
                background: #fff;
                border: 1px solid #ccc;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            #NovelListLoadingText {
                white-space: pre-wrap;
            }
            #NovelList button {
                background-color: #1f883d;
                border-color: transparent;
                color: white;
                border-radius: 0.375rem;
                padding: 0.2rem; 
            }
            #NovelListFavorite {
                width: calc(100% - 100px); height: calc(100% - 100px);
            }
            .NovelListFavoriteInnerBox {
                position: relative;
                overflow: auto;
                width: 100%; height: 100%;
            }
            #NovelListInputModal, #NovelListDelteModal, #NovelListLoading {
                display: none;
            }
            #NovelListFavoriteError, #NovelListNcodeInputError {
                color: red;
            }
            .NovelListBox table {
                border-collapse:  collapse;
            }
            .NovelListBox th {
                white-space: nowrap;
            }
            .NovelListBox th,.NovelListBox td {
                border: solid 1px; 
                padding: 10px;
            }
            .NovelListBox td:nth-child(n+5):nth-child(-n+6) {
                min-width: 15rem;
            }
            .NovelListUpdateInfo {
                background-color: #1f883d;
                border-color: transparent;
                color: white;
                border-radius: 0.3rem;
                padding-left: 0.3rem; padding-right: 0.3rem;
                display: none;
            }
            #NovelListLoading .NovelListInnerBox {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }
            .spinner {
                width: 30px; height: 30px;
                border-radius: 50%;
                border: 3px solid #FFF;
                border-left-color: #1082ce; 
                animation: spinner-rotation 1s linear infinite;
            }
            @keyframes spinner-rotation {
                0% { transform: rotate(0); }
                100% { transform: rotate(360deg); }
            }
            ins, #geniee_overlay_outer, .c-ad {
                display: none !important;
            }
            `;
        document.head.appendChild(elNovelListStyle);
    }
    if (document.getElementById("NovelListOverlap")) {
        const elNovelListOverlap = document.getElementById("NovelListOverlap");
        elNovelListOverlap.remove();
    }
    if (document.location.origin === BaseNovelListNarouTopUrl
        || document.location.origin === BaseNovelListNarou18TopUrl
    ) {
        NovelListNarouTopUrl = document.location.origin;
    }
    const elNovelListOverlap = document.createElement("div");
    elNovelListOverlap.id = "NovelListOverlap";
    document.body.appendChild(elNovelListOverlap);
    elNovelListOverlap.innerHTML = `
            <div id="NovelList" class="NovelListBox">
                <div id="NovelListFavorite" class="NovelListInnerBox">
                    <div class="NovelListFavoriteInnerBox">
                        <h1>お気に入り管理</h1>
                        <hr>
                        <div id="NovelListUrlArea">
                            お気に入り管理URL：<input id="NovelListUrl">
                            <button id="NovelListSaveUrl">設定</button>
                            <span id="NovelListFavoriteInfo"></span>
                            <hr>
                        </div>
                        <button id="NovelListCheck">小説の更新を確認</button>
                        <button id="NovelListUpdate">選択した小説をGoogleDriveに保存</button>
                        <br>
                        お気に入り：
                        <button id="NovelListAddFavorite">追加</button>
                        <button id="NovelListDeleteFavorite">削除</button>
                        (<button id="NovelListRefresh">再取得</button>)
                        <p id="NovelListFavoriteError"></p>
                        <table>
                            <thead><tr><th><input type="checkbox" id="NovelListBulkSelect">更新<th>ncode<th>ページ<th>総ページ数<th>タイトル<th>著者</thead>
                            <tbody id="NovelListData"></tbody>
                        </table>
                    </div>
                </div>
                <div id="NovelListInputModal" class="NovelListBox">
                    <div class="NovelListInnerBox">
                        <p>ncodeを入力してください:</p>
                        <p id="NovelListNcodeInputError"></p>
                        <input type="text" id="NovelListNcodeInput" />
                        <button id="NovelListSubmitNcode">登録</button>
                        <button id="NovelListCancelNcode">キャンセル</button>
                    </div>
                </div>
                <div id="NovelListDelteModal" class="NovelListBox">
                    <div class="NovelListInnerBox">
                        <p>選択したお気に入りを削除しますか？</p>
                        <button id="NovelListSubmitDelete">はい</button>
                        <button id="NovelListCancelDelete">いいえ</button>
                    </div>
                </div>
                <div id="NovelListLoading" class="NovelListBox">
                    <div class="NovelListInnerBox">
                        <p id="NovelListLoadingText">処理中</p>
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        `;
    let NovelList = [];
    const GetNovelList = async _ => {
        clearErrorMessage();
        if (NovelListUrl.length === 0) {
            setErrorMessage(`お気に入り管理URLを指定してください`);
            return null;
        }
        const url = `${NovelListUrl}?func=get_favorites`;
        const result = await fetch(url, null)
            .then(response => response.json())
            .catch(error => {
                setErrorMessage(`小説一覧の取得に失敗しました。${error}`);
            });
        if (!result) {
            return null;
        }
        NovelList = result.values.map(item => {
            if (!item.url.startsWith(NovelListNarouTopUrl) || item.source !== "GoogleDrive") {
                return null;
            }
            const match = item.url.match(/.*syosetu.*\/(?<ncode>n[A-Za-z0-9]+)/);
            return match ? {
                id: item.id,
                ncode: match.groups.ncode,
                total: item.max_page,
                page: item.cur_page,
                title: item.name,
                author: item.author
            } : null;
        }).filter(item => item !== null);
        return NovelList;
    }
    const RefreshNovelList = async _ => {
        showLoading("小説の一覧を取得しています...");
        const novelList = await GetNovelList();
        if (novelList) {
            const elNovelListData = document.getElementById("NovelListData");
            elNovelListData.innerHTML = novelList.map(item =>
                `<tr class="NovelListItem" ncode="${item.ncode}" total="${item.total}" page="${item.page}" title="${escapeHtml(item.title)}">
                 <td><input type="checkbox" class="NovelListNcode" value="${item.ncode}"><span class="NovelListUpdateInfo"></span><td>${item.ncode}<td>${item.page}<td>${item.total}<td><a href='https://ncode.syosetu.com/${item.ncode}/'>${escapeHtml(item.title)}</a><td>${escapeHtml(item.author)}`
            ).join("");
        }
        hideLoading();
    }
    //
    const escapeHtml = text => text.replace(/[&'`"<>]/g, match => {
        return { '&': '&amp;', "'": '&#x27;', '`': '&#x60;', '"': '&quot;', '<': '&lt;', '>': '&gt;', }[match];
    }
    );
    const clearErrorMessage = _ => setErrorMessage("");
    const setErrorMessage = text => {
        document.getElementById("NovelListFavoriteError").textContent = text;
    }
    const showLoading = text => {
        elLoading.style.display = "block";
        elLoadingText.textContent = text;
    }
    const hideLoading = _ => {
        elLoading.style.display = "none";
    }
    // ユーティリティ関数: 指定したクラス名のテキストコンテンツを取得
    const getTextContentByClassName = (doc, name) => {
        const element = doc.getElementsByClassName(name)[0];
        return element ? element.textContent : "";
    }
    // subtitles取得
    const getSubtitles = doc => {
        const subtitles = [];
        let chapter = "";
        doc.querySelectorAll(".p-eplist > .p-eplist__sublist, .p-eplist > .p-eplist__chapter-title").forEach(elSublist => {
            if (elSublist.classList.contains("p-eplist__sublist")) {
                const item = {};
                // サブタイトルとリンク取得
                const elSubtitle = elSublist.querySelector(".p-eplist__subtitle");
                if (elSubtitle) {
                    item.subtitle = elSubtitle.textContent.trim();
                    item.href = elSubtitle.href.replace(/https:\/\/.*\.syosetu\.com/, "");
                    item.index = item.href.replace(/\/.*\/(.*)\//, "$1");
                }
                // 作成日と更新日取得
                const elCreateDate = elSublist.querySelector(".p-eplist__update");
                if (elCreateDate) {
                    const elUpdateDate = elCreateDate.querySelector("span");
                    if (elUpdateDate) {
                        item.subdate = elUpdateDate.title.replace(/ 改稿/, "");
                    }
                    item.subupdate = elCreateDate.textContent.trim().split(/\n/)[0];
                }
                item.chapter = chapter; // 現在の章情報を追加
                subtitles.push(item);
            } else {
                chapter = elSublist.textContent.trim(); // 章タイトルを更新
            }
        });
        return subtitles;
    }
    const dOMParser = new DOMParser();
    const fetchDocument = async (url) => {
        clearErrorMessage();
        const html = await fetch(url, { credentials: 'include' })
            .then(res => res.text())
            .catch(error => {
                setErrorMessage(`エラーが発生しました。${url}:${error}`);
            });
        return dOMParser.parseFromString(html, "text/html");
    }
    // TOC作成
    const createToc = async (ncode, maxPage) => {
        const url = `${NovelListNarouTopUrl}/${ncode}`;
        const topDocument = await fetchDocument(url);
        const toc = {
            title: getTextContentByClassName(topDocument, "p-novel__title"),
            author: getTextContentByClassName(topDocument, "p-novel__author").replace(/作者：\s*/, "").trim(),
            toc_url: url,
            story: getTextContentByClassName(topDocument, "p-novel__summary"),
            subtitles: getSubtitles(topDocument)
        };
        // 最終ページ取得
        const lastPageElement = topDocument.querySelector(".c-pager__item--last");
        const lastPage = lastPageElement ? parseInt(lastPageElement.href.match(/\?p=(\d+)/)?.[1] || "1", 10) : 1;
        // 2ページ目以降を取得
        for (let page = 2; page <= lastPage; page++) {
            if (toc.subtitles.length > maxPage) {
                break;
            }
            const pageDocument = await fetchDocument(`${url}/?p=${page}`);
            toc.subtitles.push(...getSubtitles(pageDocument));
        }
        // 取得したページの `subtitles` を統合
        toc.subtitles = toc.subtitles.slice(0, maxPage);
        return toc;
    }
    const getUpdateData = async (ncode) => {
        const foundItem = NovelList.find(e => e.ncode === ncode);
        const total = foundItem ? foundItem.total : 0;
        const maxPage = total + 5;
        const toc = foundItem ? foundItem.newToc : await createToc(ncode, maxPage);
        const addPage = toc.subtitles.length - total;
        if (addPage <= 0) {
            return [];
        }
        const updateData = [
            {
                url: `${NovelListNarouTopUrl}/${ncode}/toc.json`,
                content: JSON.stringify(toc),
                id: foundItem ? foundItem.id : null
            }
        ];
        // 追加ページを取得
        for (let i = 0; i < addPage; i++) {
            const item = toc.subtitles[i + total];
            const url = `${NovelListNarouTopUrl}${item.href}`;
            const html = await fetch(url, { credentials: 'include' }).then(res => res.text());
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const ellist = [`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${escapeHtml(doc.title)}</title></head>`];
            if (item.chapter) {
                ellist.push(`<h3 class="p-novel__subtitle-chapter">${escapeHtml(item.chapter)}</h3>`);
            }
            ellist.push(`<h3 class="p-novel__subtitle-episode">${escapeHtml(item.subtitle)}</h3>`);
            for(const el of doc.getElementsByClassName("p-novel__body")) {
                ellist.push(el.outerHTML);
            }
            updateData.push({ url: url, content: ellist.join("") });
        }
        return updateData;
    }
    const update = async updateData => {
        await fetch(NovelListUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                type: "update",
                data: updateData
            }),
        })
        .then(response => response.text())
        .then(text => {
            //console.log(text)
        }).catch(error => {
            console.log(error)
            alert('error!!')
        });
    }
    // Add
    const elModalAdd = document.getElementById("NovelListInputModal");
    const elInput = document.getElementById("NovelListNcodeInput");
    const elError = document.getElementById("NovelListNcodeInputError");
    document.getElementById("NovelListAddFavorite").addEventListener("click", _ => {
        elModalAdd.style.display = "block";
        elError.textContent = "";
        const match = document.location.href.match(/https:\/\/.*?\.syosetu\.com\/(?<ncode>n[0-9A-Za-z]+)/);
        if (match) {
            elInput.value = match.groups.ncode;
        }
        elInput.focus();
    });
    elModalAdd.addEventListener("click", e => {
        if (e.target === elModalAdd) {
            elModalAdd.style.display = "none";
        }
    });
    document.getElementById("NovelListCancelNcode").addEventListener("click", _ => {
        elModalAdd.style.display = "none";
    });
    const elLoading = document.getElementById("NovelListLoading");
    const elLoadingText = document.getElementById("NovelListLoadingText");
    document.getElementById("NovelListSubmitNcode").addEventListener("click", async _ => {
        const ncode = elInput.value.trim();
        if (!ncode || ncode.length === 0) {
            elError.textContent = `ncodeが入力されていません。`;
            return;
        } else if (NovelList.some(e => e.ncode === ncode)) {
            elError.textContent = `${ncode}は既に登録されています。`;
            return;
        }
        showLoading(`小説[${ncode}]を登録中...`);
        try {
            const updateData = await getUpdateData(ncode);
            if (updateData.length > 0) {
                const title = JSON.parse(updateData[0].content).title || ncode;
                showLoading(`${title}\n${updateData.length - 1}件分を保存しています...`);
                await update(updateData);
                await RefreshNovelList();
            }
        } catch {
            hideLoading();
            elError.textContent = `${ncode}の登録中にエラーが発生しました。`;
        } finally {
            hideLoading();
            elModalAdd.style.display = "none";
        }
    });
    //
    const elModalNovelList = document.getElementById("NovelList");
    elModalNovelList.addEventListener("click", e => {
        if (e.target === elModalNovelList) {
            elModalNovelList.style.display = "none";
        }
    });
    document.getElementById("NovelListCheck").addEventListener("click", _ => {
        clearErrorMessage();
        const cond = document.querySelector(".NovelListNcode:checked")
        ? ".NovelListItem:has(.NovelListNcode:checked)"
        : ".NovelListItem";
        document.querySelectorAll(cond).forEach(async item => {
            showLoading(`${item.getAttribute("title")}\n情報を取得しています...`);
            const ncode = item.getAttribute("ncode");
            const foundItem = NovelList.find(e => e.ncode === ncode);
            const elUpdate = item.querySelector(".NovelListUpdateInfo");
            elUpdate.textContent = "";
            if (foundItem) {
                const toc = await createToc(ncode, foundItem.total + 5);
                foundItem.newToc = toc;
                const addPage = toc.subtitles.length - foundItem.total;
                if (addPage > 0) {
                    elUpdate.textContent = toc.subtitles.length;
                    elUpdate.style.display = "inline-block";
                    item.querySelector(".NovelListNcode").checked = true;
                }
            }
            hideLoading();
        });
    });
    const elNovelListBulkSelect = document.getElementById("NovelListBulkSelect");
    elNovelListBulkSelect.addEventListener("click", _ => {
        document.querySelectorAll(".NovelListItem").forEach(item => {
            const elUpdate = item.querySelector(".NovelListNcode");
            elUpdate.checked = elNovelListBulkSelect.checked;
        });
    });
    document.getElementById("NovelListRefresh").addEventListener("click", RefreshNovelList);
    document.getElementById("NovelListUpdate").addEventListener("click", async _ => {
        clearErrorMessage();
        if (NovelListUrl.length === 0) {
            setErrorMessage(`お気に入り管理URLを指定してください`);
            return;
        }
        let updateFlag = false;
        showLoading("小説を保存します...");
        for (const item of document.querySelectorAll(".NovelListItem:has(.NovelListNcode:checked)")) {
            const ncode = item.getAttribute("ncode");
            const title = item.getAttribute("title") ? `${ncode} : ${item.getAttribute("title")}` : `小説[${ncode}]`;
            try {
                showLoading(`${title}\n情報を取得しています...`);
                const updateData = await getUpdateData(ncode);
                if (updateData.length > 0) {
                    showLoading(`${title}\n${updateData.length - 1}件分を保存しています...`);
                    await update(updateData);
                    updateFlag = true;
                }
            } catch (err) {
                hideLoading();
                setErrorMessage(`${title}\n登録中にエラーが発生しました。${err.message}`);
                break;
            }
        }
        if (updateFlag) {
            RefreshNovelList();
        } else {
            hideLoading();
            setErrorMessage(`登録する小説を選択してください。`);
        }
    });
    // Delete
    const elModelDelete = document.getElementById("NovelListDelteModal");
    document.getElementById("NovelListDeleteFavorite").addEventListener("click", _ => {
        clearErrorMessage();
        if (NovelListUrl.length === 0) {
            setErrorMessage(`お気に入り管理URLを指定してください`);
            return;
        } else if (document.querySelector(".NovelListNcode:checked")) {
            elModelDelete.style.display = "block";
        } else {
            setErrorMessage(`削除する小説を選択してください。`);
        }
    });
    elModelDelete.addEventListener("click", e => {
        if (e.target === elModelDelete) {
            elModelDelete.style.display = "none";
        }
    });
    document.getElementById("NovelListCancelDelete").addEventListener("click", _ => {
        elModelDelete.style.display = "none";
    });
    document.getElementById("NovelListSubmitDelete").addEventListener("click", async _ => {
        clearErrorMessage();
        if (NovelListUrl.length === 0) {
            setErrorMessage(`お気に入り管理URLを指定してください`);
            return;
        }
        showLoading(`お気に入りから削除しています...`);
        elModelDelete.style.display = "none";
        let updateFlag = false;
        for (const item of document.querySelectorAll(".NovelListNcode:checked")) {
            const ncode = item.value;
            const foundItem = NovelList.find(e => e.ncode === ncode);
            try {
                showLoading(`${foundItem.title}\nお気に入りから削除しています...`);
                const url = `${NovelListUrl}?func=delete_favorite&id=${foundItem.id}`;
                const result = await fetch(url, null)
                    .then(response => response.json())
                    .catch(error => alert(error));
                if (result.result !== true) {
                    throw "Error!";
                }
                updateFlag = true;
            } catch {
                hideLoading();
                setErrorMessage(`${ncode}の削除中にエラーが発生しました。`);
                return;
            }
        };
        hideLoading();
        if (updateFlag) {
            setErrorMessage(`お気に入りを削除しました。`);
            RefreshNovelList();
        }
    });
    const dbName = "NovelListDB";
    const storeName = "NovelListStore";
    if (NovelListUrl === "") {
        const openReq = indexedDB.open(dbName);
        openReq.onsuccess = e => {
            const db = e.target.result;
            const trans = db.transaction(storeName, "readonly");
            const store = trans.objectStore(storeName);
            const request = store.get("url");
            request.onsuccess = eGet => {
                const item = eGet.target.result;
                if (item){
                    NovelListUrl = item.value;
                    document.getElementById("NovelListUrl").value = NovelListUrl;
                    if (NovelListUrl && NovelListUrl.length > 0) {
                        RefreshNovelList();
                    }
                }
            }
            db.close();
        }
        openReq.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
        }
    } else {
        document.getElementById("NovelListUrl").value = NovelListUrl;
        document.getElementById("NovelListUrlArea").style.display = "none";
        RefreshNovelList();
    }
    document.getElementById("NovelListSaveUrl").addEventListener("click", _ => {
        NovelListUrl = document.getElementById("NovelListUrl").value;
        const request = indexedDB.open(dbName);
        request.onsuccess = e => {
            const db = e.target.result;
            const trans = db.transaction(storeName, "readwrite");
            const store = trans.objectStore(storeName);
            store.put({ id: "url", value: NovelListUrl });
            RefreshNovelList();
        }
    });
})();