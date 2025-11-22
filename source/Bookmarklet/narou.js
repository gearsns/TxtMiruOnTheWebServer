(async function () {
    let NovelListUrl = window.defNovelListUrl || "";
    if (!(["https://ncode.syosetu.com","https://novel18.syosetu.com"].includes(document.location.origin))) {
        return;
    }
    const urlCodeMatch = url => url.match(/.*syosetu.*\/(?<ncode>n[A-Za-z0-9]+)/);
    const getNcodeUrl = ncode => `${NovelListTopUrl}/${ncode}/`
    const tocJsonUrl = ncode => `${getNcodeUrl(ncode)}toc.json`;
    // subtitles取得
    const getSubtitles = doc => {
        const subtitles = [];
        let chapter = "";
        for (const elSublist of doc.querySelectorAll(".p-eplist > .p-eplist__sublist, .p-eplist > .p-eplist__chapter-title")) {
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
        };
        return subtitles;
    }
    // TOC作成
    const createToc = async (ncode, maxPage) => {
        const infoDocument = await fetchDocument(`${NovelListTopUrl}/novelview/infotop/ncode/${ncode}`);
        const param = {};
        let key = "";
        for(const el of infoDocument.querySelectorAll(".p-infotop-data__title, .p-infotop-data__value")){
            if (el.classList.contains("p-infotop-data__title")){
                key = el.textContent.trim();
            } else {
                param[key] = el.textContent.trim();
            }
        }
        const url = `${NovelListTopUrl}/${ncode}`;
        const topDocument = await fetchDocument(url);
        const toc = {
            title: topDocument.querySelector(".p-novel__title")?.textContent ?? "",
            author: param["作者名"],
            toc_url: url,
            story: param["あらすじ"],
            subtitles: getSubtitles(topDocument)
        };
        // 最終ページ取得
        const lastPageElement = topDocument.querySelector(".c-pager__item--last");
        if (lastPageElement) {
            const lastPage = lastPageElement ? parseInt(lastPageElement.href.match(/\?p=(\d+)/)?.[1] || "1", 10) : 1;
            // 2ページ目以降を取得
            for (let page = 2; page <= lastPage; page++) {
                if (toc.subtitles.length > maxPage) {
                    break;
                }
                await sleep(100);
                const pageDocument = await fetchDocument(`${url}/?p=${page}`);
                toc.subtitles.push(...getSubtitles(pageDocument));
            }
        } else if (toc.subtitles.length === 0) {
            const novelBodyElement = topDocument.querySelector(".p-novel__body")
            if (novelBodyElement){
                toc.subtitles.push({
                    subtitle: "",
                    href: `/${ncode}`,
                    subdate: param["掲載日"],
                    subupdate: param["最終更新日"]||param["最新掲載日"]||param["最終掲載日"],
                    index: 1,
                });
            }
        }
        // 取得したページの `subtitles` を統合
        toc.subtitles = toc.subtitles.slice(0, maxPage);
        return toc;
    }
    const addBody = (doc, ellist) => {
        for(const el of doc.getElementsByClassName("p-novel__body")) {
            const removeItems = el.querySelectorAll(".p-novel__subtitle-chapter, .p-novel__subtitle-episode");
            for(const removeItem of removeItems) {
                removeItem.parentNode.removeChild(removeItem);
            }
            ellist.push(el.outerHTML);
        }
    }
    const NovelListTopUrl = document.location.origin;
    if (!document.getElementById("NovelListHost")) {
        const elNovelListHost = document.createElement("div");
        elNovelListHost.id = "NovelListHost";
        document.body.appendChild(elNovelListHost);
    }
    const elNovelListHost = document.getElementById("NovelListHost");
    if (!elNovelListHost.shadowRoot){
        elNovelListHost.attachShadow({mode: "open"});
    }
    const shadow = elNovelListHost.shadowRoot;
    shadow.innerHTML = `
        <div id="container" class="NovelListBox">
            <div id="Main" class="NovelListInnerBox">
                <div class="MainInnerBox">
                    <button id="Close">×</button><h1>Narou to GoogleDrive</h1>
                    <hr>
                    <div id="NovelListUrlArea">
                        to GoogleDrive APIのアドレス：<input id="NovelListUrl">
                        <button id="SaveUrl">設定</button>
                        <span id="FavoriteInfo"></span>
                        <hr>
                    </div>
                    <button id="AddNovel">Add</button><button id="RemoveNovel">Remove</button><button id="ListRefresh">Refresh</button><button id="ListCheck">更新を確認</button><button id="UploadNovel">Upload</button>
                    <br>
                    <p id="NovelError"></p>
                    <table>
                        <thead><tr><th><input type="checkbox" id="ListBulkSelect"><label for="ListBulkSelect">更新</label><th>ページ<th>総ページ数<th>タイトル<th>著者</thead>
                        <tbody id="NovelListData"></tbody>
                    </table>
                </div>
            </div>
            <div id="ModalAdd" class="NovelListBox">
                <div class="NovelListInnerBox">
                    <p><span id="InputCodeName">ncode</span>を入力してください:</p>
                    <p id="InputError"></p>
                    <input type="text" id="NovelListNcodeInput" />
                    <button id="SubmitNcode">登録</button><button id="CancelNcode">キャンセル</button>
                </div>
            </div>
            <div id="ModalRemove" class="NovelListBox">
                <div class="NovelListInnerBox">
                    <p>選択したお気に入りを削除しますか？</p>
                    <button id="SubmitRemove">はい</button><button id="CancelRemove">いいえ</button>
                </div>
            </div>
            <div id="Loading" class="NovelListBox">
                <div class="NovelListInnerBox">
                    <p id="LoadingText">処理中</p>
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    `;
    const style = document.createElement('style');
    style.textContent = `
        * {
            writing-mode: horizontal-tb;
        }
        table, input {
            margin: 2px; border: 1px solid gray; padding: 2px;
        }
        h1 {
            color: #777;
            display: inline;
            margin: 0;
            font-size: 1.5em;
        }
        a, a:visited {
            color: #03c;
            text-decoration: none;
        }
        .NovelListBox {
            z-index: 11000; position: fixed;
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
        #LoadingText {
            white-space: pre-wrap;
        }
        button {
            background-color: #5cb85c; border-color: #4cae4c;
            color: white;
            border: 1px solid transparent;
            border-radius: 0.2rem;
            padding: 0.2rem 0.5rem;
            line-height: 1rem;
            margin: 1px;
        }
        #AddNovel {
            background-color: #337ab7; border-color: #2e6da4;
        }
        #RemoveNovel {
            background-color: #d9534f; border-color: #d43f3a;
        }
        #ListRefresh {
            background-color: #5bc0de; border-color: #46b8da;
        }
        #UploadNovel {
            background-color: #dea55bff; border-color: #da9a46ff;
        }
        #Main {
            width: 100%; height: 100%;
        }
        .MainInnerBox {
            position: relative;
            width: calc(100% - 40px); height: calc(100% - 40px);
            padding: 20px;
            overflow: auto;
        }
        #Close {
            z-index: 12000;
            position: fixed;
            top: 25px; left: 25px;
            width: 20px; height: 20px;
            background-color: white;
            border-color: white;
            color: white;
        }
        #Close::before, #Close::after {
            content: "";
            position: absolute;
            top: 50%; left: 50%;
            width: 3px; height: 15px;
            background: #888;
        }
        #Close::before {
            transform: translate(-50%,-50%) rotate(45deg);
        }
        #Close::after {
            transform: translate(-50%,-50%) rotate(-45deg);
        }
        #ModalAdd, #ModalRemove, #Loading {
            display: none;
        }
        #NovelError, #InputError {
            color: red;
        }
        .NovelListBox table {
            border-collapse: collapse;
            color: #333;
            border-color: #dad3c8;
        }
        .NovelListBox thead {
            background-color: #605555;
            color: #ddd0cc;
        }
        .NovelListBox tbody tr {
            background-color: #f8f3e5;
        }
        .NovelListBox tbody tr:nth-child(even) {
            background-color: #fffcef;
        }
        .NovelListBox th {
            white-space: nowrap;
        }
        .NovelListBox th,.NovelListBox td {
            border: solid 1px; 
            border-color: #dad3c8;
            padding: 10px;
        }
        .NovelListBox td:first-child {
            white-space: nowrap;
            min-width: 6rem;
        }
        .NovelListBox td:nth-child(n+4) {
            min-width: 30rem;
        }
        .NovelListBox td:nth-child(n+5) {
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
        #Loading .NovelListInnerBox {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        .spinner {
            width: 30px; height: 30px;
            border-radius: 50%;
            border: 3px solid #FFF; border-left-color: #1082ce; 
            animation: spinner-rotation 1s linear infinite;
        }
        @keyframes spinner-rotation {
            0% { transform: rotate(0); }
            100% { transform: rotate(360deg); }
        }
        `;
    shadow.appendChild(style);
    document.documentElement.style.overflowY = "hidden";
    const elNovelListBaseStyle = document.getElementById("NovelListBaseStyle");
    if (elNovelListBaseStyle){
        elNovelListBaseStyle.parentNode.removeChild(elNovelListBaseStyle);
    }
    const baseStyle = document.createElement('style');
    baseStyle.id = "NovelListBaseStyle";
    baseStyle.textContent = `
    ins, #geniee_overlay_outer, .c-ad {
        display: none !important;
    }
    `;
    document.head.appendChild(baseStyle);
    let fetchAbortController = null;
    const isAbortError = error => error === "cancel" || error?.name === "AbortError";
    const NovelList = [];
    const rebuildNovelList = async _ => {
        NovelList.length = 0;
        clearErrorMessage();
        if (NovelListUrl.length === 0) {
            setErrorMessage(`お気に入り管理URLを指定してください`);
            return false;
        }
        const url = `${NovelListUrl}?func=get_favorites`;
        const result = await fetch(url, {signal: fetchAbortController?.signal})
            .then(response => response.json())
            .catch(error => {
                setErrorMessage(isAbortError(error)
                    ? `小説一覧の取得を中断しました。`
                    : `小説一覧の取得に失敗しました。${error}`);
            });
        if (!result) {
            return false;
        }
        for(const item of result.values){
            if (!item.url.startsWith(NovelListTopUrl) || item.source !== "GoogleDrive") {
                continue;
            }
            const match = urlCodeMatch(item.url);
            if (match){
                NovelList.push({
                    id: item.id,
                    ncode: match.groups.ncode,
                    total: item.max_page,
                    page: item.cur_page,
                    title: item.name,
                    author: item.author
                });
            }
        }
        return true;
    }
    const refreshNovelList = async _ => {
        showLoading("小説の一覧を取得しています...");
        if (await rebuildNovelList()) {
            const elNovelListData = shadow.getElementById("NovelListData");
            elNovelListData.innerHTML = NovelList.map(item =>
                `<tr class="NovelListItem" ncode="${item.ncode}" total="${item.total}" page="${item.page}" title="${escapeHtml(item.title)}">
                 <td><input type="checkbox" class="NovelListNcode" value="${item.ncode}" id="NovelListItem_${item.id}"><label for="NovelListItem_${item.id}">${item.ncode}<span class="NovelListUpdateInfo"></span><label><td>${item.page}<td>${item.total}<td><a href='${getNcodeUrl(item.ncode)}/'>${escapeHtml(item.title)}</a><td>${escapeHtml(item.author)}`
            ).join("");
        }
        hideLoading();
    }
    //
    const sleep = time => new Promise((resolve) => setTimeout(resolve, time));
    const elLoading = shadow.getElementById("Loading");
    const elLoadingText = shadow.getElementById("LoadingText");
    const ESCAPECHAR = { '&': '&amp;', "'": '&#x27;', '`': '&#x60;', '"': '&quot;', '<': '&lt;', '>': '&gt;', }
    const escapeHtml = text => text.replace(/[&'`"<>]/g, match => ESCAPECHAR[match]);
    const clearErrorMessage = _ => setErrorMessage("");
    const setErrorMessage = text => shadow.getElementById("NovelError").textContent = text;
    const showLoading = text => {
        if (elLoading.style.display !== "block"){
            elLoading.style.display = "block";
            fetchAbortController = new AbortController();
        }
        elLoadingText.textContent = text;
    }
    const hideLoading = _ => {
        cancelLoading();
        elLoading.style.display = "none";
        fetchAbortController = null;
    }
    const cancelLoading = _ => {
        try {
            fetchAbortController?.abort("cancel")
        } catch{}
    }
    shadow.querySelector("#Loading .spinner").addEventListener("dblclick", cancelLoading);
    const dOMParser = new DOMParser();
    const fetchDocument = async (url) => {
        clearErrorMessage();
        const options = { credentials: 'include', signal: fetchAbortController?.signal };
        const html = await fetch(url, options)
            .then(res => res.text())
            .catch(error => {throw error});
        return dOMParser.parseFromString(html, "text/html");
    }
    const cancellableSleep = async i => {
        for(; i>=0; --i){
            if (fetchAbortController?.signal.aborted){
                throw "cancel";
            }
            showLoading(`待機中 ${i}`);
            await sleep(1000);
        }
    }
    const getUpdateData = async ncode => {
        const foundItem = NovelList.find(e => e.ncode === ncode);
        const total = foundItem ? foundItem.total : 0;
        const maxPage = total + 5;
        const toc = foundItem ? foundItem.newToc : await createToc(ncode, maxPage);
        await cancellableSleep(3);
        const addPage = toc.subtitles.length - total;
        if (addPage <= 0) {
            return [];
        }
        const updateData = [{
            url: tocJsonUrl(ncode),
            content: JSON.stringify(toc),
            id: foundItem ? foundItem.id : null
        }];
        // 追加ページを取得
        for (let i = 0; i < addPage; i++) {
            const item = toc.subtitles[i + total];
            const url = `${NovelListTopUrl}${item.href}`;
            const html = await fetch(url, { credentials: 'include', signal:fetchAbortController?.signal }).then(res => res.text());
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const ellist = [`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${escapeHtml(doc.title)}</title></head>`];
            if (item.chapter) {
                ellist.push(`<h3 class="p-novel__subtitle-chapter">${escapeHtml(item.chapter)}</h3>`);
            }
            ellist.push(`<h3 class="p-novel__subtitle-episode">${escapeHtml(item.subtitle)}</h3>`);
            addBody(doc, ellist);
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
            signal: fetchAbortController?.signal
        })
        .then(response => response.text())
        .catch(error => { throw error });
    }
    // 閉じる処理
    const elModalMainContainer = shadow.getElementById("container");
    shadow.getElementById("Close").addEventListener("click", e => {
        elModalMainContainer.style.display = "none";
        document.documentElement.style.overflowY = "auto";
    });
    // 小説の更新を確認
    shadow.getElementById("ListCheck").addEventListener("click", async _ => {
        clearErrorMessage();
        const cond = shadow.querySelector(".NovelListNcode:checked")
        ? ".NovelListItem:has(.NovelListNcode:checked)"
        : ".NovelListItem";
        try {
            for(const item of shadow.querySelectorAll(cond)){
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
                    await cancellableSleep(3);
                }
            };
        } catch(error){
            setErrorMessage(isAbortError(error)
                ? `小説の更新を中断しました。`
                : `小説の更新を確認でエラーが発生しました(${error})`);
        }
        hideLoading();
    });
    // Upload
    shadow.getElementById("UploadNovel").addEventListener("click", async _ => {
        clearErrorMessage();
        if (NovelListUrl.length === 0) {
            setErrorMessage(`お気に入り管理URLを指定してください`);
            return;
        }
        let updateFlag = false;
        showLoading("小説をUploadします...");
        for (const item of shadow.querySelectorAll(".NovelListItem:has(.NovelListNcode:checked)")) {
            const ncode = item.getAttribute("ncode");
            const title = item.getAttribute("title") ? `${ncode} : ${item.getAttribute("title")}` : `小説[${ncode}]`;
            try {
                showLoading(`${title}\n情報を取得しています...`);
                const updateData = await getUpdateData(ncode);
                if (updateData.length > 0) {
                    showLoading(`${title}\n${updateData.length - 1}件分をUploadしています...`);
                    await update(updateData);
                    updateFlag = true;
                }
            } catch (error) {
                hideLoading();
                setErrorMessage(isAbortError(error)
                    ? "処理を中断しました。"
                    : `${title}\n登録中にエラーが発生しました。${error.message}`);
                return;
            }
        }
        if (updateFlag) {
            refreshNovelList();
        } else {
            hideLoading();
            setErrorMessage(`Uploadする小説を選択してください。`);
        }
    });
    // Add
    const elModalAdd = shadow.getElementById("ModalAdd");
    const elInput = shadow.getElementById("NovelListNcodeInput");
    const elError = shadow.getElementById("InputError");
    shadow.getElementById("AddNovel").addEventListener("click", _ => {
        elModalAdd.style.display = "block";
        elError.textContent = "";
        const match = urlCodeMatch(document.location.href);
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
    shadow.getElementById("CancelNcode").addEventListener("click", _ => elModalAdd.style.display = "none");
    shadow.getElementById("SubmitNcode").addEventListener("click", async _ => {
        const ncode = elInput.value.trim();
        if (!ncode || ncode.length === 0) {
            elError.textContent = `${shadow.getElementById("InputCodeName").textContent}が入力されていません。`;
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
                await refreshNovelList();
            }
        } catch(error) {
            setErrorMessage(isAbortError(error)
                ? "処理を中断しました。"
                : `${ncode}の登録中にエラーが発生しました。`);
        } finally {
            hideLoading();
            elModalAdd.style.display = "none";
        }
    });
    // Delete
    const elModelRemove = shadow.getElementById("ModalRemove");
    shadow.getElementById("RemoveNovel").addEventListener("click", _ => {
        clearErrorMessage();
        if (NovelListUrl.length === 0) {
            setErrorMessage(`お気に入り管理URLを指定してください`);
        } else if (shadow.querySelector(".NovelListNcode:checked")) {
            elModelRemove.style.display = "block";
        } else {
            setErrorMessage(`削除する小説を選択してください。`);
        }
    });
    elModelRemove.addEventListener("click", e => {
        if (e.target === elModelRemove) {
            elModelRemove.style.display = "none";
        }
    });
    shadow.getElementById("CancelRemove").addEventListener("click", _ => elModelRemove.style.display = "none");
    shadow.getElementById("SubmitRemove").addEventListener("click", async _ => {
        clearErrorMessage();
        if (NovelListUrl.length === 0) {
            setErrorMessage(`お気に入り管理URLを指定してください`);
            return;
        }
        showLoading(`お気に入りから削除しています...`);
        elModelRemove.style.display = "none";
        for (const item of shadow.querySelectorAll(".NovelListNcode:checked")) {
            const ncode = item.value;
            const foundItem = NovelList.find(e => e.ncode === ncode);
            try {
                showLoading(`${foundItem.title}\nお気に入りから削除しています...`);
                const url = `${NovelListUrl}?func=delete_favorite&id=${foundItem.id}`;
                const result = await fetch(url, {signal:fetchAbortController?.signal})
                    .then(response => response.json())
                    .catch(error => {throw error});
                if (result.result !== true) {
                    throw "Error!";
                }
            } catch(error) {
                hideLoading();
                setErrorMessage(isAbortError(error)
                    ? "処理を中断しました。"
                    : `${ncode}の削除中にエラーが発生しました。`);
                return;
            }
        }
        hideLoading();
        setErrorMessage(`お気に入りを削除しました。`);
        refreshNovelList();
    });
    // Refresh
    shadow.getElementById("ListRefresh").addEventListener("click", refreshNovelList);
    const elListBulkSelect = shadow.getElementById("ListBulkSelect");
    elListBulkSelect.addEventListener("click", _ => {
        shadow.querySelectorAll(".NovelListItem").forEach(item => {
            const elUpdate = item.querySelector(".NovelListNcode");
            elUpdate.checked = elListBulkSelect.checked;
        });
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
            request.onsuccess = async eGet => {
                const item = eGet.target.result;
                if (item){
                    NovelListUrl = item.value;
                    shadow.getElementById("NovelListUrl").value = NovelListUrl;
                    if (NovelListUrl && NovelListUrl.length > 0) {
                        refreshNovelList();
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
        shadow.getElementById("NovelListUrl").value = NovelListUrl;
        shadow.getElementById("NovelListUrlArea").style.display = "none";
        refreshNovelList();
    }
    shadow.getElementById("SaveUrl").addEventListener("click", _ => {
        NovelListUrl = shadow.getElementById("NovelListUrl").value;
        const request = indexedDB.open(dbName);
        request.onsuccess = e => {
            const db = e.target.result;
            const trans = db.transaction(storeName, "readwrite");
            const store = trans.objectStore(storeName);
            store.put({ id: "url", value: NovelListUrl });
            refreshNovelList();
        }
    });
})();