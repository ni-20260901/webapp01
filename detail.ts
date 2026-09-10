// =========================================================
// メモ帳アプリ 詳細画面（本日のメモ 編集画面）- detail.ts (TypeScript ソース)
//
// detail.html からは直接読み込めないため、コンパイル後の
// detail.js を <script src="detail.js"> で読み込む構成です。
//
//   tsc detail.ts --target ES2020 --outFile detail.js
//
// -----------------------------------------------------------
// 機能一覧 No.2 を実装しています。
//   処理ID   : S-002
//   処理名   : 遷移実行
//   場所     : 基本画面＞識別ID:T-009（編集ボタン）
//   アクション: 選択した日付の詳細画面に遷移する。
//   ※ index.html（script.ts）側で detail.html?day=15 の形式で
//     日付を渡しているため、ここではURLクエリパラメータ「day」を
//     読み取り、その日付の内容を表示します。
//
// 機能一覧 No.3・No.4 を実装しています。
//   処理ID   : S-003（チェックマーク登録）/ S-004（チェックマーク削除）
//   場所     : 詳細画面＞識別ID:T-017（チェックボックス）
//   アクション: T-017で、チェックを入れた行をToDoリストに表示する／
//              チェックを外した行をToDoリストから削除する。
//   ※ 識別ID:T-016（入力欄）の各行についているチェックボックスを
//     操作すると、その場でこのページ内の識別ID:T-020（ToDoリスト
//     参照表示）に反映されるほか、localStorageに保存することで、
//     基本画面（index.html）の識別ID:T-007（ToDoリスト）にも
//     反映されます。
//
// ※ 保存・遷移・確定など、他の機能一覧の行はまだ未実装です。
//    識別ID:T-016のテキスト自体はまだ読み取り専用で、
//    編集はできません（チェックボックスの操作のみ実装済みです）。
//
// ※ このファイルの初期データ（DEFAULT_LINES）は、index.html側の
//    script.ts に定義されているものと同じ内容を、試験実装として
//    重複して持たせています。保存機能（S-005）を実装する際は、
//    共通のデータソースにまとめることを想定しています。
//    試験実装のため、9/10・9/15・9/22の3日分のみ初期データがあります。
// =========================================================

interface MemoLine {
  /** 識別ID:T-016（入力）1行分のテキスト */
  text: string;
  /** 識別ID:T-017（登録・削除チェックボックス）の状態 */
  checked: boolean;
}

type LinesStore = Record<string, MemoLine[]>;

const LINES_PER_DAY = 10;
const STORAGE_KEY = "memoAppLines";

function emptyLines(): MemoLine[] {
  return Array.from({ length: LINES_PER_DAY }, () => ({ text: "", checked: false }));
}

function padLines(lines: MemoLine[]): MemoLine[] {
  const result = emptyLines();
  lines.forEach((line, index) => {
    if (index < result.length) {
      result[index] = line;
    }
  });
  return result;
}

// 日付ごとの初期データ（仮データ・試験実装）
const DEFAULT_LINES: Record<number, MemoLine[]> = {
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

function readStore(): LinesStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LinesStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: LinesStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorageが使用できない場合は何もしない（この画面内の表示のみ更新される）
  }
}

/** その日の識別ID:T-016（本日のメモ 各行）を読み込む */
function loadLines(day: number): MemoLine[] {
  const store = readStore();
  const key = String(day);
  if (store[key]) return padLines(store[key]);
  if (DEFAULT_LINES[day]) return DEFAULT_LINES[day];
  return emptyLines();
}

/** その日の識別ID:T-016（本日のメモ 各行）を保存する */
function saveLines(day: number, lines: MemoLine[]): void {
  const store = readStore();
  store[String(day)] = lines;
  writeStore(store);
}

/** URLの ?day=15 からその値を取得する（無ければ null） */
function getDayFromQuery(): number | null {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("day");
  if (value === null) return null;
  const day = Number(value);
  return Number.isNaN(day) ? null : day;
}

/** 識別ID:T-014（見出し4）：日付表示を更新する（2026年9月固定） */
function renderDateHeading(day: number): void {
  const headingEl = document.getElementById("date-heading");
  if (!headingEl) return;
  const dayText = String(day).padStart(2, "0");
  headingEl.textContent = `2026/09/${dayText}`;
}

/** 識別ID:T-020（ToDoリスト 参照表示）を更新する
 *  処理ID:S-003「チェックマーク登録」・S-004「チェックマーク削除」の反映
 */
function renderTodoList(lines: MemoLine[]): void {
  const todoEl = document.getElementById("todo-display");
  if (!todoEl) return;

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

/**
 * 識別ID:T-016・T-017（入力欄・チェックボックス）を描画する。
 * チェックボックスの変更時に、処理ID:S-003/S-004を実行する
 * （ToDoリストへの登録・削除を反映し、localStorageに保存する）。
 */
function renderInputList(day: number, lines: MemoLine[]): void {
  const listEl = document.getElementById("input-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  lines.forEach((line, index) => {
    const li = document.createElement("li");
    li.className = "input-list__row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "input-list__field";
    input.value = line.text;
    input.readOnly = true; // テキスト編集・保存機能（S-005）は未実装

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "input-list__check";
    checkbox.checked = line.checked;
    checkbox.setAttribute("aria-label", `${index + 1}行目をToDoリストに登録`);

    checkbox.addEventListener("change", () => {
      lines[index] = { ...lines[index], checked: checkbox.checked };
      saveLines(day, lines);
      renderTodoList(lines);
    });

    li.appendChild(input);
    li.appendChild(checkbox);
    listEl.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const day = getDayFromQuery() ?? 10; // dayが無い場合は本日(10日)を既定表示とする
  const lines = loadLines(day);

  renderDateHeading(day);
  renderInputList(day, lines);
  renderTodoList(lines);
});
