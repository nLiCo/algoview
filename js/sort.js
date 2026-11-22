// ===== 정렬 시각화 =====
// 구조: 정렬 함수(제너레이터)가 한 단계마다 "지금 상태"를 yield로 내보내고,
//       바깥의 doStep()이 next()로 그 상태를 하나씩 꺼내 막대를 다시 그린다.

const MIN_SIZE = 5;
const MAX_SIZE = 50;
// 속도 1~5단계별 한 단계 간격(ms). 숫자가 클수록 빠르다
const SPEED_DELAYS = [1000, 500, 300, 150, 50];

// 화면 요소
const algoSelect = document.getElementById('algo-select');
const algoTitle = document.getElementById('algo-title');
const orderedLegend = document.getElementById('ordered-legend');
const sizeInput = document.getElementById('size-input');
const randomBtn = document.getElementById('random-btn');
const runBtn = document.getElementById('run-btn');
const pauseBtn = document.getElementById('pause-btn');
const stepBtn = document.getElementById('step-btn');
const speedInput = document.getElementById('speed-input');
const barsBox = document.getElementById('bars');
const message = document.getElementById('message');
const compareCountText = document.getElementById('compare-count');
const swapCountText = document.getElementById('swap-count');

// 현재 상태
let numbers = [];    // 화면에 보이는 배열
let steps = null;    // 정렬 제너레이터 (정렬 중이 아니면 null)
let timer = null;    // 자동 실행 타이머 (자동 실행 중이 아니면 null)
let compareCount = 0;   // 이번 정렬에서 비교한 횟수
let swapCount = 0;      // 이번 정렬에서 교환한 횟수


// ----- 버블 정렬 -----
// 이웃한 두 값을 비교해 앞이 더 크면 바꾼다. 한 바퀴 돌 때마다 가장 큰 값이 맨 뒤로 간다.
// yield하는 상태:
//   array      : 그 순간의 배열 (복사본)
//   compare    : 비교 중인 두 칸의 번호
//   swap       : 방금 바꾼 두 칸의 번호
//   sortedStart, sortedEnd : sortedStart 이상 sortedEnd 미만 번호는 자리가 확정됨
//                            (버블은 뒤쪽부터, 선택은 앞쪽부터 확정되므로 범위로 표시)
//   orderedEnd : 0 이상 orderedEnd 미만 번호는 순서만 맞고 아직 확정은 아님
//                (삽입 정렬에서만 쓴다. 없으면 표시하지 않는다)
//   message    : 화면에 보여 줄 설명
//   done       : 정렬이 끝났으면 true
function* bubbleSort(original) {
  const arr = original.slice();   // 원본을 건드리지 않도록 복사해서 정렬
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    // i바퀴가 끝나면 뒤에서 i개는 자리가 확정되어 있으므로 비교하지 않는다
    for (let j = 0; j < n - 1 - i; j++) {
      yield {
        array: arr.slice(),
        compare: [j, j + 1],
        sortedStart: n - i,
        sortedEnd: n,
        message: arr[j] + ' 와(과) ' + arr[j + 1] + ' 비교',
      };

      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;

        yield {
          array: arr.slice(),
          swap: [j, j + 1],
          sortedStart: n - i,
          sortedEnd: n,
          message: arr[j + 1] + ' 이(가) 더 커서 자리 교환',
        };
      }
    }
  }

  yield {
    array: arr.slice(),
    sortedStart: 0,
    sortedEnd: n,
    message: '정렬 완료!',
    done: true,
  };
}


// ----- 선택 정렬 -----
// 아직 정렬 안 된 부분에서 가장 작은 값을 찾아 맨 앞(i번)과 바꾼다.
// 한 바퀴 돌 때마다 앞에서부터 한 칸씩 자리가 확정된다.
// 비교 중 표시(compare)는 [지금까지의 최솟값 위치, 지금 보는 위치]
function* selectionSort(original) {
  const arr = original.slice();
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;   // 우선 i번을 최솟값으로 놓고 시작

    for (let j = i + 1; j < n; j++) {
      yield {
        array: arr.slice(),
        compare: [minIndex, j],
        sortedStart: 0,
        sortedEnd: i,
        message: '현재 최솟값 ' + arr[minIndex] + ' 와(과) ' + arr[j] + ' 비교',
      };

      if (arr[j] < arr[minIndex]) {
        minIndex = j;
      }
    }

    // 최솟값이 이미 i번에 있으면 바꿀 필요가 없다
    if (minIndex !== i) {
      const temp = arr[i];
      arr[i] = arr[minIndex];
      arr[minIndex] = temp;

      yield {
        array: arr.slice(),
        swap: [i, minIndex],
        sortedStart: 0,
        sortedEnd: i,
        message: '최솟값 ' + arr[i] + ' 을(를) ' + (i + 1) + '번째 자리로 이동',
      };
    }
  }

  yield {
    array: arr.slice(),
    sortedStart: 0,
    sortedEnd: n,
    message: '정렬 완료!',
    done: true,
  };
}


