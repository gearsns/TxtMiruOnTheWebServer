const DB_NAME = "NovelListDB";
const STORE_NAME = "NovelListStore";

const accessDB = (mode: IDBTransactionMode, callback: (store: IDBObjectStore) => void): Promise<void> => {
    return new Promise((resolve) => {
        const req = indexedDB.open(DB_NAME);
        req.onsuccess = (e: any) => {
            const db = e.target.result as IDBDatabase;
            callback(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
            db.close();
            resolve();
        };
        req.onupgradeneeded = (e: any) => {
            const db = e.target.result as IDBDatabase;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveManagerUrl = async (url: string): Promise<void> => {
    await accessDB("readwrite", (store) => store.put({ id: "url", value: url }));
};

export const loadManagerUrl = (): Promise<string> => {
    return new Promise((resolve) => {
        accessDB("readonly", (store) => {
            store.get("url").onsuccess = (e: any) => resolve(e.target.result?.value || "");
        });
    });
};
