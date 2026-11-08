// ===== 정렬 시각화 =====
// 구조: 정렬 함수(제너레이터)가 한 단계마다 "지금 상태"를 yield로 내보내고,
//       바깥의 doStep()이 next()로 그 상태를 하나씩 꺼내 막대를 다시 그린다.

const MIN_SIZE = 5;
const MAX_SIZE = 50;
const DELAY = 300;       // 자동 실행 시 한 단계 간격(ms). 속도 조절은 3주차에 추가

// 화면 요소
const sizeInput = document.getElementById('size-input');
const randomBtn = document.getElementById('random-btn');
const runBtn = document.getElementById('run-btn');
const stepBtn = document.getElementById('step-btn');
const barsBox = document.getElementById('bars');
const message = document.getElementById('message');

// 현재 상태
let numbers = [];    // 화면에 보이는 배열
let steps = null;    // 정렬 제너레이터 (정렬 중이 아니면 null)
let timer = null;    // 자동 실행 타이머 (자동 실행 중이 아니면 null)


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

    if (i >= state.sortedFrom) {
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
  renderBars({ array: numbers, sortedFrom: numbers.length });
  message.textContent = '실행 또는 한 단계를 눌러 보세요.';
}


// ----- 단계 실행 -----
// 실행 중에는 입력 관련 버튼을 모두 막는다
function setRunning(running) {
  sizeInput.disabled = running;
  randomBtn.disabled = running;
  runBtn.disabled = running;
  stepBtn.disabled = running;
}

// 정렬 중이 아니면 현재 배열로 새 제너레이터를 만든다
function prepareSteps() {
  if (steps === null) {
    steps = bubbleSort(numbers);
  }
}

// 제너레이터에서 다음 상태를 하나 꺼내 화면에 반영한다
function doStep() {
  const result = steps.next();
  const state = result.value;

  renderBars(state);
  message.textContent = state.message;
  numbers = state.array;

  if (state.done) {
    finish();
  }
}

function finish() {
  clearInterval(timer);
  timer = null;
  steps = null;
  setRunning(false);
}


// ----- 버튼 연결 -----
randomBtn.addEventListener('click', resetArray);

runBtn.addEventListener('click', function () {
  prepareSteps();
  setRunning(true);
  timer = setInterval(doStep, DELAY);
});

stepBtn.addEventListener('click', function () {
  prepareSteps();
  doStep();
});

// 처음 페이지를 열었을 때 배열 하나를 만들어 둔다
resetArray();
