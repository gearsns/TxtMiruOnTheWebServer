export class UIStateManager {
    private elLoading: HTMLElement;
    private elLoadingText: HTMLElement;
    private elError: HTMLElement | null;
    public abortController: AbortController | null = null;

    constructor(shadow: ShadowRoot) {
        this.elLoading = shadow.getElementById("Loading")!;
        this.elLoadingText = shadow.getElementById("LoadingText")!;
        this.elError = shadow.getElementById("NovelError");
    }

    setErrorMessage(text: string) {
        if (this.elError) this.elError.textContent = text;
    }

    showLoading(text: string) {
        const style = this.elLoading.style;
        if (style.display !== "block") {
            style.display = "block";
            this.abortController = new AbortController();
        }
        this.elLoadingText.textContent = text;
    }

    hideLoading() {
        try { this.abortController?.abort("cancel"); } catch { }
        this.elLoading.style.display = "none";
        this.abortController = null;
    }

    isAbortError(err: unknown): boolean {
        return err === "cancel" || (err instanceof Error && err.name === "AbortError");
    }

    async waitSeconds(seconds: number = 5) {
        for (let i = seconds; i > 0; --i) {
            if (this.abortController?.signal.aborted) throw "cancel";
            this.showLoading(`待機中 ${i}`);
            await new Promise(r => setTimeout(r, 250));
        }
    }
}
