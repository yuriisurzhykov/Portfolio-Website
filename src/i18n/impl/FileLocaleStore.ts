import {promises as fs} from "fs";
import path from "path";
import {type Dict, type LocaleStore} from "../LocalStore.ts";

export class FileLocaleStore implements LocaleStore {

    private readonly baseFolder: string;
    private readonly fileName: string = "translation.json";

    constructor(
        baseFolder: string = "/public/locales",
        fileName: string = "translation.json"
    ) {
        this.fileName = fileName;
        this.baseFolder = baseFolder;
        // there is no initialization happening during class instantiation
    }

    async loadLocale(code: string): Promise<Dict> {
        const filePath = path.join(this.baseFolder, code, this.fileName);
        const fileContent = await fs.readFile(filePath, "utf8");
        return JSON.parse(fileContent);
    }
}