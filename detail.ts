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
//     参照表示）にはその場で反映されますが、実際にlocalStorageへ
//     書き込む（基本画面に反映される）のは、識別ID:T-016のテキスト
//     編集とあわせて、下記No.5の「保存」を押したタイミングです。
//
// 機能一覧 No.5 を実装しています。
//   処理ID   : S-005 / 処理名: 保存実行
//   場所     : 詳細画面＞識別ID:T-019（保存ボタン）
//   アクション: 詳細画面の内容を保存し、ToDoリストを更新する。
//   ※ 識別ID:T-016（本日のメモ 各行の入力欄）を編集可能にし、
//     「保存」ボタン（T-019）を押すと、現在の入力欄・チェック
//     ボックスの状態をまとめてlocalStorageに保存します。
//     保存した内容は、基本画面（index.html）を開き直す（または
//     カレンダーで日付を選び直す）と、識別ID:T-005（本日のメモ）・
//     識別ID:T-007（ToDoリスト）に反映されます。
//
// ※ 遷移・確定（戻る、No.6）はまだ未実装です。
//    試験実装のため、9/10・9/15・9/22の3日分のみ初期データがあります。
//
// ※ このファイルの初期データ（DEFAULT_LINES）は、index.html側の
//    script.ts に定義されているものと同じ内容を、試験実装として
//    重複して持たせています。
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

/** その日の識別ID:T-016（本日のメモ 各行）を読み込む（保存済みの内容） */
function loadLines(day: number): MemoLine[] {
  const store = readStore();
  const key = String(day);
  if (store[key]) return padLines(store[key]);
  if (DEFAULT_LINES[day]) return DEFAULT_LINES[day];
  return emptyLines();
}

/**
 * 処理ID:S-005「保存実行」
 * その日の識別ID:T-016（本日のメモ 各行）をlocalStorageに保存する。
 * これにより、基本画面（index.html）側の識別ID:T-005・T-007にも反映される。
 */
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
 *  処理ID:S-003「チェックマーク登録」・S-004「チェックマーク削除」の
 *  結果を、その場でプレビュー表示する（保存前の内容も反映）。
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

let saveStatusTimer: number | undefined;

/** 識別ID:T-019（保存ボタン）付近に、保存結果を一時的に表示する */
function showSaveStatus(message: string): void {
  const statusEl = document.getElementById("save-status");
  if (!statusEl) return;

  statusEl.textContent = message;

  if (saveStatusTimer !== undefined) {
    window.clearTimeout(saveStatusTimer);
  }
  saveStatusTimer = window.setTimeout(() => {
    statusEl.textContent = "";
  }, 2500);
}

/**
 * 識別ID:T-016・T-017（入力欄・チェックボックス）を描画する。
 * 操作結果は lines（このページ内の作業用データ）にその場で反映し、
 * 識別ID:T-020（ToDoリスト）もあわせてプレビュー更新する。
 * 実際の保存（localStorageへの書き込み）は「保存」ボタンで行う。
 */
function renderInputList(lines: MemoLine[]): void {
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
    input.placeholder = "メモを入力";
    input.setAttribute("aria-label", `${index + 1}行目のメモ`);

    input.addEventListener("input", () => {
      lines[index] = { ...lines[index], text: input.value };
      renderTodoList(lines);
      showSaveStatus("");
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
  const lines = loadLines(day);

  renderDateHeading(day);
  renderInputList(lines);
  renderTodoList(lines);

  const saveButton = document.getElementById("save-button");
  if (saveButton) {
    saveButton.addEventListener("click", () => {
      saveLines(day, lines);
      renderTodoList(lines);
      showSaveStatus("保存しました");
    });
  }
});
