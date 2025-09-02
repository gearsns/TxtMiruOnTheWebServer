const doGet = e => {
  const parameter = e.parameter;
  const func = txtMiruFunctions[parameter.func];
  if (func)
  {
    return func(parameter);
  }
  const url = parameter.url;
  if (!url)
  {
    createWebSiteFolders();
    return HtmlService
      .createTemplateFromFile("index")
      .evaluate()
      .setTitle('小説お気に入り管理 GoogleDrive - bookmarklet')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      ;
  }
  const [deepPathList, fileName] = getStoreFileLocation(url);
  let storeText = getStoreText(url, deepPathList, fileName);
  deepPathList.pop();
  const tocText = getTextFromDeepFolder(deepPathList, "toc.yaml");
  if (storeText)
  {
    if (url.match(/\.js$/))
    {
      return ContentService
        .createTextOutput(storeText)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    else
    {
      if (tocText)
      {
        const toc = jsyaml.load(tocText);
        const subtitles = toc.subtitles;
        let i=0;
        for(; i<subtitles.length; ++i)
        {
          const item = subtitles[i];
          if (url.endsWith(item.href))
          {
            break;
          }
        }
        storeText += `<div id='TxtMiruCurPage' page_no=${i+1}>`;
        if (i > 0)
        {
          storeText += `<a class='txtmiru_pager' id='TxtMiruPrevPage' href='${subtitles[i-1].href}'>前へ （${escapeHtml(subtitles[i-1].subtitle.trim())}）</a>`;
        }
        if (toc.toc_url)
        {
          storeText += `<a class='txtmiru_pager' id='TxtMiruTocPage' href='${toc.toc_url}'>目次</a>`;
        }
        if (i < subtitles.length-1)
        {
          storeText += `<a class='txtmiru_pager' id='TxtMiruNextPage' href='${subtitles[i+1].href}'>次へ （${escapeHtml(subtitles[i+1].subtitle.trim())}）</a>`;
        }
        storeText += "</div>";
      }
      return ContentService
        .createTextOutput(storeText)
        .setMimeType(ContentService.MimeType.TEXT);
    }
  }
  if (tocText)
  {
      return ContentService
        .createTextOutput("対象のファイルは保管されていません")
        .setMimeType(ContentService.MimeType.TEXT);    
  }
  const charset = parameter.charset || "UTF-8";
  let cookie = parameter.cookie || "";
  if (cookie === "request"){
    const response  = UrlFetchApp.fetch(url);
    const responseHeaders = response.getAllHeaders();
    cookie = responseHeaders['Set-Cookie'].join('; ') || "";
  }
  const responseContent = UrlFetchApp.fetch(url, { headers: { cookie } }).getBlob();
  if (charset === "Auto") {
    let utf8 = responseContent.getDataAsString();
    if (/charset.*shift/i.test(utf8)) {
      utf8 = responseContent.getDataAsString("Shift-JIS");
    } else if (/charset.*euc/i.test(utf8)) {
      utf8 = responseContent.getDataAsString("euc-jp");
    }
    return ContentService
      .createTextOutput(utf8)
      .setMimeType(ContentService.MimeType.TEXT);
  } else {
    const contentText = responseContent.getDataAsString(charset);
    return ContentService
      .createTextOutput(contentText)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

const doPost = e => {
  const parameter = JSON.parse(e.postData.getDataAsString());
  const type = parameter.type;
  if (type === "update")
  {
    try {
      const folder = getCurrentFolder();
      let preDeepPathList = [];
      let dataFolder = null;
      for(const item of parameter.data)
      {
        const [deepPathList, fileName] = getStoreFileLocation(item.url);
        if (!isSameFolderList(preDeepPathList, deepPathList)){
          dataFolder = createDeepFolder(folder, deepPathList);
          preDeepPathList = deepPathList;
        }
        if (item.url.match(/\/toc\.json$/))
        {
          const json = JSON.parse(item.content);
          putTocJson(item.url, json);
          const favoriteItem = {
            "name": json.title,
            "author": json.author,
            "url": json.toc_url,
            "maxPage": json.subtitles.length,
            "source": "GoogleDrive"
          };
          if (item.id)
          {
            favoriteItem.id = item.id;
            updateFavorite(favoriteItem);
          }
          else 
          {
            addFavorite(favoriteItem);
          }
        }
        else 
        {
          // ファイルに保存
          writeFile(dataFolder, fileName, item.content);
        }
      }
    } catch(err) {
      const sheet = getSheet("error");
      sheet.appendRow([new Date(), err.message, err.stack]);
    }
    const payload = JSON.stringify({
      method: "POST",
      message: "update",
    });
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  }
  const url = parameter.url;
  if (!url)
  {
    const payload = JSON.stringify({
      method: "POST",
      message: "doPost関数が呼ばれました(パラメータなし)",
    });
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  }
  const folder = getCurrentFolder();
  let [deepPathList, fileName] = getStoreFileLocation(url);
  const dataFolder = createDeepFolder(folder, deepPathList);
  // ファイルに保存
  const fileId = writeFile(dataFolder, fileName, parameter.content, parameter.contentType, parameter.charset);
  // ファイルの索引作成
  const indexSheet = getSheet("index");
  const startRow = 2;
  let lastRow = indexSheet.getLastRow();
  let dataHeaders = ["id", "url", "title", "fileId","fileName", "folderId", "folderName", "updateDate"];
  let bAppendRow = true;
  if (lastRow == 0) {
    indexSheet.appendRow(dataHeaders);
    lastRow = 1;
  }
  else
  {
    dataHeaders = getHeaders(indexSheet);
    const columnUrl = getColumnIndexFromHeaders(data, "url");
    const rowIndex = findRow(indexSheet, url, columnUrl);
    if (rowIndex > 0)
    {
      // Update
      const columnTitle = getColumnIndexFromHeaders(dataHeaders, "title");
      const columnFileName = getColumnIndexFromHeaders(dataHeaders, "fileName");
      const columnUpdateDate = getColumnIndexFromHeaders(dataHeaders, "updateDate");
      indexSheet.getRange(rowIndex, columnTitle).setValue(parameter.title);
      indexSheet.getRange(rowIndex, columnUpdateDate).setValue(new Date());
      fileName = indexSheet.getRange(rowIndex, columnFileName).getValue();
      bAppendRow = false;
    }
  }
  if (bAppendRow)
  {
    // Append
    const columnId = getColumnIndexFromHeaders(dataHeaders, "id");
    const newId = Math.max(...[0].concat(...indexSheet.getRange(startRow, columnId, lastRow).getValues().flat().filter(x => typeof x === "number"))) + 1;
    const values = {
      id: newId,
      url: parameter.url,
      title: parameter.title,
      fileId: fileId,
      fileName: fileName,
      folderId: dataFolder.getId(),
      folderName: deepPathList.join("/"),
      updateDate: new Date()
    };
    indexSheet.appendRow(dataHeaders.map(key => values[key]));
  }
  const payload = JSON.stringify({
    method: "POST",
    message: "doPost関数が呼ばれました",
  });
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}
