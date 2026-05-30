
let baseStyle: HTMLStyleElement | null = null;

export const applyGlobalStyle = () => {
    document.documentElement.style.overflowY = "hidden";

    // スタイルがなければ作成してheadにappend
    baseStyle ||= document.getElementById("NovelListBaseStyle") as HTMLStyleElement || 
        Object.assign(document.createElement('style'), { id: "NovelListBaseStyle" });
    if (!baseStyle.isConnected) document.head.append(baseStyle);

    baseStyle.textContent = `ins, #geniee_overlay_outer, .c-ad { display: none !important; }`;
};
