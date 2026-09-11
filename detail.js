"use strict";
// =========================================================
// メモ帳アプリ 詳細画面（本日のメモ 編集画面）- detail.ts (TypeScript ソース)
//
// detail.html からは直接読み込めないため、コンパイル後の
// detail.js を <script src="detail.js"> で読み込む構成です。
// データの読み書きは storage.ts（storage.js）の MemoStorage 経由で
// 行うため、detail.html では storage.js を detail.js より先に
// 読み込んでください。
//
//   tsc detail.ts --target ES2020 --outFile detail.js
//
// -----------------------------------------------------------
// 機能一覧 No.2 を実装しています。
//   処理ID   : S-002 / 処理名: 遷移実行
//   場所     : 基本画面＞識別ID:T-009（編集ボタン）
//   アクション: 選択した日付の詳細画面に遷移する。
//   ※ index.html（script.ts）側で detail.html?day=15 の形式で
//     日付を渡しているため、ここではURLクエリパラメータ「day」を
//     読み取り、その日付の内容を表示します。
//
// 機能一覧 No.3・No.4 を実装しています（画面上のプレビュー）。
//   処理ID   : S-003（チェックマーク登録）/ S-004（チェックマーク削除）
//   場所     : 詳細画面＞識別ID:T-017（チェックボックス）
//   アクション: T-017で、チェックを入れた行をToDoリストに表示する／
//              チェックを外した行をToDoリストから削除する。
//   ※ チェックを操作すると、この画面内の識別ID:T-020（ToDoリスト
//     参照表示）にはその場で反映されますが、実際に保存する
//     （基本画面に反映される）のは、下記No.5「保存」・No.6「戻る」
//     を押したタイミングです。
//
// 機能一覧 No.5 を実装しています。
//   処理ID   : S-005 / 処理名: 保存実行
//   場所     : 詳細画面＞識別ID:T-019（保存ボタン）
//   アクション: 詳細画面の内容を保存し、ToDoリストを更新する。
//
// 機能一覧 No.6 を実装しています。
//   処理ID   : S-006 / 処理名: 保存の確定・遷移
//   場所     : 詳細画面＞識別ID:T-018（戻るボタン）
//   アクション: 編集内容の保存を確定し、基本画面に遷移する。
//   ※ 保存（S-005）と同様に現在の入力欄・チェックボックスの状態を
//     保存したうえで、基本画面（index.html）に遷移します。
//
// 【操作性の追加】識別ID:T-016（入力欄）でEnterキーを押すと、
//   次の行の入力欄にフォーカスを移動します（最終行では何もしません）。
//
// ※ 試験実装のため、9/10・9/15・9/22の3日分のみ初期データがあります。
//
// ※ データの保存先（localStorage）は、共通ファイル storage.ts の
//   MemoStorage にまとめています。MemoStorage.load / save は
//   Promiseを返す非同期の窓口のため、将来 storage.ts の中身を
//   サーバーAPI通信に置き換えても、このファイルの書き方
//   （await MemoStorage.load(day) など）を変える必要はありません。
// =========================================================
/** URLの ?day=15 からその値を取得する（無ければ null） */
function getDayFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("day");
    if (value === null)
        return null;
    const day = Number(value);
    return Number.isNaN(day) ? null : day;
}
/** 識別ID:T-014（見出し4）：日付表示を更新する（2026年9月固定） */
function renderDateHeading(day) {
    const headingEl = document.getElementById("date-heading");
    if (!headingEl)
        return;
    const dayText = String(day).padStart(2, "0");
    headingEl.textContent = `2026/09/${dayText}`;
}
/** 識別ID:T-020（ToDoリスト 参照表示）を更新する
 *  処理ID:S-003「チェックマーク登録」・S-004「チェックマーク削除」の
 *  結果を、その場でプレビュー表示する（保存前の内容も反映）。
 */
