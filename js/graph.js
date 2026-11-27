// ===== 탐색 시각화 (graph.html) =====
// 격자 만들기·크기 입력, 벽·시작·도착 편집, BFS·DFS 단계 실행과 경로 표시.

// ----- 설정 -----
const MIN_SIZE = 5;
const MAX_ROWS = 20;   // 행은 20까지 (너무 커지면 한눈에 보기 어렵다)
const MAX_COLS = 30;
const DEFAULT_ROWS = 15;
const DEFAULT_COLS = 25;
const CELL_MAX_PX = 40;   // 칸 한 변의 최대 크기. 열이 적을 때 칸이 지나치게 커지지 않게 한다
const WALL_RATE = 0.3;    // 무작위 벽: 칸마다 벽이 될 확률
const SPEED_DELAYS = [500, 200, 100, 50, 20];   // 속도 1~5에 해당하는 단계 간격(ms)

// 이웃 칸으로 가는 방향 [행 변화, 열 변화]: 위, 오른쪽, 아래, 왼쪽 순서
const DIRECTIONS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

// ----- 화면 요소 -----
const algoSelect = document.getElementById('algo-select');
const algoTitle = document.getElementById('algo-title');
const algoItems = document.querySelectorAll('[data-algos]');   // 특정 알고리즘에서만 보이는 범례·안내
const rowsInput = document.getElementById('rows-input');
const colsInput = document.getElementById('cols-input');
const applyBtn = document.getElementById('apply-btn');
const randomBtn = document.getElementById('random-btn');
const clearBtn = document.getElementById('clear-btn');
const runBtn = document.getElementById('run-btn');
const pauseBtn = document.getElementById('pause-btn');
const stepBtn = document.getElementById('step-btn');
const speedInput = document.getElementById('speed-input');
const gridBox = document.getElementById('grid');
const message = document.getElementById('message');
const codeScroll = document.getElementById('code-scroll');   // 의사코드의 스크롤되는 부분
const codeLists = document.querySelectorAll('.code');   // 알고리즘별 의사코드 목록
const codeVars = document.getElementById('code-vars');
const visitCountText = document.getElementById('visit-count');
const pathLengthText = document.getElementById('path-length');

// ----- 상태 -----
let rows = DEFAULT_ROWS;   // 지금 격자의 행 수
let cols = DEFAULT_COLS;   // 지금 격자의 열 수
let cells = [];            // cells[행][열] = 칸 div
let walls = [];            // walls[행][열] = 벽이면 true
let marks = [];            // marks[행][열] = 탐색 표시: null, 'queued'(대기 중), 'visited'(방문 완료), 'current'(현재 칸), 'path'(최종 경로)
let startPos = null;       // 시작점 { row, col }
let goalPos = null;        // 도착점 { row, col }
let dragMode = null;       // 끌고 있는 동작: 'draw'(벽 그리기) 'erase'(벽 지우기) 'start' 'goal' (끌고 있지 않으면 null)
let lastPos = null;        // 끌다가 마지막으로 처리한 칸 (같은 칸을 또 처리하지 않으려고)
let steps = null;          // 탐색(BFS 또는 DFS) 제너레이터 (탐색 중이 아니면 null)
let timer = null;          // 자동 실행 타이머 (자동 실행 중이 아니면 null)
let isRunning = false;     // 자동 실행 중인가 (실행 중에는 격자를 편집할 수 없다)
let currentPos = null;     // 지금 "현재 칸"으로 칠해 둔 칸 { row, col }
let searchShown = false;   // 격자에 탐색 표시(대기·방문)가 남아 있는가


// ----- 격자 만들기 -----
// 입력값이 범위를 벗어나면 5 ~ maxSize 안으로 맞춰 준다. 소수(예: 7.5)는 반올림한다
function readSize(input, maxSize) {
  let size = Math.round(Number(input.value));
  if (Number.isNaN(size) || size < MIN_SIZE) {
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
  marks = [];

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
    marks.push(new Array(cols).fill(null));    // 처음에는 탐색 표시가 없다
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
  if (marks[row][col] !== null) {
    cell.classList.add(marks[row][col]);   // 'queued', 'visited', 'current', 'path'
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
  clearSearch();   // 벽이 바뀌므로 이전 탐색 표시를 지운다
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      walls[r][c] = !isStart(r, c) && !isGoal(r, c) && Math.random() < WALL_RATE;
    }
  }
  drawAllCells();
  message.textContent = '무작위 벽을 만들었습니다. 길이 막혀 있을 수도 있습니다.';
}

