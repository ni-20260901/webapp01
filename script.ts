// =========================================================
// メモ帳アプリ 基本画面 - script.ts (TypeScript ソース)
//
// index.html からは直接読み込めないため、コンパイル後の
// script.js を <script src="script.js"> で読み込む構成です。
//
//   tsc script.ts --target ES2020 --outFile script.js
//
// -----------------------------------------------------------
// 機能一覧 No.1 を実装しています。
//   処理ID   : S-001
//   処理名   : 選択実行
//   場所     : 基本画面＞識別ID:T-008（カレンダーの日付選択）
//   アクション: 識別ID:T-006（カレンダー(月単位)）から選択した
//              日付の識別ID:T-016（入力＝本日のメモ 各行の内容）を、
//              識別ID:T-005（本日のメモ）と識別ID:T-007（ToDoリスト）
//              に表示させる。
//
// ※ 保存・登録・削除・遷移など、他の機能一覧の行はまだ未実装です。
//    ここでは日付ごとのメモ・ToDoデータを画面上に保持し、
//    カレンダーの日付を選択した時に表示を切り替える処理のみを
//    実装しています。
// =========================================================

interface TodoItem {
  label: string;
  done: boolean;
}

interface DayData {
  /** 識別ID:T-016（入力）に相当する、その日の本日のメモの内容 */
  memo: string;
  /** その日のToDoリストの内容 */
  todos: TodoItem[];
}

// 日付ごとのメモ・ToDoデータ（仮データ）
// 本来は識別ID:T-016（詳細画面の入力欄）に入力された内容が
// ここに保存される想定ですが、保存機能（S-005）は未実装のため、
// 画面確認用の仮データとして用意しています。
const memoData: Record<number, DayData> = {
  10: {
    memo: "14:00〜 定例会議\n資料を事前に確認しておく\n\n買い物リストの整理も忘れずに",
    todos: [
      { label: "企画書のレビュー", done: false },
      { label: "メールの返信", done: false },
      { label: "週次報告の提出", done: true },
      { label: "資料の印刷", done: false },
    ],
  },
  15: {
    memo: "15:00〜 歯科検診\n帰りにクリーニング店に立ち寄る",
    todos: [
      { label: "検診の予約確認", done: true },
      { label: "クリーニング受け取り", done: false },
    ],
  },
  22: {
    memo: "",
    todos: [],
  },
};

let selectedDay: number | null = null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 識別ID:T-005（本日のメモ）の表示を更新する */
function renderMemo(day: number): void {
  const memoEl = document.getElementById("memo-display");
  if (!memoEl) return;

  const data = memoData[day];
  const memoText = data ? data.memo : "";

  if (memoText) {
    memoEl.innerHTML = escapeHtml(memoText).replace(/\n/g, "<br>");
  } else {
    memoEl.innerHTML = '<span class="empty-message">この日のメモは登録されていません</span>';
  }
}

/** 識別ID:T-007（ToDoリスト）の表示を更新する */
function renderTodoList(day: number): void {
  const todoEl = document.getElementById("todo-display");
  if (!todoEl) return;

  const data = memoData[day];
  const todos = data ? data.todos : [];

  todoEl.innerHTML = "";

  if (todos.length === 0) {
    const li = document.createElement("li");
    li.className = "todo-list__empty";
    li.textContent = "この日のToDoはありません";
    todoEl.appendChild(li);
    return;
  }

  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-list__item" + (todo.done ? " is-done" : "");

    const check = document.createElement("span");
    check.className = "todo-list__check";

    const label = document.createElement("span");
    label.className = "todo-list__label";
    label.textContent = todo.label;

    li.appendChild(check);
    li.appendChild(label);
    todoEl.appendChild(li);
  });
}

/**
 * 識別ID:T-008（選択）：カレンダーで日付を選択したときの処理
 * 処理ID:S-001「選択実行」
 */
function selectDay(day: number, dayButton: HTMLButtonElement): void {
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
  renderMemo(day);
  renderTodoList(day);
}

document.addEventListener("DOMContentLoaded", () => {
  const dayButtons = document.querySelectorAll<HTMLButtonElement>(".calendar__day");

  dayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const day = Number(button.dataset.day);
      if (!Number.isNaN(day)) {
        selectDay(day, button);
      }
    });
  });

  // 初期表示：本日の日付（2026/09/10）を選択状態にする
  const initialButton = document.querySelector<HTMLButtonElement>(
    '.calendar__day[data-day="10"]'
  );
  if (initialButton) {
    selectDay(10, initialButton);
  }
});
