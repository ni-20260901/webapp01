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
//   アクション: 識別ID:T-006(カレンダー)から選択した日付の識別ID:T-016
//              （入力内容）を、識別ID:T-005（本日のメモ）に表示させる。
//
// 【識別ID:T-005（本日のメモ）の初期表示についての仕様変更】
// 画面を開いた直後（まだカレンダーで何も選択していない時点）のみ、
// 固定のプレースホルダー文言ではなく、実際の当日（実行時の実日付）の
// MemoStorage実データを表示します（表示中の月2026年9月と実際の年月が
// 一致しない場合は「登録されていません」の表示になります）。
// カレンダーで日付を選択した後は、以前と同じとおり選択した日付の
// 内容に切り替わります（選択操作が働くのは処理ID:S-001のとおりです）。
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

interface MemoLine {
  text: string;
  checked: boolean;
}

// storage.js（storage.ts）が提供するグローバルの型宣言
// （実装は storage.ts 側にあり、ここでは型情報のみを宣言しています）
declare const MemoStorage: {
  load(day: number): Promise<MemoLine[]>;
  save(day: number, lines: MemoLine[]): Promise<void>;
  loadAll(): Promise<Record<number, MemoLine[]>>;
};

let selectedDay: number | null = null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDateLabel(day: number): string {
  const dayText = String(day).padStart(2, "0");
  return `2026/09/${dayText}`;
}

/**
 * 識別ID:T-003（見出し2）の日付部分を更新する（修正一覧No.5）。
 * 「カレンダー　(yyyy/mm/dd)」の (yyyy/mm/dd) にあたる部分を、
 * 識別ID:T-005（本日のメモ）と同じ日付で描画する。
 */
function updateCalendarHeading(day: number): void {
  const labelEl = document.getElementById("calendar-date-label");
  if (!labelEl) return;
  labelEl.textContent = `(${formatDateLabel(day)})`;
}

/**
 * 識別ID:T-005（本日のメモ）の表示を更新する。
 * あわせて識別ID:T-003（見出し2）の日付表示も同じ日付に更新する。
 */
async function renderMemo(day: number): Promise<void> {
  updateCalendarHeading(day);

  const memoEl = document.getElementById("memo-display");
  if (!memoEl) return;

  const lines = await MemoStorage.load(day);
  const memoText = lines
    .map((line) => line.text)
    .filter((text) => text.trim() !== "")
    .join("\n");

  if (memoText) {
    memoEl.innerHTML = escapeHtml(memoText).replace(/\n/g, "<br>");
  } else {
    memoEl.innerHTML = '<span class="empty-message">この日のメモは登録されていません</span>';
  }
}

/**
 * 識別ID:T-007（ToDoリスト）の表示を更新する。
 * 保存済み（チェック済み）のToDoを、日付ごとにグループ化して
 * 日付の昇順ですべて表示する（カレンダーの日付選択には連動しない）。
 */
async function renderTodoListAll(): Promise<void> {
  const todoEl = document.getElementById("todo-display");
  if (!todoEl) return;

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

    if (todoLabels.length === 0) return;
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
async function selectDay(day: number, dayButton: HTMLButtonElement): Promise<void> {
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
  // カレンダーで日付を選択した後は、以前と同じとおり識別ID:T-005
  // （本日のメモ）の表示を選択した日付の内容に切り替える。
  await renderMemo(day);
}

/**
 * 識別ID:T-009（編集ボタン）：選択した日付の詳細画面に遷移する処理
 * 処理ID:S-002「遷移実行」
 */
function goToDetail(): void {
  if (selectedDay === null) return;
  window.location.href = "detail.html?day=" + encodeURIComponent(String(selectedDay));
}

/**
 * カレンダーが表示している「2026年9月」と、実行時の実際の日付を
 * 突き合わせ、当日にあたる日(1〜30)を返す。表示月と一致しない場合は
 * null を返す（当日日マーク・本日のメモの当日連動の両方で共用する）。
 */
function getTodayDayInDisplayedMonth(): number | null {
  const now = new Date();
  const isDisplayedMonth = now.getFullYear() === 2026 && now.getMonth() === 8; // 8 = 9月(0始まり)
  return isDisplayedMonth ? now.getDate() : null;
}

/**
 * 識別ID:T-006（カレンダー）：当日日マーク（修正一覧No.4）
 * 実際の「当日」の日付を判定し、その日のセルにだけ is-today クラスを
 * 付与する（丸で囲み、内側部分と数字の色を反転させる表示は style.css 側）。
 * カレンダーは「2026年9月」固定表示のため、実際の日付がこの年月と
 * 一致する場合のみ丸印を付ける（一致しない場合はどの日にも付けない）。
 * ※ カレンダーの初期選択（識別ID:T-008の初期状態）とは独立した処理。
 */
function markToday(): void {
  const todayDay = getTodayDayInDisplayedMonth();
  if (todayDay === null) return;

  const todayButton = document.querySelector<HTMLButtonElement>(
    `.calendar__day[data-day="${todayDay}"]`
  );
  const cell = todayButton?.closest("td");
  if (cell) {
    cell.classList.add("is-today");
  }
}

/**
 * 識別ID:T-005（本日のメモ）：当日の内容とだけ連動させる。
 * カレンダーの選択状態には連動しない（詳細は本ファイル冒頭のコメント参照）。
 * 表示月（2026年9月）と実際の当日が一致しない場合は、当日データが
 * 存在しないため「登録されていません」の表示にする。
 */
async function renderTodayMemo(): Promise<void> {
  const todayDay = getTodayDayInDisplayedMonth();
  if (todayDay === null) {
    const memoEl = document.getElementById("memo-display");
    if (memoEl) {
      memoEl.innerHTML = '<span class="empty-message">この日のメモは登録されていません</span>';
    }
    return;
  }
  await renderMemo(todayDay);
}

document.addEventListener("DOMContentLoaded", () => {
  const dayButtons = document.querySelectorAll<HTMLButtonElement>(".calendar__day");

  dayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const day = Number(button.dataset.day);
      if (!Number.isNaN(day)) {
        void selectDay(day, button);
      }
    });
  });

  markToday();
  void renderTodayMemo();

  // ※ 以前は初期表示時に9/10を仮の選択状態にしていましたが、
  //   当日マーク（is-today）との見分けが付きにくいため廃止しました。
  //   初期状態ではどの日も未選択（識別ID:T-005は上記のとおり当日の
  //   内容を表示）とし、カレンダーで日付を選択して初めて選択状態になり、
  //   識別ID:T-005の表示もその選択日に切り替わります。

  // ToDoリストは日付選択に連動しないため、初回に一度だけ描画する
  void renderTodoListAll();

  const editButton = document.getElementById("edit-button");
  if (editButton) {
    editButton.addEventListener("click", goToDetail);
  }
});