function clearWalls() {
  clearSearch();   // 벽이 바뀌므로 이전 탐색 표시를 지운다
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
  if (isRunning) {
    return;   // 실행 중에는 격자를 편집할 수 없다
  }
  const pos = getCellAt(event.clientX, event.clientY);
  if (pos === null) {
    return;
  }

  // 탐색 표시가 남아 있거나 일시정지한 탐색이 있으면 지운다 (벽은 그대로)
  // (제너레이터는 만들 때의 시작·도착점을 기억하므로, 옮긴 뒤 이어서 실행하면 안 된다)
  if (searchShown || steps !== null) {
    clearSearch();
    message.textContent = '격자를 바꿨습니다. 실행을 눌러 다시 탐색해 보세요.';
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
  clearSearch();
  message.textContent = rows + '행 × ' + cols + '열 격자를 만들었습니다.';
}


// ----- 의사코드 -----
// showPseudocode(), showVars(), highlightLines(), scrollToLine()은 common.js에 있다


// ----- 너비 우선 탐색 (BFS) -----
// 칸 위치를 "(행, 열)" 글자로 만든다
function positionText(pos) {
  return '(' + pos.row + ', ' + pos.col + ')';
}

// 도착점에서 prev를 따라 시작점까지 거슬러 올라가 경로를 만든 뒤, 시작점부터 한 칸씩 칠하는 단계들을 배열로 돌려준다
// (BFS와 DFS가 함께 쓴다)
// firstLines: 첫 칸을 칠하는 단계에서 실행된 의사코드 줄, nextLines: 그 뒤 단계들에서 실행된 줄
function makePathStates(goal, prev, visitCount, firstLines, nextLines) {
  const path = [];
  for (let pos = goal; pos !== null; pos = prev[pos.row][pos.col]) {
    path.push(pos);
  }
  path.reverse();   // 시작점 → 도착점 순서로 뒤집는다

  const states = [];
  for (let i = 0; i < path.length; i++) {
    const isLast = (i === path.length - 1);
    let message = '경로의 ' + (i + 1) + '번째: ' + positionText(path[i]) + ' 칸을 칠했습니다.';
    if (isLast) {
      message = '경로를 모두 칠했습니다. 경로는 ' + path.length + '칸입니다.';
    }
    states.push({
      current: null,
      added: [],
      pathCell: path[i],
      visitCount: visitCount,
      pathLength: path.length,
      lines: (i === 0) ? firstLines : nextLines,
      vars: { '경로 길이': path.length, '칠한 칸': i + 1 },
      message: message,
      done: isLast
    });
  }
  return states;
}

// BFS 제너레이터: 큐에서 칸 하나를 꺼내 처리할 때마다 한 단계를 내보낸다 (yield)
// 도착점을 꺼내면 그 뒤로 최종 경로를 시작점 쪽부터 한 칸씩 칠하는 단계가 이어진다
// 내보내는 상태: current(꺼낸 칸), added(이번에 큐에 넣은 칸들), pathCell(이번에 경로로 칠할 칸),
//   visitCount(지금까지 꺼낸 칸 수), pathLength(경로의 칸 수. 아직 모르면 null, 경로가 없으면 0),
//   lines(실행된 의사코드 줄), vars(그 줄을 실행한 뒤의 변수 값), message(설명), done(탐색이 끝났는가)
// 방문 표시는 큐에 넣을 때 한다. 그래서 같은 칸이 큐에 두 번 들어가지 않는다
// prev[행][열]는 그 칸에 오기 직전의 칸이다. 도착점에서 prev를 따라가면 시작점까지의 경로가 나온다
function* bfs(walls, start, goal) {
  const rowCount = walls.length;
  const colCount = walls[0].length;

  // visited[행][열]: 큐에 넣은 적이 있는 칸 (대기 중이거나 이미 꺼낸 칸)
  const visited = [];
  const prev = [];
  for (let r = 0; r < rowCount; r++) {
    visited.push(new Array(colCount).fill(false));
    prev.push(new Array(colCount).fill(null));
  }

  const queue = [start];
  visited[start.row][start.col] = true;
  let visitCount = 0;     // 지금까지 큐에서 꺼낸 칸 수
  let firstStep = true;   // 첫 단계에는 1번 줄(시작 칸 넣기)도 함께 실행된 것으로 본다

  while (queue.length > 0) {
    const current = queue.shift();
    visitCount++;
    const lines = firstStep ? [1, 2, 3] : [2, 3];
    firstStep = false;

    // 도착점에서 꺼냈으면 탐색 성공: 이제 경로를 찾아 칠한다 (4번 줄은 이때만 실행된 줄이다)
    if (current.row === goal.row && current.col === goal.col) {
      lines.push(4);
      yield {
        current: current,
        added: [],
        pathCell: null,
        visitCount: visitCount,
        pathLength: null,
        lines: lines,
        vars: { '현재 칸': positionText(current), '큐 크기': queue.length },
        message: positionText(current) + ' 칸을 꺼냈습니다. 도착점입니다! 이전 칸을 따라 거슬러 올라가 경로를 찾습니다.',
        done: false
      };

      // 도착점에서 시작점까지 경로를 만들어, 시작점부터 한 칸씩 칠하는 단계를 이어서 내보낸다
      for (const state of makePathStates(goal, prev, visitCount, [8, 9, 10], [10])) {
        yield state;
      }
      return;
    }

    // 위·오른쪽·아래·왼쪽 이웃 중 벽도 아니고 방문 표시도 없는 칸만 큐에 넣는다
    // (6번 줄은 벽이거나 방문 표시된 칸을 실제로 건너뛴 단계에서만, 7번 줄은 큐에 넣은 칸이 있는 단계에서만 실행된 줄이다)
    lines.push(5);
    let skipped = false;   // 이번 단계에서 벽이거나 방문 표시된 이웃을 건너뛰었는가
    const added = [];
    for (const [dr, dc] of DIRECTIONS) {
      const r = current.row + dr;
      const c = current.col + dc;
      if (r < 0 || r >= rowCount || c < 0 || c >= colCount) {
        continue;
      }
      if (walls[r][c] || visited[r][c]) {
        skipped = true;
        continue;
      }
      visited[r][c] = true;
      prev[r][c] = current;
      const next = { row: r, col: c };
      queue.push(next);
      added.push(next);
    }
    if (skipped) {
      lines.push(6);
    }
    if (added.length > 0) {
      lines.push(7);
    }

    let message = positionText(current) + ' 칸을 꺼냈습니다. ';
    if (added.length > 0) {
      message += '새로 찾은 이웃 ' + added.length + '칸을 큐 뒤에 넣었습니다.';
    } else {
      message += '새로 넣을 이웃이 없습니다.';
    }
    yield {
      current: current,
      added: added,
      pathCell: null,
      visitCount: visitCount,
      pathLength: null,
      lines: lines,
      vars: { '현재 칸': positionText(current), '큐 크기': queue.length },
      message: message,
      done: false
    };
  }

  // 큐가 비도록 도착점을 못 찾았다
  yield {
    current: null,
    added: [],
    pathCell: null,
    visitCount: visitCount,
    pathLength: 0,
    lines: [2, 11],
    vars: { '큐 크기': 0 },
    message: '큐가 비었습니다. 도착점에 갈 수 없습니다.',
    done: true
  };
}

// DFS 제너레이터: BFS와 같은 틀이고, 큐 대신 스택을 쓴다 (shift 대신 pop)
// 방문 표시는 BFS와 달리 스택에서 꺼낼 때 한다. 그래서 같은 칸이 스택에 여러 번 들어 있을 수 있고,
// 이미 방문한 칸을 꺼내면 한 단계로 세지 않고 조용히 건너뛴다 (한 단계 = 새로 방문한 칸 하나)
// 내보내는 상태는 bfs와 같다
function* dfs(walls, start, goal) {
  const rowCount = walls.length;
  const colCount = walls[0].length;

  // visited[행][열]: 스택에서 꺼내 방문한 칸
  const visited = [];
  const prev = [];
  for (let r = 0; r < rowCount; r++) {
    visited.push(new Array(colCount).fill(false));
    prev.push(new Array(colCount).fill(null));
  }

  const stack = [start];
  let visitCount = 0;     // 지금까지 새로 방문한 칸 수
  let firstStep = true;   // 첫 단계에는 1번 줄(시작 칸 넣기)도 함께 실행된 것으로 본다
  let skippedDuplicate = false;   // 이번 단계 전에 이미 방문한 칸을 건너뛰었는가 (4번 줄)

  while (stack.length > 0) {
    const current = stack.pop();
    if (visited[current.row][current.col]) {
      skippedDuplicate = true;
      continue;   // 이미 방문한 칸이 중복으로 남아 있던 것: 건너뛴다
    }
    visited[current.row][current.col] = true;
    visitCount++;
    const lines = firstStep ? [1, 2, 3] : [2, 3];
    if (skippedDuplicate) {
      lines.push(4);   // 4번 줄은 중복 항목을 실제로 건너뛴 단계에서만 실행된 줄이다
    }
    lines.push(5);
    firstStep = false;
    skippedDuplicate = false;

    // 도착점에서 꺼냈으면 탐색 성공: 이제 경로를 찾아 칠한다 (6번 줄은 이때만 실행된 줄이다)
    if (current.row === goal.row && current.col === goal.col) {
      lines.push(6);
      yield {
        current: current,
        added: [],
        pathCell: null,
        visitCount: visitCount,
        pathLength: null,
        lines: lines,
        vars: { '현재 칸': positionText(current), '스택 크기': stack.length },
        message: positionText(current) + ' 칸을 꺼냈습니다. 도착점입니다! 이전 칸을 따라 거슬러 올라가 경로를 찾습니다.',
        done: false
      };

      // 도착점에서 시작점까지 경로를 만들어, 시작점부터 한 칸씩 칠하는 단계를 이어서 내보낸다
      for (const state of makePathStates(goal, prev, visitCount, [10, 11, 12], [12])) {
        yield state;
      }
      return;
    }

    // 위·오른쪽·아래·왼쪽 이웃 중 벽도 아니고 방문한 적도 없는 칸을 스택에 넣는다
    // (아직 방문 표시는 하지 않으므로, 이미 스택에 있는 칸이 한 번 더 들어갈 수 있다)
    // prev는 넣을 때 기록한다. 같은 칸을 또 넣으면 나중에 넣은 칸으로 바뀌는데, 그 칸이 먼저 꺼내지므로 맞다
    // (8번 줄은 벽이거나 방문한 칸을 실제로 건너뛴 단계에서만, 9번 줄은 스택에 넣은 칸이 있는 단계에서만 실행된 줄이다)
    lines.push(7);
    let skipped = false;   // 이번 단계에서 벽이거나 방문한 이웃을 건너뛰었는가
    const added = [];
    for (const [dr, dc] of DIRECTIONS) {
      const r = current.row + dr;
      const c = current.col + dc;
      if (r < 0 || r >= rowCount || c < 0 || c >= colCount) {
        continue;
      }
      if (walls[r][c] || visited[r][c]) {
        skipped = true;
        continue;
      }
      prev[r][c] = current;
      const next = { row: r, col: c };
      stack.push(next);
      added.push(next);
    }
    if (skipped) {
      lines.push(8);
    }
    if (added.length > 0) {
      lines.push(9);
    }

    let message = positionText(current) + ' 칸을 꺼냈습니다. ';
    if (added.length > 0) {
      message += '이웃 ' + added.length + '칸을 스택 위에 넣었습니다.';
    } else {
      message += '새로 넣을 이웃이 없습니다.';
    }
    yield {
      current: current,
      added: added,
      pathCell: null,
      visitCount: visitCount,
      pathLength: null,
      lines: lines,
      vars: { '현재 칸': positionText(current), '스택 크기': stack.length },
      message: message,
      done: false
    };
  }

  // 스택이 비도록 도착점을 못 찾았다
  yield {
    current: null,
    added: [],
    pathCell: null,
    visitCount: visitCount,
    pathLength: 0,
    lines: skippedDuplicate ? [2, 4, 13] : [2, 13],
    vars: { '스택 크기': 0 },
    message: '스택이 비었습니다. 도착점에 갈 수 없습니다.',
    done: true
  };
}

// 한 단계의 결과를 격자에 반영한다: 이전 현재 칸은 방문 완료로, 새로 넣은 칸은 대기 중으로,
// 꺼낸 칸은 현재 칸으로, 경로로 칠할 칸은 경로로 칠한다
function showSearchState(state) {
  if (currentPos !== null) {
    marks[currentPos.row][currentPos.col] = 'visited';
    drawCell(currentPos.row, currentPos.col);
  }

  for (const pos of state.added) {
    marks[pos.row][pos.col] = 'queued';
    drawCell(pos.row, pos.col);
  }

  currentPos = state.current;
  if (currentPos !== null) {
    marks[currentPos.row][currentPos.col] = 'current';
    drawCell(currentPos.row, currentPos.col);
  }

  if (state.pathCell !== null) {
    marks[state.pathCell.row][state.pathCell.col] = 'path';
    drawCell(state.pathCell.row, state.pathCell.col);
  }
  searchShown = true;
}

// 방문한 칸 수와 경로 길이를 보여 준다. pathLength가 null이면 아직 모르는 것(-), 0이면 경로가 없는 것이다
function showCounts(visitCount, pathLength) {
  visitCountText.textContent = visitCount;
  if (pathLength === null) {
    pathLengthText.textContent = '-';
  } else if (pathLength === 0) {
    pathLengthText.textContent = '없음';
  } else {
    pathLengthText.textContent = pathLength + '칸';
  }
}

// 탐색 진행과 격자의 탐색 표시를 모두 지운다 (벽·시작·도착은 그대로)
function clearSearch() {
  steps = null;
  currentPos = null;
  searchShown = false;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      marks[r][c] = null;
    }
  }
  drawAllCells();
  runBtn.textContent = '실행';
  highlightLines([]);
  showVars(null);
  showCounts(0, null);
}


