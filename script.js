"use strict";
// =========================================================
// メモ帳アプリ 基本画面 - script.ts (TypeScript ソース)
//
// index.html からは直接読み込めないため、コンパイル後の
// script.js を <script src="script.js"> で読み込む構成です。
// データの読み書きは storage.ts（storage.js）の MemoStorage 経由で
// 行うため、index.html では storage.js を script.js より先に
// 読み込んでください。
//
//   tsc script.ts --target ES2020 --outFile script.js
//
// -----------------------------------------------------------
// 機能一覧 No.1 を実装しています。
//   処理ID   : S-001 / 処理名: 選択実行
//   場所     : 基本画面＞識別ID:T-008（カレンダーの日付選択）
//   アクション: 選択した日付の識別ID:T-016（本日のメモ 各行の内容）を、
//              識別ID:T-005（本日のメモ）に表示させる。
//   ※ 識別ID:T-007（ToDoリスト）については、下記のとおり仕様を
//     変更したため、カレンダーの日付選択には連動しません。
//
// 機能一覧 No.2 を実装しています。
//   処理ID   : S-002 / 処理名: 遷移実行
//   場所     : 基本画面＞識別ID:T-009（編集ボタン）
//   アクション: 選択した日付の詳細画面（detail.html）に遷移する。
//
// 機能一覧 No.3〜No.6 の結果を表示しています。
//   詳細画面（detail.html）側でのチェック操作・保存・戻る操作の結果は、
//   MemoStorage（storage.ts）経由でlocalStorageに保存されるため、
//   ここでは MemoStorage.load / loadAll を呼ぶだけで、最新の保存内容が
//   識別ID:T-005（本日のメモ）・識別ID:T-007（ToDoリスト）に
//   反映されます。
//
// -----------------------------------------------------------
// 【ToDoリスト（識別ID:T-007）の仕様変更】
// 以前は「カレンダーで選択した日付のToDoだけ」を表示していましたが、
// 保存済み（チェック済み）のToDoを日付をまたいで一覧できるように、
// 全ての日付分をまとめて、日付ごとにグループ化して表示する形に
// 変更しました（細い線→日付→その日のToDo、を日付の昇順で繰り返す）。
// そのため、カレンダーで日付を選んでも識別ID:T-007の表示内容は
// 変わりません（識別ID:T-005「本日のメモ」だけが切り替わります）。
//
// ※ MemoStorage.load / save / loadAll は Promise を返す非同期の
//   窓口のため、将来 storage.ts の中身をサーバーAPI通信に
//   置き換えても、このファイルの書き方を変える必要はありません。
// =========================================================
let selectedDay = null;
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
/** 識別ID:T-005（本日のメモ）の表示を更新する */
async function renderMemo(day) {
    const memoEl = document.getElementById("memo-display");
    if (!memoEl)
        return;
    const lines = await MemoStorage.load(day);
    const memoText = lines
        .map((line) => line.text)
        .filter((text) => text.trim() !== "")
        .join("\n");
    if (memoText) {
        memoEl.innerHTML = escapeHtml(memoText).replace(/\n/g, "<br>");
    }
    else {
        memoEl.innerHTML = '<span class="empty-message">この日のメモは登録されていません</span>';
    }
}
function formatDateLabel(day) {
    const dayText = String(day).padStart(2, "0");
    return `2026/09/${dayText}`;
}
/**
 * 識別ID:T-007（ToDoリスト）の表示を更新する。
 * 保存済み（チェック済み）のToDoを、日付ごとにグループ化して
 * 日付の昇順ですべて表示する（カレンダーの日付選択には連動しない）。
 */
async function renderTodoListAll() {
    const todoEl = document.getElementById("todo-display");
    if (!todoEl)
        return;
    const allLines = await MemoStorage.loadAll();
    const days = Object.keys(allLines)
        .map((key) => Number(key))
        .sort((a, b) => a - b);
    todoEl.innerHTML = "";
    let hasAnyTodo = false;
    days.forEach((day) => {
        const todoLabels = allLines[day]
            .filter((line) => line.checked && line.text.trim() !== "")
            .map((line) => line.text);
        if (todoLabels.length === 0)
            return;
        hasAnyTodo = true;
        const groupLi = document.createElement("li");
        groupLi.className = "todo-group";
        const divider = document.createElement("div");
        divider.className = "todo-group__divider";
        const dateEl = document.createElement("div");
        dateEl.className = "todo-group__date";
        dateEl.textContent = formatDateLabel(day);
        const itemsEl = document.createElement("ul");
        itemsEl.className = "todo-group__items";
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
            itemsEl.appendChild(li);
        });
        groupLi.appendChild(divider);
        groupLi.appendChild(dateEl);
        groupLi.appendChild(itemsEl);
        todoEl.appendChild(groupLi);
    });
    if (!hasAnyTodo) {
        const li = document.createElement("li");
        li.className = "todo-list__empty";
        li.textContent = "登録されているToDoはありません";
        todoEl.appendChild(li);
    }
}
/**
 * 識別ID:T-008（選択）：カレンダーで日付を選択したときの処理
 * 処理ID:S-001「選択実行」
 */
async function selectDay(day, dayButton) {
    const table = dayButton.closest(".calendar__table");
    if (table) {
        table.querySelectorAll("td.is-selected").forEach((td) => {
            td.classList.remove("is-selected");
        });
    }
    const cell = dayButton.closest("td");
    if (cell) {
        cell.classList.add("is-selected");
    }
    selectedDay = day;
    await renderMemo(day);
}
/**
 * 識別ID:T-009（編集ボタン）：選択した日付の詳細画面に遷移する処理
 * 処理ID:S-002「遷移実行」
 */
function goToDetail() {
    if (selectedDay === null)
        return;
    window.location.href = "detail.html?day=" + encodeURIComponent(String(selectedDay));
}
document.addEventListener("DOMContentLoaded", () => {
    const dayButtons = document.querySelectorAll(".calendar__day");
    dayButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const day = Number(button.dataset.day);
            if (!Number.isNaN(day)) {
                void selectDay(day, button);
            }
        });
    });
    // 初期表示：本日の日付（2026/09/10）を選択状態にする
    const initialButton = document.querySelector('.calendar__day[data-day="10"]');
    if (initialButton) {
        void selectDay(10, initialButton);
    }
    // ToDoリストは日付選択に連動しないため、初回に一度だけ描画する
    void renderTodoListAll();
    const editButton = document.getElementById("edit-button");
    if (editButton) {
        editButton.addEventListener("click", goToDetail);
    }
});
