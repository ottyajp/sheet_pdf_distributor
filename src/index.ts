import { Command } from 'commander';
import { readDictionary, readdir } from './wrapper-fs';
import { DestinationNames } from './types/Dictionary';
import { Dirent } from 'fs';

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

    // 1. 対象を確認する
    // 1-1. 対象ディレクトリを取得する。引数に無ければカレント
    const srcDir = options.src || './';
    const targetDirectories = (await readdir(srcDir)).filter((e) =>
        e.isDirectory()
    );

    // 1-2. 対象ディレクトリに存在するPDFファイルの一覧を取得する
    const targetPDFs = await Promise.all(
        targetDirectories.map(async (e) => {
            const files = (await readdir(`${e.path}/${e.name}`)).filter((f) => {
                return f.isFile() && f.name.indexOf('pdf') !== -1;
            });
            return files;
        })
    );

    // 2. 宛先を確認する
    // 2-1. 引数に無ければ親
    const destDir = options.dest || '../';

    // 3. PDFファイルを分類する
    // 3-1. 手持ち対応表で予想分類をする
    // 辞書読み込み
    const dict = await readDictionary(
        options.dictionary || './dictionary.json'
    );

    // 3-2. 予想分類の結果を表示する
    const result: { [dest in DestinationNames]?: Dirent[] } & {
        unexpected: Dirent[];
    }[] = [];
    targetPDFs.forEach((directory) => {
        const resultByDirecotry: { [dest in DestinationNames]?: Dirent[] } & {
            unexpected: Dirent[];
        } = {
            unexpected: [],
        };

        directory.forEach((pdf) => {
            const { name } = pdf;

            const destination = dict.reduce(
                (prev: DestinationNames | null, cur) => {
                    if (prev) return prev;
                    const { keyword, dest } = cur;
                    if (name.indexOf(keyword) !== -1) {
                        return dest;
                    }
                    return null;
                },
                null
            );

            if (!destination) {
                resultByDirecotry.unexpected.push(pdf);
            } else {
                if (!resultByDirecotry[destination]) {
                    resultByDirecotry[destination] = [];
                }
                resultByDirecotry[destination]?.push(pdf);
            }
        });

        result.push(resultByDirecotry);
    });

    console.log(JSON.stringify(result, undefined, '  '));

    // 3-3. 不満点があれば、対応表をいじって再度分類・表示
    // 3-4. 満足できれば対応表を保存

    // 4. 実際にコピーする
}

main();
