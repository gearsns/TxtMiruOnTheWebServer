const ESCAPE_CHAR: Record<string, string> = { '&': '&amp;', "'": '&#x27;', '`': '&#x60;', '"': '&quot;', '<': '&lt;', '>': '&gt;' };
const ESCAPE_REGEX = /[&'`"<>]/g;

export const escapeHtml = (text: string): string =>
    text.replace(ESCAPE_REGEX, match => ESCAPE_CHAR[match]);

export const initShadowDOM = (html: string, css: string): ShadowRoot | null => {
    document.getElementById("NovelListHost")?.remove();
    const host = Object.assign(document.createElement("div"), { id: "NovelListHost" });
    document.body.append(host);

    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    shadow.innerHTML = html;

    // StyleSheetの再利用と適用
    const sheet = (shadow.adoptedStyleSheets[0] as CSSStyleSheet) || new CSSStyleSheet();
    sheet.replaceSync(css);
    shadow.adoptedStyleSheets = [sheet];

    return shadow;
};
