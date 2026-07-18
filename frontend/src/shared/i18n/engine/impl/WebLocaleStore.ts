import { type Dict, type LocaleStore } from "../LocaleStore.ts";

export class WebLocaleStore implements LocaleStore {

    private readonly baseUrl: string;
    private readonly fileName: string;

    constructor(baseUrl: string, fileName: string) {
        this.baseUrl = baseUrl;
        this.fileName = fileName;
    }

    async loadLocale(code: string): Promise<Dict> {
        const url = `${ this.baseUrl }/${ code }/${ this.fileName }`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load locale ${ code } with baseUrl ${ this.baseUrl } and filename ${ this.fileName }`)
        }

        return await response.json() as Dict;
    }
}