// ----- 삽입 정렬 -----
// i번 값을 앞쪽(0 ~ i-1)의 정렬된 부분에 끼워 넣는다.
// 앞의 값이 더 크면 한 칸씩 자리를 바꾸며 앞으로 옮기고, 앞의 값이 더 작아지면 멈춘다.
// 앞쪽은 순서만 맞을 뿐 나중에 값이 끼어들 수 있으므로, 확정(초록) 대신 orderedEnd(연한 초록)로 표시한다.
// 옮기고 있는 값은 항상 비교·교환 색으로 칠해지므로, 0 ~ i번 전체를 정렬된 앞부분으로 칠해도 된다.
function* insertionSort(original) {
  const arr = original.slice();
  const n = arr.length;

  for (let i = 1; i < n; i++) {
    let j = i;   // 지금 옮기고 있는 값의 위치

    while (j > 0) {
      yield {
        array: arr.slice(),
        compare: [j - 1, j],
        sortedStart: 0,
        sortedEnd: 0,
        orderedEnd: i + 1,
        message: arr[j - 1] + ' 와(과) ' + arr[j] + ' 비교',
      };

      if (arr[j - 1] > arr[j]) {
        const temp = arr[j - 1];
        arr[j - 1] = arr[j];
        arr[j] = temp;

        yield {
          array: arr.slice(),
          swap: [j - 1, j],
          sortedStart: 0,
          sortedEnd: 0,
          orderedEnd: i + 1,
          message: arr[j - 1] + ' 을(를) 앞으로 한 칸 이동',
        };

        j--;
      } else {
        break;   // 앞의 값이 더 작으면 제자리를 찾은 것
      }
    }
  }

  yield {
    array: arr.slice(),
    sortedStart: 0,
    sortedEnd: n,
    message: '정렬 완료!',
    done: true,
  };
}


// ----- 막대 그리기 -----
// state는 정렬 함수가 yield한 상태와 같은 모양이다
function renderBars(state) {
  barsBox.innerHTML = '';   // 기존 막대를 모두 지우고 새로 그린다

  for (let i = 0; i < state.array.length; i++) {
    const value = state.array[i];
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = (value / state.array.length * 100) + '%';
    bar.title = value;   // 마우스를 올리면 값이 보인다

    if (state.orderedEnd !== undefined && i < state.orderedEnd) {
      bar.classList.add('ordered');
    }
    if (i >= state.sortedStart && i < state.sortedEnd) {
      bar.classList.add('sorted');
    }
    if (state.compare && state.compare.includes(i)) {
      bar.classList.add('compare');
    }
    if (state.swap && state.swap.includes(i)) {
      bar.classList.add('swap');
    }

    barsBox.appendChild(bar);
  }
}


// ----- 비교·교환 횟수 -----
function showCounts() {
  compareCountText.textContent = compareCount;
  swapCountText.textContent = swapCount;
}

// 새 정렬을 시작하거나 진행을 버릴 때 0으로 되돌린다
function resetCounts() {
  compareCount = 0;
  swapCount = 0;
  showCounts();
}


// ----- 배열 만들기 -----
// 입력값이 범위를 벗어나면 5~50 안으로 맞춰 준다
function readSize() {
  let size = Number(sizeInput.value);
  if (!Number.isInteger(size) || size < MIN_SIZE) {
    size = MIN_SIZE;
  }
  if (size > MAX_SIZE) {
    size = MAX_SIZE;
  }
  sizeInput.value = size;
  return size;
}

// 1 ~ n까지의 값을 가진 배열 만들고 섞어서 반환
function makeRandomArray(size) {
  const arr = [];
  for (let i = 0; i < size; i++) {
    arr.push(i + 1);
  }
  for (let i = size - 1; i > 0; i--) {
    const randomNumber = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[randomNumber];
    arr[randomNumber] = temp;
  }
  return arr;
}

