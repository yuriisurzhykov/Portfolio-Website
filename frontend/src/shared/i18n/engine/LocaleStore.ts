export type Dict = Record<string, string>;

export interface LocaleStore {
    loadLocale(code: string): Promise<Dict>
}