// 알고리즘을 바꾸면 제목·범례·안내·의사코드를 그 알고리즘에 맞추고, 진행 중이던 탐색 표시는 지운다 (벽은 그대로)
function changeAlgorithm() {
  algoTitle.textContent = algoSelect.options[algoSelect.selectedIndex].text;
  // data-algos가 있는 항목은 거기 적힌 알고리즘(공백으로 구분)을 골랐을 때만 보인다
  for (const item of algoItems) {
    const algos = item.dataset.algos.split(' ');
    item.hidden = !algos.includes(algoSelect.value);
  }
  showPseudocode();
  clearSearch();
}


// ----- 단계 실행 -----
// 실행 중에는 입력 관련 버튼을 모두 막고, 일시정지 버튼만 켠다
// (속도 조절은 실행 중에도 바꿀 수 있게 막지 않는다. 격자 편집은 pointerdown에서 isRunning을 보고 막는다)
function setRunning(running) {
  isRunning = running;
  algoSelect.disabled = running;
  rowsInput.disabled = running;
  colsInput.disabled = running;
  applyBtn.disabled = running;
  randomBtn.disabled = running;
  clearBtn.disabled = running;
  runBtn.disabled = running;
  stepBtn.disabled = running;
  pauseBtn.disabled = !running;
}

