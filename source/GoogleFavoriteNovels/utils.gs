const escapeHtml = text => text.replace(/[<>&"'`]/g, function(match) {
  return {
    '<'  : '&lt;',
    '>'  : '&gt;',
    '&'  : '&amp;',
    '"'  : '&quot;',
    '\'' : '&#x27;',
    '`'  : '&#x60;'
  }[match];
});

let _currentFolder = null;
const getCurrentFolder = () => {
  if (!_currentFolder){
    //const scriptFileId = ScriptApp.getScriptId();
    //const scriptFile = DriveApp.getFileById(scriptFileId);
    //const currentScriptFolders = scriptFile.getParents();
    //if (currentScriptFolders.hasNext())
    //{
    //  return currentScriptFolders.next();
    //}
    const spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    const spreadSheetId = spreadSheet.getId();
    const spreadSheetFile = DriveApp.getFileById(spreadSheetId);
    const currentSpreadSheetFolders = spreadSheetFile.getParents();
    _currentFolder = currentSpreadSheetFolders.hasNext()
    ? currentSpreadSheetFolders.next()
    : null;
  }
  return _currentFolder;
}

const getSheet = sheetName => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet)
  {
    sheet = spreadsheet.insertSheet().setName(sheetName);
  }
  return sheet;
}

const isSameFolderList = (folderList1, folderList2) => {
  if (folderList1.length !== folderList2.length){
    return false;
  }
  for(let i = folderList1.length - 1; i >=0; i--){
    if (folderList1[i] !== folderList2[i]){
      return false;
    }
  }
  return true;
}

const createDeepFolder = (folder, deepPathList) => {
  for (const folderName of deepPathList) {
    const folders = folder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      const suggestFolder = getSuggestFolder(folder, folderName);
      if (suggestFolder){
        folder = suggestFolder;
      } else {
        folder = folder.createFolder(folderName);
      }
    }
  }
  return folder;
}

const getSuggestFile = (folder, fileName) => {
  const files = folder.searchFiles(`title contains '${fileName.replace(/'/g, "\\'")}'`); //folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName().replace(/ .*/, "");
    if (name == fileName)
    {
      return file;
    }
  }
  return null;
}

const getSuggestFolder = (folder, folderName) => {
  const folders = folder.searchFolders(`title contains '${folderName.replace(/'/g, "\\'")}'`);//folder.getFolders();
  while (folders.hasNext()) {
    const folder = folders.next();
    const name = folder.getName().replace(/ .*/, "");
    if (name == folderName)
    {
      return folder;
    }
  }
  return null;
}

const getDeepFolder = (folder, deepPathList) => {
  for (const folderName of deepPathList) {
    const folders = folder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = getSuggestFolder(folder, folderName);
      if (!folder)
      {
        return null;
      }
    }
  }
  return folder;
}

const countFilesInFolder = folder => {
  const files = folder.getFiles();
  let count = 0;
  while (files.hasNext()) {
   count++;
   file = files.next();
  }
  return count;
}

const getTextFromDeepFolder = (deepPathList, fileName) => {
  const folder = getDeepFolder(getCurrentFolder(), deepPathList);
  if (folder)
  {
    const files = folder.getFilesByName(fileName);
    if (files.hasNext())
    {
      return files.next().getBlob().getDataAsString("utf-8");
    }
    const file = getSuggestFile(folder, fileName);
    if (file)
    {
      return file.getBlob().getDataAsString("utf-8");
    }
  }
  return null;
}

const writeFile = (folder, fileName, content, contentType = MimeType.HTML, charset = "UTF-8") => {
  const blob = Utilities.newBlob('', contentType, fileName).setDataFromString(content, charset);
  const files = folder.getFilesByName(fileName);
  if (files.hasNext())
  {
    const id = files.next().getId();
    //files.next().setContent(content);
    Drive.Files.update({}, id, blob);
    return id
  }
  return folder.createFile(blob).getId();
}

const findRow = (sheet, value, column) => {
  const range = sheet.getRange(2, column, sheet.getMaxRows(), 1);
  const cell = range.createTextFinder(value).findNext();
  return cell ? cell.getRow() : -1;
}

const getHeaders = sheet => sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

const getColumnIndexFromHeaders = (headers, columnName) => headers.indexOf(columnName) + 1;

const getColumnIndexFromSheet = (sheet, columnName) => getColumnIndexFromHeaders(getHeaders(sheet), columnName);

const createJson = data => ContentService
  .createTextOutput(JSON.stringify(data))
  .setMimeType(ContentService.MimeType.JSON);

// スネークケースからキャメルケースに変換（文字列）.
const toCamelCase = str => {
  return str.split('_').map(function(word,index){
    if (index === 0) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join('');
}

// キャメルケースからスネークケースに変換（文字列）.
const toUnderscoreCase = str => {
  return str.split(/(?=[A-Z])/).join('_').toLowerCase()
}