function renderTodoList(lines) {
    const todoEl = document.getElementById("todo-display");
    if (!todoEl)
        return;
    const todoLabels = lines
        .filter((line) => line.checked && line.text.trim() !== "")
        .map((line) => line.text);
    todoEl.innerHTML = "";
    if (todoLabels.length === 0) {
        const li = document.createElement("li");
        li.className = "todo-list__empty";
        li.textContent = "この日のToDoはありません";
        todoEl.appendChild(li);
        return;
    }
    todoLabels.forEach((label) => {
        const li = document.createElement("li");
        li.className = "todo-list__item";
        const check = document.createElement("span");
        check.className = "todo-list__check";
        const labelEl = document.createElement("span");
        labelEl.className = "todo-list__label";
        labelEl.textContent = label;
        li.appendChild(check);
        li.appendChild(labelEl);
        todoEl.appendChild(li);
    });
}
let saveStatusTimer;
/** 識別ID:T-019付近に、保存結果を一時的に表示する */
function showSaveStatus(message) {
    const statusEl = document.getElementById("save-status");
    if (!statusEl)
        return;
    statusEl.textContent = message;
    if (saveStatusTimer !== undefined) {
        window.clearTimeout(saveStatusTimer);
    }
    if (message) {
        saveStatusTimer = window.setTimeout(() => {
            statusEl.textContent = "";
        }, 2500);
    }
}
/**
 * 識別ID:T-016・T-017（入力欄・チェックボックス）を描画する。
 * 操作結果は lines（このページ内の作業用データ）にその場で反映し、
 * 識別ID:T-020（ToDoリスト）もあわせてプレビュー更新する。
 * 実際の保存（MemoStorage.save）は「保存」「戻る」ボタンで行う。
 */
function renderInputList(lines) {
    const listEl = document.getElementById("input-list");
    if (!listEl)
        return;
    listEl.innerHTML = "";
    lines.forEach((line, index) => {
        const li = document.createElement("li");
        li.className = "input-list__row";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "input-list__field";
        input.value = line.text;
        input.placeholder = "メモを入力";
        input.setAttribute("aria-label", `${index + 1}行目のメモ`);
        input.addEventListener("input", () => {
            lines[index] = { ...lines[index], text: input.value };
            renderTodoList(lines);
            showSaveStatus("");
        });
        // Enterキーで次の行の入力欄に移動する（最終行の場合は何もしない）
        input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter")
                return;
            event.preventDefault();
            const nextRow = li.nextElementSibling;
            if (!nextRow)
                return;
            const nextInput = nextRow.querySelector(".input-list__field");
            nextInput?.focus();
        });
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "input-list__check";
        checkbox.checked = line.checked;
        checkbox.setAttribute("aria-label", `${index + 1}行目をToDoリストに登録`);
        checkbox.addEventListener("change", () => {
            lines[index] = { ...lines[index], checked: checkbox.checked };
            renderTodoList(lines);
            showSaveStatus("");
        });
        li.appendChild(input);
        li.appendChild(checkbox);
        listEl.appendChild(li);
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const day = getDayFromQuery() ?? 10; // dayが無い場合は本日(10日)を既定表示とする
    MemoStorage.load(day).then((lines) => {
        renderDateHeading(day);
        renderInputList(lines);
        renderTodoList(lines);
        /**
         * 識別ID:T-019（保存ボタン）
         * 処理ID:S-005「保存実行」
         */
        const saveButton = document.getElementById("save-button");
        if (saveButton) {
            saveButton.addEventListener("click", () => {
                MemoStorage.save(day, lines).then(() => {
                    renderTodoList(lines);
                    showSaveStatus("保存しました");
                });
            });
        }
        /**
         * 識別ID:T-018（戻るボタン）
         * 処理ID:S-006「保存の確定・遷移」
         */
        const backButton = document.getElementById("back-button");
        if (backButton) {
            backButton.addEventListener("click", () => {
                showSaveStatus("保存して戻ります…");
                MemoStorage.save(day, lines).then(() => {
                    window.location.href = "index.html";
                });
            });
        }
    });
});