// getDelay(), startTimer(), stopTimer(), finish()는 common.js에 있다

// 탐색 중이 아니면 이전 표시를 지우고, 고른 알고리즘의 새 제너레이터를 만든다 (끝난 뒤 다시 실행할 때도 여기로 온다)
function prepareSteps() {
  if (steps !== null) {
    return;
  }
  clearSearch();
  if (algoSelect.value === 'dfs') {
    steps = dfs(walls, startPos, goalPos);
  } else {
    steps = bfs(walls, startPos, goalPos);
  }
}

// 제너레이터에서 다음 상태를 하나 꺼내 화면에 반영한다
function doStep() {
  const result = steps.next();
  const state = result.value;

  showSearchState(state);
  showCounts(state.visitCount, state.pathLength);
  highlightLines(state.lines);
  showVars(state.vars);
  message.textContent = state.message;

  if (state.done) {
    finish();
  }
}


// ----- 버튼 연결 -----
applyBtn.addEventListener('click', applySize);
randomBtn.addEventListener('click', makeRandomWalls);
clearBtn.addEventListener('click', clearWalls);

// 알고리즘을 바꾸면 이전 탐색 표시를 지우고 제목·범례·의사코드를 바꾼다
algoSelect.addEventListener('change', function () {
  changeAlgorithm();
  message.textContent = '알고리즘을 바꿨습니다. 실행을 눌러 탐색해 보세요.';
});

