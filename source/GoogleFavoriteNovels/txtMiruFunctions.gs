const getFavoriteByUrl = parameter => {
  const sheet = getSheet("favorite");
  const headers = getHeaders(sheet);
  const columnIndex = getColumnIndexFromHeaders(headers, "url");
  if (columnIndex > 0)
  {
    let rowIndex = findRow(sheet, parameter.url, columnIndex);
    if (rowIndex <= 0)
    {
      if (parameter.url.match(/\/$/))
      {
        rowIndex = findRow(sheet, parameter.url.replace(/\/$/, ""), columnIndex);
      }
      else
      {
        rowIndex = findRow(sheet, parameter.url + "/", columnIndex);
      }
    }
    if (rowIndex > 0)
    {
      const range = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn());
      const row = range.getValues()[0];
      const indexCurPage = headers.indexOf("curPage");
      const indexCurUr = headers.indexOf("curUrl");
      if (parameter.page_no && parameter.cur_url && Number(parameter.page_no) > Number(row[indexCurPage])){
        row[indexCurPage] = parameter.page_no;
        row[indexCurUr] = parameter.cur_url;
        range.setValues([row]);
      }
      return createJson({
        values: [Object.fromEntries(row.map((value, index) => [toUnderscoreCase(headers[index]), value]))]
      });
    }
  }
  return createJson({ values: [] });
}

const getFavorites = _ => {
  const sheet = getSheet("favorite");
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const filteredObjects = rows
    .map((row) => Object.fromEntries(row.map((value, index) => [toUnderscoreCase(headers[index]), value])));
  return createJson({ values: filteredObjects });
}

const deleteFavorite = parameter => {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(30000)) {
    try {
      const sheet = getSheet("favorite");
      const id = parameter.id;
      const headers = getHeaders(sheet);
      const columnIndex = getColumnIndexFromHeaders(headers, "id");
      if (id && columnIndex > 0)
      {
        const rowIndex = findRow(sheet, id, columnIndex);
        if (rowIndex > 0) {
          sheet.deleteRow(rowIndex);
          return createJson({ result: true });
        }
      }
    } catch (error) {
      console.error("Error deleting favorite:", error);
    } finally {
      lock.releaseLock();
    }
  }
  return createJson({ result: false });
}

const updateFavorite = parameter => {
  const lock = LockService.getScriptLock()
  if (lock.tryLock(30000)) {
    /*{
        const sheet = getSheet("error");
        sheet.appendRow(["updateFavorite", parameter.id]);
    }*/
    const workParameter = {};
    Object.keys(parameter).forEach(key => {
      workParameter[key] = workParameter[toCamelCase(key)] = parameter[key];
    })
    try {
      const sheet = getSheet("favorite");
      const id = parameter.id;
      if (id) {
        const headers = getHeaders(sheet);
        const columnIndex = getColumnIndexFromHeaders(headers, "id");
        if (columnIndex > 0)
        {
          const rowIndex = findRow(sheet, id, columnIndex);
          if (rowIndex > 0) {
            const values = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
            headers.forEach((key, col) => {
              if (key !== "id" && key in workParameter) {
                values[col] = workParameter[key];
              }
            });
            sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
            return createJson({ result: true });
          }
        }
      }
    } catch (e) {
      console.error("Error updating favorite:", error);
    } finally {
      lock.releaseLock();
    }
  }
  return createJson({ result: false });
}

// favoriteシート
// id : 連番
// name : 名称(タイトル)
// author : 著者
// url : 作品のTopページのURL
// curPage : 現在読んでいる話の話数
// maxPage : 全話数
// curUrl : 現在読んでいる話のページのURL
// owner : 登録したプログラム
const addFavorite = parameter => {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(30000)) {
    const workParameter = {};
    Object.keys(parameter).forEach(key => {
      workParameter[key] = workParameter[toCamelCase(key)] = parameter[key];
    })
    try {
      const sheet = getSheet("favorite");
      let lastRow = sheet.getLastRow();
      if (lastRow == 0) {
        sheet.appendRow(["id", "name", "author", "url", "curPage", "maxPage", "curUrl", "source"]);
        lastRow = 1;
      }
      const headers = getHeaders(sheet);
      const columnId = getColumnIndexFromHeaders(headers, "id");
      const values = headers.map((key) => workParameter[key] || "");
      const newId = Math.max(...[0].concat(...sheet.getRange(2, columnId, lastRow).getValues().flat().filter(x => typeof x === "number"))) + 1;
      values[columnId-1] = newId;
      sheet.appendRow(values)
      return createJson({ result: true });
    } catch (e) {
      console.error(e);
    } finally {
      lock.releaseLock()
    }
  }
  return createJson({ result: false });
}

const txtMiruFunctions = {
  get_favorite_by_url: getFavoriteByUrl,
  get_favorites: getFavorites,
  delete_favorite: deleteFavorite,
  update_favorite: updateFavorite,
  add_favorite: addFavorite,
};
