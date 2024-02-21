import { Command } from 'commander';
import { copy, mkdir, readDictionary, readdir } from './wrapper-fs';
import { DestinationNames } from './types/Dictionary';
import { Dirent } from 'fs';
import { destinationNames } from './constants/destinationNames';

async function main() {
    const program = new Command();

    // 初期処理
    program
        .description('sheet pdf distributor')
        .option(
            '-s, --src <path>',
            'where the directories containing the PDF is located'
        )
        .option('-d, --dest <path>')
        .option('--dictionary <path to JSON>');

    program.parse(process.argv);
    const options = program.opts<{
        src?: string;
        dest?: string;
        dictionary?: string;
    }>();

    // 対象を確認する
    // 対象ディレクトリを取得する。引数に無ければカレント
    const srcDir = options.src || './';
    const targetDirectories = (await readdir(srcDir)).filter((e) =>
        e.isDirectory()
    );

    // 対象ディレクトリに存在するPDFファイルの一覧を取得する
    const targetPDFs = await Promise.all(
        targetDirectories.map(async (e) => {
            const files = (await readdir(`${e.path}/${e.name}`)).filter((f) => {
                return f.isFile() && f.name.indexOf('pdf') !== -1;
            });
            return {
                name: e.name,
                files,
            };
        })
    );

    // 宛先を確認する（引数に無ければ親）
    const destDir = options.dest || '../';

    // 辞書読み込み
    const dict = await readDictionary(
        options.dictionary || './dictionary.json'
    );

    // PDFファイルを分類する
    const result: {
        name: string;
        files: { [dest in DestinationNames]?: Dirent[] } & {
            unexpected: Dirent[];
        };
    }[] = [];
    targetPDFs.forEach(({ name, files }) => {
        const resultByDirecotry: { [dest in DestinationNames]?: Dirent[] } & {
            unexpected: Dirent[];
        } = {
            unexpected: [],
        };

        files.forEach((pdf) => {
            const { name } = pdf;

            const destinations = dict.reduce(
                (prev: DestinationNames[] | null, cur) => {
                    if (prev) return prev;
                    const { keyword, dest, all } = cur;
                    if (name.indexOf(keyword) !== -1) {
                        if (all) {
                            return destinationNames;
                        }
                        return [dest];
                    }
                    return null;
                },
                null
            );

            if (!destinations) {
                resultByDirecotry.unexpected.push(pdf);
            } else {
                destinations.forEach((destination) => {
                    if (!resultByDirecotry[destination]) {
                        resultByDirecotry[destination] = [];
                    }
                    resultByDirecotry[destination]?.push(pdf);
                });
            }
        });

        result.push({
            name,
            files: resultByDirecotry,
        });
    });

    console.log(JSON.stringify(result, undefined, '  '));

    // 実際にコピーする
    await mkdir(destDir);
    const promises = result.map(async ({ name, files }) => {
        return Object.entries(files).map(async ([part, pdfs]) => {
            await mkdir(`${destDir}/${part}/${name}`);
            return pdfs!.map(async (dirent) => {
                const src = `${srcDir}/${name}/${dirent.name}`;
                const dest = `${destDir}/${part}/${name}/${dirent.name}`;
                await copy(src, dest);
            });
        });
    });
    (await Promise.all((await Promise.all(promises)).flat())).flat();
}

main();
