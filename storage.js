"use strict";
// =========================================================
// メモ帳アプリ 共通データアクセス層 - storage.ts
//
// index.html・detail.html の両方から、それぞれの
// script.js / detail.js より前に
//   <script src="storage.js"></script>
// で読み込む共通スクリプトです（コンパイル: tsc storage.ts --target ES2020）。
//
// -----------------------------------------------------------
// 【将来的なDB化について】
// 現在は日付ごとのメモ・ToDoデータを、ブラウザのlocalStorageに
// 保存しています。ただし、実際にサーバー側のデータベースに保存する
// 形に切り替えることを見据えて、データの読み書きを行う場所を
// このファイル1箇所（MemoStorageオブジェクト）にまとめています。
//
// MemoStorage.load / MemoStorage.save は、最初から
// 「Promiseを返す（非同期の）関数」として設計しています。
// localStorageへの読み書き自体は同期処理ですが、あえて
// Promise.resolve(...) でラップすることで、呼び出す側
// （script.ts / detail.ts）は最初から
//   const lines = await MemoStorage.load(day);
//   await MemoStorage.save(day, lines);
// という「非同期でデータを読み書きする」書き方に統一しています。
//
// そのため、将来この中身をサーバーAPIへのfetch()通信に
// 置き換えても、呼び出し側のコードを変更する必要はありません。
// 置き換えのイメージは次のとおりです。
//
//   const MemoStorage = {
//     load(day) {
//       return fetch(`/api/memos/${day}`)
//         .then((res) => res.json());
//     },
//     save(day, lines) {
//       return fetch(`/api/memos/${day}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(lines),
//       }).then(() => undefined);
//     },
//   };
//
// ※ 実際にサーバーAPI・DBを用意する場合は、上記に加えて
//   ・APIサーバー側の実装（エンドポイント、DBのテーブル設計等）
//   ・保存に失敗した場合のエラーハンドリング（通信エラー時の表示等）
//   も別途必要になります。今回はその手前の「差し替えやすい形」
//   まで用意したものです。
// =========================================================
const LINES_PER_DAY = 10;
const STORAGE_KEY = "memoAppLines";
function emptyLines() {
    return Array.from({ length: LINES_PER_DAY }, () => ({ text: "", checked: false }));
}
function padLines(lines) {
    const result = emptyLines();
    lines.forEach((line, index) => {
        if (index < result.length) {
            result[index] = line;
        }
    });
    return result;
}
// 日付ごとの初期データ（仮データ・試験実装）
// 試験実装のため、9/10・9/15・9/22の3日分のみ初期データがあります。
const DEFAULT_LINES = {
    10: padLines([
        { text: "14:00〜 定例会議", checked: false },
        { text: "資料を事前に確認しておく", checked: true },
        { text: "買い物リストの整理", checked: true },
        { text: "企画書のレビューを行う", checked: true },
        { text: "メールの返信をする", checked: false },
        { text: "週次報告を提出する", checked: true },
    ]),
    15: padLines([
        { text: "15:00〜 歯科検診", checked: false },
        { text: "帰りにクリーニング店に立ち寄る", checked: true },
        { text: "検診の予約を確認する", checked: true },
    ]),
    22: padLines([]),
};
function readLocalStore() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
function writeLocalStore(store) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
    catch {
        // localStorageが使用できない場合は何もしない
    }
}
const ICON_STORAGE_KEY = "memoAppIcons";
/**
 * その日のToDoリスト（識別ID:T-020）に登録がある（チェック済みの行が
 * 存在する）かどうかを判定する。
 */
