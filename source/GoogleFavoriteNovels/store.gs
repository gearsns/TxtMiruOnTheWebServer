
let configItems = null;
let webSiteItems = null;
// favoriteNovels
// indexシート
// id	url	title	fileId	fileName	folderId	folderName	updateDate
// websiteシート
// name         | url                                                                                  | baseFolder
// カクヨム      | kakuyomu.jp\/works\/(?<folderName>[A-Za-z0-9]+)\/episodes\/(?<fileName>[A-Za-z0-9]+) | kakuyomu
// 小説家になろう | ncode\.syosetu\.com\/(?<folderName>n.*?)\/(?<fileName>[A-Za-z0-9]+)                  | narou
// websiteシートの設定よりフォルダやファイル名を決定する
// narou
// + nXXXXX
//   + 1
//   + 2
const isBlock = () => {
  if (!configItems)
  {
    const websiteSheet = getSheet("config");
    if (websiteSheet)
    {
      configItems = websiteSheet.getDataRange().getValues();
    }
  }
  if (configItems)
  {
    const items = configItems.slice();
    const headers = items.shift();
    const indexKey = headers.indexOf("key");
    const indexValue = headers.indexOf("value");
    for (let item of items)
    {
      if (item[indexKey] === "blockScriptId" && item[indexValue] === ScriptApp.getScriptId())
      {
        return true;
      }
    }
  }
  return false;
}

const createWebSiteFolders = _ => {
  if (!webSiteItems)
  {
    const websiteSheet = getSheet("website");
    if (websiteSheet)
    {
      webSiteItems = websiteSheet.getDataRange().getValues();
    }
  }
  if (webSiteItems)
  {
    const items = webSiteItems.slice();
    const headers = items.shift();
    const indexBaseFolder = headers.indexOf("baseFolder");
    const folderList = {};
    for (let item of items)
    {
      const baseFolder = item[indexBaseFolder];
      if (!folderList[baseFolder]){
        folderList[baseFolder] = true;
        createDeepFolder(getCurrentFolder(), baseFolder.split(/[\/\\]/).filter(Boolean));
      }
    }
  }
}

const getBookmarklets = _ => {
  const bookmarklets = [];
  if (!webSiteItems)
  {
    const websiteSheet = getSheet("website");
    if (websiteSheet)
    {
      webSiteItems = websiteSheet.getDataRange().getValues();
    }
  }
  if (webSiteItems)
  {
    const items = webSiteItems.slice();
    const headers = items.shift();
    const indexName = headers.indexOf("name");
    const indexBaseFolder = headers.indexOf("baseFolder");
    for (let item of items)
    {
      if (item[indexName] === "Bookmarklet")
      {
        const folder = getDeepFolder(getCurrentFolder(), item[indexBaseFolder].split(/[\/\\]/).filter(Boolean));
        const files = folder.getFiles();
        while (files.hasNext()) {
          const file = files.next();
          bookmarklets.push(file.getName());
        }
      }
    }
  }
  return bookmarklets;

}

const getTocFilesInFolder = (folder) => {
  const files = folder.getFilesByName("toc.yaml");
  if (files.hasNext())
  {
    return [files.next()];
  }
  let toc_files = [];
  const folders = folder.getFolders();
  while (folders.hasNext()) {
    const folder = folders.next();
    toc_files.push(...getTocFilesInFolder(folder));
  }
  return toc_files;
}

const getTocFiles = _ => {
  let files = [];
  if (!webSiteItems)
  {
    const websiteSheet = getSheet("website");
    if (websiteSheet)
    {
      webSiteItems = websiteSheet.getDataRange().getValues();
    }
  }
  if (webSiteItems)
  {
    const items = webSiteItems.slice();
    const headers = items.shift();
    const indexBaseFolder = headers.indexOf("baseFolder");
    const folderList = {};
    for (let item of items)
    {
      const baseFolder = item[indexBaseFolder];
      if (!folderList[baseFolder]){
        folderList[baseFolder] = true;
        const folder = getDeepFolder(getCurrentFolder(), baseFolder.split(/[\/\\]/).filter(Boolean));
        files.push(...getTocFilesInFolder(folder));
      }
    }
  }
  return files;
}

