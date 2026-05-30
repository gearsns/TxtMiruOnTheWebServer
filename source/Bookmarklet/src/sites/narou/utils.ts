const URL_CODE_REGEX = /.*syosetu.*\/(?<ncode>n[A-Za-z0-9]+)/;

export const urlCodeMatch = (url: string) => url.match(URL_CODE_REGEX);
export const getNcodeUrl = (ncode: string) => ncode;
export const isSupportUrl = (origin: string) => ["https://ncode.syosetu.com", "https://novel18.syosetu.com"].includes(origin);