function hasTodoItems(lines) {
    return lines.some((line) => line.checked && line.text.trim() !== "");
}
/** その日の識別ID:T-016（本日のメモ 各行）を読み込む（load()と共通処理） */
function getLinesForDay(day) {
    const store = readLocalStore();
    const key = String(day);
    if (store[key])
        return padLines(store[key]);
    if (DEFAULT_LINES[day])
        return DEFAULT_LINES[day];
    return emptyLines();
}
function readIconStore() {
    try {
        const raw = window.localStorage.getItem(ICON_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
function writeIconStore(store) {
    try {
        window.localStorage.setItem(ICON_STORAGE_KEY, JSON.stringify(store));
    }
    catch {
        // localStorageが使用できない場合は何もしない
    }
}
/**
 * 日付ごとのメモ・ToDoデータ（識別ID:T-016）の読み書きをまとめた窓口。
 * 画面側（script.ts / detail.ts）はこのオブジェクト経由でのみ
 * データを読み書きし、localStorageに直接アクセスしません。
 */
const MemoStorage = {
    /** その日の識別ID:T-016（本日のメモ 各行）を読み込む */
    load(day) {
        return Promise.resolve(getLinesForDay(day));
    },
    /** その日の識別ID:T-016（本日のメモ 各行）を保存する */
    save(day, lines) {
        const store = readLocalStore();
        store[String(day)] = lines;
        writeLocalStore(store);
        return Promise.resolve();
    },
    /**
     * 既知のすべての日付（初期データがある日＋保存済みの日）の
     * 識別ID:T-016（本日のメモ 各行）をまとめて読み込む。
     * 基本画面のToDoリスト（識別ID:T-007）を、日付ごとにグループ化して
     * 全件表示する際に使用する。
     */
    loadAll() {
        const store = readLocalStore();
        const result = {};
        Object.keys(DEFAULT_LINES).forEach((key) => {
            result[Number(key)] = DEFAULT_LINES[Number(key)];
        });
        Object.keys(store).forEach((key) => {
            result[Number(key)] = padLines(store[key]);
        });
        return Promise.resolve(result);
    },
    /**
     * 修正一覧No.6・No.7：その日の識別ID:T-020アイコン選択を読み込む。
     * まだ一度も保存されていない場合（その日にToDoリストへの登録が
     * あるとき）は、初期状態としてチェックマーク（☑️）を選択済みとする。
     * 一度でも保存（選択解除の保存も含む）された後は、その内容を優先する。
     */
    loadIcon(day) {
        const store = readIconStore();
        const key = String(day);
        if (Object.prototype.hasOwnProperty.call(store, key)) {
            const value = store[key];
            return Promise.resolve(value === "" ? null : value);
        }
        const lines = getLinesForDay(day);
        return Promise.resolve(hasTodoItems(lines) ? "☑️" : null);
    },
    /**
     * 修正一覧No.6・No.7：その日の識別ID:T-020アイコン選択を保存する。
     * icon に null を渡すと選択解除として保存する（次回以降もデフォルトの
     * チェックマーク表示に戻らないよう、明示的な「未選択」として記録する）。
     */
    saveIcon(day, icon) {
        const store = readIconStore();
        store[String(day)] = icon ?? "";
        writeIconStore(store);
        return Promise.resolve();
    },
    /**
     * 修正一覧No.7：基本画面の識別ID:T-006（カレンダー）で、
     * アイコンが選択されている日付分をまとめて読み込む。
     * loadIcon() と同様、未保存かつToDo登録がある日は
     * チェックマーク（☑️）をデフォルトとして含める。
     */
    loadAllIcons() {
        const store = readIconStore();
        const result = {};
        const days = new Set();
        Object.keys(DEFAULT_LINES).forEach((key) => days.add(Number(key)));
        Object.keys(readLocalStore()).forEach((key) => days.add(Number(key)));
        Object.keys(store).forEach((key) => days.add(Number(key)));
        days.forEach((day) => {
            const key = String(day);
            if (Object.prototype.hasOwnProperty.call(store, key)) {
                const value = store[key];
                if (value !== "")
                    result[day] = value;
                return;
            }
            const lines = getLinesForDay(day);
            if (hasTodoItems(lines))
                result[day] = "☑️";
        });
        return Promise.resolve(result);
    },
};