const getStoreFileLocation = url => {
  const deepPathList = [];
  let fileName = "";

  if (!webSiteItems)
  {
    const websiteSheet = getSheet("website");
    if (websiteSheet)
    {
      webSiteItems = websiteSheet.getDataRange().getValues();
    }
  }
  if (webSiteItems)
  {
    const items = webSiteItems.slice();
    const headers = items.shift();
    const indexUrl = headers.indexOf("url");
    const indexBaseFolder = headers.indexOf("baseFolder");
    const indexSubFolder = headers.indexOf("subFolder");
    for (let item of items)
    {
      const result = url.match(new RegExp(item[indexUrl]));
      if (result && result.groups)
      {
        if (result.groups.fileName)
        {
          deepPathList.push.apply(deepPathList, item[indexBaseFolder].split(/[\/\\]/).filter(Boolean));
          if (result.groups.folderName)
          {
            deepPathList.push.apply(deepPathList, result.groups.folderName.split(/[\/\\]/).filter(Boolean));
          }
          deepPathList.push.apply(deepPathList, item[indexSubFolder].split(/[\/\\]/).filter(Boolean));
          fileName = result.groups.fileName;
        }
        else 
        {
          deepPathList.push.apply(deepPathList, item[indexBaseFolder].split(/[\/\\]/).filter(Boolean));
          if (result.groups.folderName)
          {
            deepPathList.push.apply(deepPathList, result.groups.folderName.split(/[\/\\]/).filter(Boolean));
          }
          deepPathList.push.apply(deepPathList, item[indexSubFolder].split(/[\/\\]/).filter(Boolean));
          fileName = deepPathList.pop();
        }
        break;
      }
    }
    // 未定義のサイトは、YYYY/YYYYMM/YYYYMMDDHHmmSS
    if (deepPathList.length === 0)
    {
      const today = new Date().toLocaleString('sv').replace(/\D/g, '');
      deepPathList.push(today.substring(0,4), today.substring(0,6));
      fileName = today;
    }
  }
  return [deepPathList, fileName];
}

const getTocFolder = url => {
  const [deepPathList, _] = getStoreFileLocation(url);
  if (deepPathList && deepPathList.length > 0)
  {
    return getDeepFolder(getCurrentFolder(), deepPathList);
  }
  return null;
}

const getTocFile = url => {
  const folder = getTocFolder(url);
  if (folder)
  {
    const files = folder.getFilesByName("toc.yaml");
    if (files.hasNext())
    {
      return files.next();
    }
  }
  return null;
}

const putTocJson = (url, json) => {
  const folder = getTocFolder(url);
  if (folder)
  {
    return writeFile(folder, "toc.yaml", jsyaml.dump(json));
  }
  return null;
}

const putTocText = (url, content) => putTocJson(url, JSON.parse(content));

const getTocText = url => {
  const toc = getTocFile(url);
  if (toc)
  {
    return jsyaml.load(toc.getBlob().getDataAsString("utf-8"));
  }
  return null;
}

const tocYamlToHtml = text => {
  const htmlArray = [];
  const json = jsyaml.load(text);
  htmlArray.push(`<title>${escapeHtml(json.title)}</title>`);
  htmlArray.push(`<h1>${escapeHtml(json.title)}</h1>`);
  htmlArray.push(`<h2>${escapeHtml(json.author)}</h1>`);
  htmlArray.push(`<div><p>${escapeHtml(json.story).replace(/\n/g, "<br>")}</p></div>`);
  htmlArray.push(`<ul class="subtitles">`);
  let preChpter = "";
  for(const item of json.subtitles)
  {
    if (item.chapter && preChpter !== item.chapter)
    {
      htmlArray.push(`<li class="chapter">${escapeHtml(item.chapter)}</li>`);
    }
    preChpter = item.chapter;
    htmlArray.push(`<li><a href="${item.href}">${escapeHtml(item.subtitle||"")}</a><span>${escapeHtml(item.subupdate||"")}</span></li>`);
  }
  htmlArray.push(`</ul>`);
  return htmlArray.join("");
}

// 保管されているファイルの内容を取得
const getStoreText = (url, deepPathList, fileName) => {
  if (!deepPathList)
  {
    [deepPathList, fileName] = getStoreFileLocation(url);
  }
  if (deepPathList)
  {
    const text = getTextFromDeepFolder(deepPathList, fileName);
    if (text)
    {
        if (fileName === "toc.yaml")
        {
          return tocYamlToHtml(text);
        }
        return text;      
    }
  }
  const indexSheet = getSheet("index");
  const dataHeaders = getHeaders(indexSheet);
  const columnUrl = getColumnIndexFromHeaders(dataHeaders, "url");
  const rowIndex = findRow(indexSheet, url, columnUrl);
  if (rowIndex > 0)
  {
    const columnFileId = getColumnIndexFromHeaders(dataHeaders, "fileId");
    const fileId = indexSheet.getRange(rowIndex, columnFileId).getValue();
    return DriveApp.getFileById(fileId).getBlob().getDataAsString("utf-8");
  }
  return null;
}

const rebuildIndex = _ => {
  const favoriteSheet = getSheet("favorite");
  if (favoriteSheet)
  {
    const favorites = favoriteSheet.getDataRange().getValues();
    const headers = favorites.shift();
    const indexId = headers.indexOf("id");
    const indexUrl = headers.indexOf("url");
    for(const file of getTocFiles()){
      const toc = jsyaml.load(file.getBlob().getDataAsString("utf-8"));
      const favoriteItem = {
        "name": toc.title,
        "author": toc.author,
        "url": toc.toc_url,
        "maxPage": toc.subtitles.length,
        "source": "GoogleDrive"
      };
      for(const item of favorites){
        if (item[indexUrl].replace(/\/$/, "") === toc.toc_url.replace(/\/$/, "")){
          favoriteItem.id = item[indexId];
          break;
        }
      }
      if (favoriteItem.id)
      {
        updateFavorite(favoriteItem);
      }
      else 
      {
        addFavorite(favoriteItem);
      }
    }
  }
}