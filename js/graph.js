// ===== 탐색 시각화 (graph.html) =====
// 1단계: 격자 만들기와 크기 입력. 벽 편집·BFS·DFS는 이후 단계에서 추가한다.

// ----- 설정 -----
const MIN_SIZE = 5;
const MAX_ROWS = 20;   // 행은 20까지 (너무 커지면 한눈에 보기 어렵다)
const MAX_COLS = 30;
const DEFAULT_ROWS = 15;
const DEFAULT_COLS = 25;
const CELL_MAX_PX = 40;   // 칸 한 변의 최대 크기. 열이 적을 때 칸이 지나치게 커지지 않게 한다

// ----- 화면 요소 -----
const rowsInput = document.getElementById('rows-input');
const colsInput = document.getElementById('cols-input');
const applyBtn = document.getElementById('apply-btn');
const gridBox = document.getElementById('grid');
const message = document.getElementById('message');

// ----- 상태 -----
let rows = DEFAULT_ROWS;   // 지금 격자의 행 수
let cols = DEFAULT_COLS;   // 지금 격자의 열 수
let cells = [];            // cells[행][열] = 칸 div
let startPos = null;       // 시작점 { row, col }
let goalPos = null;        // 도착점 { row, col }


// ----- 격자 만들기 -----
// 입력값이 범위를 벗어나면 5 ~ maxSize 안으로 맞춰 준다
function readSize(input, maxSize) {
  let size = Number(input.value);
  if (!Number.isInteger(size) || size < MIN_SIZE) {
    size = MIN_SIZE;
  }
  if (size > maxSize) {
    size = maxSize;
  }
  input.value = size;
  return size;
}

// rows x cols 칸을 만들어 화면에 넣는다. 칸에는 자기 위치를 data-row, data-col로 적어 둔다
function buildGrid() {
  gridBox.innerHTML = '';
  cells = [];

  gridBox.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
  gridBox.style.maxWidth = cols * CELL_MAX_PX + 'px';

  for (let r = 0; r < rows; r++) {
    const rowCells = [];
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridBox.appendChild(cell);
      rowCells.push(cell);
    }
    cells.push(rowCells);
  }
}

// 시작점은 왼쪽 가운데, 도착점은 오른쪽 가운데에 놓는다
function placeMarkers() {
  const middle = Math.floor(rows / 2);
  startPos = { row: middle, col: 0 };
  goalPos = { row: middle, col: cols - 1 };

  cells[startPos.row][startPos.col].classList.add('start');
  cells[goalPos.row][goalPos.col].classList.add('goal');
}

// 입력한 크기로 격자를 새로 만든다 (벽·시작·도착 위치는 처음 상태로 돌아간다)
function applySize() {
  rows = readSize(rowsInput, MAX_ROWS);
  cols = readSize(colsInput, MAX_COLS);
  buildGrid();
  placeMarkers();
  message.textContent = rows + '행 × ' + cols + '열 격자를 만들었습니다.';
}


// ----- 버튼 연결 -----
applyBtn.addEventListener('click', applySize);

// 처음 페이지를 열었을 때 격자 하나를 만들어 둔다
applySize();