function resetArray() {
  const size = readSize();
  numbers = makeRandomArray(size);
  steps = null;   // 새 배열이므로 진행 중이던 정렬은 버린다
  runBtn.textContent = '실행';
  resetCounts();
  renderBars({ array: numbers, sortedStart: 0, sortedEnd: 0 });
  message.textContent = '실행 또는 한 단계를 눌러 보세요.';
}

// 알고리즘을 바꾸면 진행 중이던 단계는 버리고 지금 배열을 색 없이 다시 보여 준다
function changeAlgorithm() {
  algoTitle.textContent = algoSelect.options[algoSelect.selectedIndex].text;
  // "순서만 맞음" 색은 삽입 정렬에서만 쓰므로 그때만 범례에 보인다
  orderedLegend.hidden = (algoSelect.value !== 'insertion');
  steps = null;
  runBtn.textContent = '실행';
  resetCounts();
  renderBars({ array: numbers, sortedStart: 0, sortedEnd: 0 });
  message.textContent = '실행 또는 한 단계를 눌러 보세요.';
}


// ----- 단계 실행 -----
// 실행 중에는 입력 관련 버튼을 모두 막고, 일시정지 버튼만 켠다
// (속도 조절은 실행 중에도 바꿀 수 있게 막지 않는다)
function setRunning(running) {
  algoSelect.disabled = running;
  sizeInput.disabled = running;
  randomBtn.disabled = running;
  runBtn.disabled = running;
  stepBtn.disabled = running;
  pauseBtn.disabled = !running;
}

// 속도 입력값(1~5)에 맞는 간격(ms)
function getDelay() {
  return SPEED_DELAYS[Number(speedInput.value) - 1];
}

// 자동 실행 타이머를 지금 속도로 시작한다
function startTimer() {
  timer = setInterval(doStep, getDelay());
}

// 타이머만 멈춘다. 제너레이터(steps)는 그대로 두므로 실행·한 단계로 이어서 진행할 수 있다
function stopTimer() {
  clearInterval(timer);
  timer = null;
}

// 정렬 중이 아니면 고른 알고리즘으로 새 제너레이터를 만든다
function prepareSteps() {
  if (steps !== null) {
    return;
  }

  // 새 정렬을 시작하므로 횟수를 0부터 센다 (끝난 뒤 다시 실행할 때도 여기로 온다)
  resetCounts();

  if (algoSelect.value === 'bubble') {
    steps = bubbleSort(numbers);
  } else if (algoSelect.value === 'selection') {
    steps = selectionSort(numbers);
  } else if (algoSelect.value === 'insertion') {
    steps = insertionSort(numbers);
  }
}

// 제너레이터에서 다음 상태를 하나 꺼내 화면에 반영한다
function doStep() {
  const result = steps.next();
  const state = result.value;

  // 비교 중 상태가 나오면 비교 1회, 교환 상태가 나오면 교환 1회로 센다
  if (state.compare) {
    compareCount++;
  }
  if (state.swap) {
    swapCount++;
  }
  showCounts();

  renderBars(state);
  message.textContent = state.message;
  numbers = state.array;

  if (state.done) {
    finish();
  }
}

function finish() {
  stopTimer();
  steps = null;
  runBtn.textContent = '실행';
  setRunning(false);
}


// ----- 버튼 연결 -----
algoSelect.addEventListener('change', changeAlgorithm);
randomBtn.addEventListener('click', resetArray);

// 처음 실행이면 새로 시작하고, 일시정지 후라면 멈춘 곳부터 이어서 진행한다
runBtn.addEventListener('click', function () {
  prepareSteps();
  setRunning(true);
  startTimer();
});

// 일시정지하면 실행 버튼이 "재개"로 바뀐다. 진행이 끝나거나 처음부터 다시 하게 되면 "실행"으로 돌아온다
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

stepBtn.addEventListener('click', function () {
  prepareSteps();
  doStep();
});

// 처음 페이지를 열었을 때 배열 하나를 만들어 둔다
resetArray();
// 새로고침하면 브라우저가 선택 칸 값을 기억할 수 있으므로 제목·범례를 그 값에 맞춘다
changeAlgorithm();
