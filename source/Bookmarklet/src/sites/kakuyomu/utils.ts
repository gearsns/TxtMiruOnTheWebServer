const URL_CODE_REGEX = /.*kakuyomu.jp\/works\/(?<ncode>[A-Za-z0-9]+)/;

export const urlCodeMatch = (url: string) => url.match(URL_CODE_REGEX);
export const getNcodeUrl = (ncode: string) => `works/${ncode}`;
export const isSupportUrl = (origin: string) => ["https://kakuyomu.jp"].includes(origin);
