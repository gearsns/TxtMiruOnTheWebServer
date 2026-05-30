// parser.test.ts (Vitestの例)
import { describe, it, expect } from "vitest";
import { extractSubtitles } from "./parser";

describe("extractSubtitles", () => {
    it("章タイトルとサブタイトルを正しくマッピングして、章タイトルを除外すること", () => {
        // テスト用のHTML構造を定義
        const fakeHtml = `
            <div class="p-eplist">
                <div class="p-eplist__chapter-title">第1章 旅立ち</div>
                <div class="p-eplist__sublist">
                    <a class="p-eplist__subtitle" href="https://ncode.syosetu.com/n1234xx/1/">第一話 出会い</a>
                    <div class="p-eplist__update"><span title="2026/01/01 12:00 改稿">2026/01/01 10:00</span></div>
                </div>
            </div>
        `;
        
        // テスト環境のDOMParserでDocument化
        const doc = new DOMParser().parseFromString(fakeHtml, "text/html");
        const result = extractSubtitles(doc);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            chapter: "第1章 旅立ち",
            subtitle: "第一話 出会い",
            href: "/n1234xx/1/",
            index: "1",
            subdate: "2026/01/01 12:00",
            subupdate: "2026/01/01 10:00"
        });
    });
});
