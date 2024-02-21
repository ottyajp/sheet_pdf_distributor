import fs, { Dirent } from 'fs';
import { Dictionary } from './types/Dictionary';

export async function readdir(path: string): Promise<Dirent[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(
            path,
            { withFileTypes: true, recursive: false },
            (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            }
        );
    });
}

export async function readDictionary(path: string): Promise<Dictionary> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err: NodeJS.ErrnoException | null, data: Buffer) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data.toString()) as Dictionary);
            }
        });
    });
}

export async function mkdir(path: string): Promise<string | void> {
    return new Promise((resolve, reject) => {
        fs.mkdir(
            path,
            { recursive: true },
            (err: NodeJS.ErrnoException | null, path: string | undefined) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(path);
                }
            }
        );
    });
}

export async function copy(src: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.copyFile(src, dest, (err: NodeJS.ErrnoException | null) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
