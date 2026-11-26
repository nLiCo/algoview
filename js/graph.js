// ===== 탐색 시각화 (graph.html) =====
// 격자 만들기·크기 입력, 벽·시작·도착 편집. BFS·DFS는 이후 단계에서 추가한다.

// ----- 설정 -----
const MIN_SIZE = 5;
const MAX_ROWS = 20;   // 행은 20까지 (너무 커지면 한눈에 보기 어렵다)
const MAX_COLS = 30;
const DEFAULT_ROWS = 15;
const DEFAULT_COLS = 25;
const CELL_MAX_PX = 40;   // 칸 한 변의 최대 크기. 열이 적을 때 칸이 지나치게 커지지 않게 한다
const WALL_RATE = 0.3;    // 무작위 벽: 칸마다 벽이 될 확률

// ----- 화면 요소 -----
const rowsInput = document.getElementById('rows-input');
const colsInput = document.getElementById('cols-input');
const applyBtn = document.getElementById('apply-btn');
const randomBtn = document.getElementById('random-btn');
const clearBtn = document.getElementById('clear-btn');
const gridBox = document.getElementById('grid');
const message = document.getElementById('message');

// ----- 상태 -----
let rows = DEFAULT_ROWS;   // 지금 격자의 행 수
let cols = DEFAULT_COLS;   // 지금 격자의 열 수
let cells = [];            // cells[행][열] = 칸 div
let walls = [];            // walls[행][열] = 벽이면 true
let startPos = null;       // 시작점 { row, col }
let goalPos = null;        // 도착점 { row, col }
let dragMode = null;       // 끌고 있는 동작: 'draw'(벽 그리기) 'erase'(벽 지우기) 'start' 'goal' (끌고 있지 않으면 null)
let lastPos = null;        // 끌다가 마지막으로 처리한 칸 (같은 칸을 또 처리하지 않으려고)


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
  walls = [];

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
    walls.push(new Array(cols).fill(false));   // 처음에는 벽이 없다
  }
}

// 시작점은 왼쪽 가운데, 도착점은 오른쪽 가운데에 놓는다
function placeMarkers() {
  const middle = Math.floor(rows / 2);
  startPos = { row: middle, col: 0 };
  goalPos = { row: middle, col: cols - 1 };

  drawCell(startPos.row, startPos.col);
  drawCell(goalPos.row, goalPos.col);
}

// ----- 격자 편집 -----
function isStart(row, col) {
  return startPos.row === row && startPos.col === col;
}

function isGoal(row, col) {
  return goalPos.row === row && goalPos.col === col;
}

// 칸 하나를 지금 상태(벽·시작·도착)에 맞는 색으로 다시 칠한다
function drawCell(row, col) {
  const cell = cells[row][col];
  cell.className = 'cell';
  if (walls[row][col]) {
    cell.classList.add('wall');
  }
  if (isStart(row, col)) {
    cell.classList.add('start');
  }
  if (isGoal(row, col)) {
    cell.classList.add('goal');
  }
}

function drawAllCells() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      drawCell(r, c);
    }
  }
}

// 벽을 놓거나(true) 지운다(false). 시작·도착 칸에는 벽을 놓지 않는다
function setWall(row, col, value) {
  if (isStart(row, col) || isGoal(row, col)) {
    return;
  }
  walls[row][col] = value;
  drawCell(row, col);
}

// 시작점을 pos 칸으로 옮긴다. 벽이나 도착점 위로는 옮기지 않는다
function moveStart(pos) {
  if (walls[pos.row][pos.col] || isGoal(pos.row, pos.col)) {
    return;
  }
  const oldPos = startPos;
  startPos = pos;
  drawCell(oldPos.row, oldPos.col);
  drawCell(pos.row, pos.col);
}

// 도착점을 pos 칸으로 옮긴다. 벽이나 시작점 위로는 옮기지 않는다
function moveGoal(pos) {
  if (walls[pos.row][pos.col] || isStart(pos.row, pos.col)) {
    return;
  }
  const oldPos = goalPos;
  goalPos = pos;
  drawCell(oldPos.row, oldPos.col);
  drawCell(pos.row, pos.col);
}

// 칸마다 약 30% 확률로 벽을 만든다 (기존 벽은 사라진다). 길이 막힐 수도 있다
function makeRandomWalls() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      walls[r][c] = !isStart(r, c) && !isGoal(r, c) && Math.random() < WALL_RATE;
    }
  }
  drawAllCells();
  message.textContent = '무작위 벽을 만들었습니다. 길이 막혀 있을 수도 있습니다.';
}

function clearWalls() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      walls[r][c] = false;
    }
  }
  drawAllCells();
  message.textContent = '벽을 모두 지웠습니다.';
}


// ----- 끌어서 편집하기 -----
// 마우스와 터치를 함께 다루려고 포인터 이벤트(pointerdown/move/up)를 쓴다

// 화면 좌표 (x, y)에 있는 칸의 위치를 { row, col }로 돌려준다. 칸이 아니면 null
// (터치는 처음 누른 칸으로만 이벤트가 오므로, 끄는 도중에는 좌표로 칸을 찾는다)
function getCellAt(x, y) {
  const element = document.elementFromPoint(x, y);
  if (element === null || !element.classList.contains('cell')) {
    return null;
  }
  return { row: Number(element.dataset.row), col: Number(element.dataset.col) };
}

// 끌고 있는 동작(dragMode)에 맞게 pos 칸을 처리한다
function applyDrag(pos) {
  if (dragMode === 'draw') {
    setWall(pos.row, pos.col, true);
  } else if (dragMode === 'erase') {
    setWall(pos.row, pos.col, false);
  } else if (dragMode === 'start') {
    moveStart(pos);
  } else if (dragMode === 'goal') {
    moveGoal(pos);
  }
}

// 누른 칸을 보고 동작을 정한다: 시작·도착 칸이면 옮기기, 벽이면 지우기, 빈 칸이면 벽 그리기
gridBox.addEventListener('pointerdown', function (event) {
  if (event.button !== 0) {
    return;   // 마우스 오른쪽·가운데 버튼은 무시
  }
  const pos = getCellAt(event.clientX, event.clientY);
  if (pos === null) {
    return;
  }

  if (isStart(pos.row, pos.col)) {
    dragMode = 'start';
  } else if (isGoal(pos.row, pos.col)) {
    dragMode = 'goal';
  } else if (walls[pos.row][pos.col]) {
    dragMode = 'erase';
  } else {
    dragMode = 'draw';
  }
  lastPos = pos;
  applyDrag(pos);
});

// 끄는 도중에 칸이 바뀔 때마다 처리한다. 격자 밖으로 나가도 이어지도록 document에서 받는다
document.addEventListener('pointermove', function (event) {
  if (dragMode === null) {
    return;
  }
  if (event.buttons === 0) {
    endDrag();   // 버튼을 뗐는데 pointerup을 못 받은 경우(창 전환 등): 끌기를 끝낸다
    return;
  }
  const pos = getCellAt(event.clientX, event.clientY);
  if (pos === null) {
    return;
  }
  if (lastPos !== null && pos.row === lastPos.row && pos.col === lastPos.col) {
    return;   // 아직 같은 칸 안
  }
  lastPos = pos;
  applyDrag(pos);
});

function endDrag() {
  dragMode = null;
  lastPos = null;
}

document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);


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
randomBtn.addEventListener('click', makeRandomWalls);
clearBtn.addEventListener('click', clearWalls);

// 처음 페이지를 열었을 때 격자 하나를 만들어 둔다
applySize();