// 처음 실행이면 새로 시작하고, 일시정지 후라면 멈춘 곳부터 이어서 진행한다
runBtn.addEventListener('click', function () {
  prepareSteps();
  setRunning(true);
  startTimer();
});

// 일시정지하면 실행 버튼이 "재개"로 바뀐다. 탐색이 끝나거나 처음부터 다시 하게 되면 "실행"으로 돌아온다
pauseBtn.addEventListener('click', function () {
  stopTimer();
  setRunning(false);
  runBtn.textContent = '재개';
  message.textContent = message.textContent + ' (일시정지)';
});

// 실행 중에 속도를 바꾸면 타이머를 새 간격으로 다시 건다
speedInput.addEventListener('input', function () {
  if (timer !== null) {
    stopTimer();
    startTimer();
  }
});

// 한 단계만 진행하면 이어서 할 수 있도록 실행 버튼을 "재개"로 바꾼다 (끝났다면 doStep이 "실행"으로 돌려놓는다)
stepBtn.addEventListener('click', function () {
  prepareSteps();
  doStep();
  if (steps !== null) {
    runBtn.textContent = '재개';
  }
});

// 처음 페이지를 열었을 때 격자 하나를 만들어 둔다
applySize();
// 새로고침하면 브라우저가 선택 칸 값을 기억할 수 있으므로 제목·범례·의사코드를 그 값에 맞춘다
changeAlgorithm();
