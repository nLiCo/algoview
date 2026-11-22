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
const pivotLegend = document.getElementById('pivot-legend');
const quickBlockLegend = document.getElementById('quick-block-legend');
const quickGroupLegend = document.getElementById('quick-group-legend');
const blockLegend = document.getElementById('block-legend');
const groupLegend = document.getElementById('group-legend');
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
// yield하는 상태 (모든 정렬이 같은 모양을 쓴다):
//   array   : 그 순간의 배열 (복사본)
//   compare : 비교 중인 칸 번호 목록
//   swap    : 방금 바꾼 칸 번호 목록
//   sorted  : 칸마다 true/false. true인 칸은 자리가 확정됨 (없으면 표시하지 않는다)
//   ordered : 칸마다 true/false. true인 칸은 순서만 맞고 아직 확정은 아님 (삽입·병합 정렬만)
//   message : 화면에 보여 줄 설명
//   done    : 정렬이 끝났으면 true
// 정렬마다 따로 쓰는 상태(pivot, blockStart 등)는 그 정렬의 설명에 적어 두었다.
function* bubbleSort(original) {
  const arr = original.slice();   // 원본을 건드리지 않도록 복사해서 정렬
  const n = arr.length;
  const sorted = new Array(n).fill(false);   // 처음에는 확정된 칸이 없다

  for (let i = 0; i < n - 1; i++) {
    // i바퀴가 끝나면 뒤에서 i개는 자리가 확정되어 있으므로 비교하지 않는다
    for (let j = 0; j < n - 1 - i; j++) {
      yield {
        array: arr.slice(),
        compare: [j, j + 1],
        sorted: sorted.slice(),
        message: arr[j] + ' 와(과) ' + arr[j + 1] + ' 비교',
      };

      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;

        yield {
          array: arr.slice(),
          swap: [j, j + 1],
          sorted: sorted.slice(),
          message: arr[j + 1] + ' 이(가) 더 커서 자리 교환',
        };
      }
    }

    // 이번 바퀴에서 가장 큰 값이 맨 뒤(n-1-i번)로 왔으므로 그 칸은 자리 확정
    sorted[n - 1 - i] = true;
  }

  yield {
    array: arr.slice(),
    sorted: new Array(n).fill(true),
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
  const sorted = new Array(n).fill(false);

  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;   // 우선 i번을 최솟값으로 놓고 시작

    for (let j = i + 1; j < n; j++) {
      yield {
        array: arr.slice(),
        compare: [minIndex, j],
        sorted: sorted.slice(),
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
        sorted: sorted.slice(),
        message: '최솟값 ' + arr[i] + ' 을(를) ' + (i + 1) + '번째 자리로 이동',
      };
    }

    // 최솟값이 i번에 들어왔으므로 그 칸은 자리 확정
    sorted[i] = true;
  }

  yield {
    array: arr.slice(),
    sorted: new Array(n).fill(true),
    message: '정렬 완료!',
    done: true,
  };
}


// ----- 삽입 정렬 -----
// i번 값을 앞쪽(0 ~ i-1)의 정렬된 부분에 끼워 넣는다.
// 앞의 값이 더 크면 한 칸씩 자리를 바꾸며 앞으로 옮기고, 앞의 값이 더 작아지면 멈춘다.
// 앞쪽은 순서만 맞을 뿐 나중에 값이 끼어들 수 있으므로, 확정(sorted, 초록) 대신 ordered(연한 초록)로 표시한다.
// 옮기고 있는 값은 항상 비교·교환 색으로 칠해지므로, 0 ~ i번 전체를 정렬된 앞부분으로 칠해도 된다.
function* insertionSort(original) {
  const arr = original.slice();
  const n = arr.length;
  const ordered = new Array(n).fill(false);
  ordered[0] = true;   // 한 칸짜리 앞부분은 처음부터 순서가 맞다

  for (let i = 1; i < n; i++) {
    ordered[i] = true;   // 이번 바퀴부터 0 ~ i번이 정렬된 앞부분이다
    let j = i;           // 지금 옮기고 있는 값의 위치

    while (j > 0) {
      yield {
        array: arr.slice(),
        compare: [j - 1, j],
        ordered: ordered.slice(),
        message: arr[j - 1] + ' 와(과) ' + arr[j] + ' 비교',
      };

      if (arr[j - 1] > arr[j]) {
        const temp = arr[j - 1];
        arr[j - 1] = arr[j];
        arr[j] = temp;

        yield {
          array: arr.slice(),
          swap: [j - 1, j],
          ordered: ordered.slice(),
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
    sorted: new Array(n).fill(true),
    message: '정렬 완료!',
    done: true,
  };
}


// ----- 병합 정렬 -----
// 배열을 반으로 나눠 각각 정렬한 뒤, 정렬된 두 묶음을 앞에서부터 비교하며 하나로 합친다.
// 보통은 임시 배열에 합친 뒤 다시 옮겨 쓰지만, 그 과정을 그대로 그리면 같은 값의 막대가
// 두 개 보이게 된다. 그래서 여기서는 배열 안에서 바로 합친다:
//   오른쪽 값이 더 작으면 그 값을 앞으로 가져오고, 왼쪽 묶음의 남은 값들을 한 칸씩 뒤로 민다.
// 이렇게 하면 화면의 막대는 언제나 1 ~ n이 한 개씩이다.
// 교환은 오른쪽 값이 앞으로 끼어들어 값이 실제로 움직였을 때만 1회로 센다 (swap: [값이 들어간 칸])
// 추가로 yield하는 상태:
//   ordered : 칸마다 true/false. true인 칸은 합치는 중인 결과의 앞부분(순서만 맞음)
//   blockStart : 칸마다 true/false. true인 칸에서 새 묶음(정렬된 작은 배열)이 시작한다.
//                처음에는 한 칸짜리 묶음 n개이고, 두 묶음을 합치기 시작하면 한 묶음이 된다
//   leftGroup, rightGroup : [시작, 끝] (끝 번호 포함). 합치고 있는 왼쪽·오른쪽 묶음 중 아직 합치지 않은 값의 범위.
//                           시작이 끝보다 크면 그 묶음은 다 쓴 것이다
function* mergeSort(original) {
  const arr = original.slice();
  const n = arr.length;
  const ordered = new Array(n).fill(false);
  const blockStart = new Array(n).fill(true);   // 처음에는 한 칸짜리 묶음 n개

  // 제너레이터 안에서 다른 제너레이터의 단계를 이어서 내보낼 때는 yield*를 쓴다
  yield* mergeSortRange(arr, 0, n - 1, ordered, blockStart);

  yield {
    array: arr.slice(),
    sorted: new Array(n).fill(true),
    message: '정렬 완료!',
    done: true,
  };
}

// left번 ~ right번 구간을 정렬한다 (자기 자신을 다시 부르는 재귀)
function* mergeSortRange(arr, left, right, ordered, blockStart) {
  if (left >= right) {
    return;   // 한 칸짜리는 이미 정렬된 것
  }

  const mid = Math.floor((left + right) / 2);
  yield* mergeSortRange(arr, left, mid, ordered, blockStart);
  yield* mergeSortRange(arr, mid + 1, right, ordered, blockStart);
  yield* merge(arr, left, mid, right, ordered, blockStart);
}

// 정렬된 두 묶음 left ~ mid, mid+1 ~ right를 합친다
function* merge(arr, left, mid, right, ordered, blockStart) {
  let k = left;        // 합친 결과에서 다음에 채울 칸. 왼쪽 묶음에 남은 값은 항상 k번 ~ leftEnd번에 있다
  let leftEnd = mid;   // 왼쪽 묶음의 마지막 칸 (오른쪽 값이 끼어들 때마다 한 칸 뒤로 밀린다)
  let j = mid + 1;     // 오른쪽 묶음에서 다음에 볼 칸

  // 이 구간은 지금부터 새로 합치므로 "순서만 맞음" 표시를 지우고,
  // 두 묶음을 한 묶음으로 만든다 (묶음 시작은 left번 하나만 남긴다)
  for (let i = left; i <= right; i++) {
    ordered[i] = false;
    if (i > left) {
      blockStart[i] = false;
    }
  }

  // 두 묶음 모두 값이 남아 있는 동안, 두 묶음의 맨 앞 값끼리 비교한다
  while (k <= leftEnd && j <= right) {
    yield {
      array: arr.slice(),
      compare: [k, j],
      ordered: ordered.slice(),
      blockStart: blockStart.slice(),
      leftGroup: [k, leftEnd],
      rightGroup: [j, right],
      message: '왼쪽 ' + arr[k] + ' 와(과) 오른쪽 ' + arr[j] + ' 비교',
    };

    if (arr[j] < arr[k]) {
      // 오른쪽 값을 k번으로 가져오고, k번 ~ j-1번 값은 한 칸씩 뒤로 민다
      const value = arr[j];
      for (let m = j; m > k; m--) {
        arr[m] = arr[m - 1];
      }
      arr[k] = value;
      leftEnd++;
      j++;
      ordered[k] = true;

      // 값이 실제로 움직였으므로 교환 1회 (swap에는 값이 들어간 칸 하나만 담는다)
      yield {
        array: arr.slice(),
        swap: [k],
        ordered: ordered.slice(),
        blockStart: blockStart.slice(),
        leftGroup: [k + 1, leftEnd],
        rightGroup: [j, right],
        message: '오른쪽 ' + value + ' 이(가) 더 작아서 ' + (k + 1) + '번째 자리로 가져오고, 왼쪽 값들을 한 칸씩 뒤로 민다',
      };
    } else {
      // 왼쪽 값이 이미 제자리이므로 움직이지 않는다 (교환 아님)
      ordered[k] = true;

      yield {
        array: arr.slice(),
        ordered: ordered.slice(),
        blockStart: blockStart.slice(),
        leftGroup: [k + 1, leftEnd],
        rightGroup: [j, right],
        message: '왼쪽 ' + arr[k] + ' 이(가) 더 작아서 그대로 둔다',
      };
    }

    k++;
  }

  // 한쪽 묶음을 다 쓰면, 다른 쪽에 남은 값은 이미 순서대로 제자리에 있다
  for (let i = k; i <= right; i++) {
    ordered[i] = true;
  }

  yield {
    array: arr.slice(),
    ordered: ordered.slice(),
    blockStart: blockStart.slice(),
    message: '남은 값은 이미 제자리에 있으므로 그대로 둔다 (' + (left + 1) + '~' + (right + 1) + '번째 합치기 끝)',
  };
}


// ----- 퀵 정렬 -----
// 구간의 맨 끝 값을 피벗(기준값)으로 정하고, 피벗보다 작은 값은 앞으로, 큰 값은 뒤로 모은다(분할).
// 그 사이에 피벗을 넣으면 피벗은 자리가 확정되고, 피벗 앞뒤 구간을 같은 방법으로 다시 정렬한다.
// 자리가 확정되는 칸이 여기저기 흩어져 생긴다 (sorted 목록이라 그대로 표시할 수 있다).
// 추가로 yield하는 상태:
//   pivot  : 피벗이 있는 칸 번호
//   blockStart : 병합 정렬과 같은 뜻. 자리 확정 칸으로 나뉜 "아직 정렬 안 된 구간"이 묶음이다
//   leftGroup, rightGroup : [시작, 끝] (끝 번호 포함). 분할 중인 구간에서 피벗보다 작은 값·큰 값의 범위
// 비교 중 표시(compare)는 피벗과 비교하는 칸 하나만 담는다 (피벗은 피벗 색으로 따로 보인다)
function* quickSort(original) {
  const arr = original.slice();
  const n = arr.length;
  const sorted = new Array(n).fill(false);

  yield* quickSortRange(arr, 0, n - 1, sorted);

  yield {
    array: arr.slice(),
    sorted: new Array(n).fill(true),
    message: '정렬 완료!',
    done: true,
  };
}

// 자리 확정 칸 바로 뒤에서 새 묶음이 시작한다 (확정 칸 자체는 묶음에 넣지 않는다)
function makeQuickBlockStart(sorted) {
  const blockStart = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i]) {
      blockStart.push(false);
    } else if (i === 0 || sorted[i - 1]) {
      blockStart.push(true);
    } else {
      blockStart.push(false);
    }
  }
  return blockStart;
}

// low번 ~ high번 구간을 정렬한다 (자기 자신을 다시 부르는 재귀)
function* quickSortRange(arr, low, high, sorted) {
  if (low > high) {
    return;   // 빈 구간
  }

  if (low === high) {
    // 한 칸짜리 구간은 그 자리가 곧 최종 자리다
    sorted[low] = true;
    yield {
      array: arr.slice(),
      sorted: sorted.slice(),
      blockStart: makeQuickBlockStart(sorted),
      message: '한 칸짜리 구간의 ' + arr[low] + ' 은(는) 자리 확정',
    };
    return;
  }

  // partition이 return한 피벗의 최종 위치를 yield*가 돌려준다
  const p = yield* partition(arr, low, high, sorted);
  yield* quickSortRange(arr, low, p - 1, sorted);
  yield* quickSortRange(arr, p + 1, high, sorted);
}

// low번 ~ high번 구간을 high번 값(피벗) 기준으로 나누고, 피벗이 들어간 칸 번호를 돌려준다
function* partition(arr, low, high, sorted) {
  const pivotValue = arr[high];
  let i = low;   // 피벗보다 작은 값을 다음에 넣을 칸
  // 분할하는 동안 low ~ i-1번은 피벗보다 작은 값, i ~ j-1번은 피벗보다 큰 값, j ~ high-1번은 아직 안 본 값이다

  for (let j = low; j < high; j++) {
    yield {
      array: arr.slice(),
      compare: [j],
      pivot: high,
      sorted: sorted.slice(),
      blockStart: makeQuickBlockStart(sorted),
      leftGroup: [low, i - 1],
      rightGroup: [i, j - 1],
      message: arr[j] + ' 와(과) 피벗 ' + pivotValue + ' 비교',
    };

    if (arr[j] < pivotValue) {
      // 피벗보다 작은 값은 앞쪽(i번)으로 보낸다. 이미 i번에 있으면 바꿀 필요가 없다
      if (i !== j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;

        yield {
          array: arr.slice(),
          swap: [i, j],
          pivot: high,
          sorted: sorted.slice(),
          blockStart: makeQuickBlockStart(sorted),
          leftGroup: [low, i],
          rightGroup: [i + 1, j],
          message: arr[i] + ' 이(가) 피벗보다 작아서 앞쪽으로 교환',
        };
      }
      i++;
    }
  }

  // 작은 값들 바로 뒤(i번)에 피벗을 넣는다
  if (i !== high) {
    const temp = arr[i];
    arr[i] = arr[high];
    arr[high] = temp;

    yield {
      array: arr.slice(),
      swap: [i, high],
      sorted: sorted.slice(),
      blockStart: makeQuickBlockStart(sorted),
      leftGroup: [low, i - 1],
      rightGroup: [i + 1, high],
      message: '피벗 ' + pivotValue + ' 을(를) 작은 값들 바로 뒤(' + (i + 1) + '번째)로 교환',
    };
  }

  // 피벗 앞은 모두 작고 뒤는 모두 크므로 피벗의 자리는 확정이다
  sorted[i] = true;
  yield {
    array: arr.slice(),
    sorted: sorted.slice(),
    blockStart: makeQuickBlockStart(sorted),
    leftGroup: [low, i - 1],
    rightGroup: [i + 1, high],
    message: '피벗 ' + pivotValue + ' 은(는) 자리 확정. 앞뒤 구간을 따로 정렬한다',
  };

  return i;
}


// ----- 막대 그리기 -----
// state는 정렬 함수가 yield한 상태와 같은 모양이다
// 막대마다 칸(slot)을 하나씩 만들고 그 안에 막대를 넣는다. 칸의 배경색으로 병합 정렬의 묶음을 보여 준다
// (묶음은 회색, 병합 정렬에서 합치는 두 묶음 / 퀵 정렬에서 피벗보다 작은·큰 값은 파랑·주황)
function renderBars(state) {
  barsBox.innerHTML = '';   // 기존 막대를 모두 지우고 새로 그린다

  for (let i = 0; i < state.array.length; i++) {
    const value = state.array[i];

    const slot = document.createElement('div');
    slot.className = 'slot';
    // 자리 확정 칸(퀵 정렬의 피벗)은 묶음에 넣지 않는다
    const confirmed = state.sorted && state.sorted[i];
    const prevConfirmed = state.sorted && state.sorted[i - 1];
    if (state.blockStart && !confirmed) {
      slot.classList.add('group');
      // 바로 앞 칸도 묶음일 때만 틈을 둔다 (앞 칸이 확정 칸이면 이미 떨어져 보인다)
      if (i > 0 && state.blockStart[i] && !prevConfirmed) {
        slot.classList.add('group-start');
      }
    }
    if (state.leftGroup && i >= state.leftGroup[0] && i <= state.leftGroup[1]) {
      slot.classList.add('group-left');
    }
    if (state.rightGroup && i >= state.rightGroup[0] && i <= state.rightGroup[1]) {
      slot.classList.add('group-right');
    }

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = (value / state.array.length * 100) + '%';
    bar.title = value;   // 마우스를 올리면 값이 보인다

    if (state.ordered && state.ordered[i]) {
      bar.classList.add('ordered');
    }
    if (state.sorted && state.sorted[i]) {
      bar.classList.add('sorted');
    }
    if (state.pivot === i) {
      bar.classList.add('pivot');
    }
    if (state.compare && state.compare.includes(i)) {
      bar.classList.add('compare');
    }
    if (state.swap && state.swap.includes(i)) {
      bar.classList.add('swap');
    }

    slot.appendChild(bar);
    barsBox.appendChild(slot);
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
  renderBars({ array: numbers });
  message.textContent = '실행 또는 한 단계를 눌러 보세요.';
}

// 알고리즘을 바꾸면 진행 중이던 단계는 버리고 지금 배열을 색 없이 다시 보여 준다
function changeAlgorithm() {
  algoTitle.textContent = algoSelect.options[algoSelect.selectedIndex].text;
  // "순서만 맞음" 색은 삽입·병합 정렬에서만, 피벗 색은 퀵 정렬에서만, 묶음 색은 병합 정렬에서만 쓰므로 그때만 범례에 보인다
  if (algoSelect.value === 'insertion' || algoSelect.value === 'merge') {
    orderedLegend.hidden = false;
  } else {
    orderedLegend.hidden = true;
  }
  pivotLegend.hidden = (algoSelect.value !== 'quick');
  quickBlockLegend.hidden = (algoSelect.value !== 'quick');
  quickGroupLegend.hidden = (algoSelect.value !== 'quick');
  blockLegend.hidden = (algoSelect.value !== 'merge');
  groupLegend.hidden = (algoSelect.value !== 'merge');
  steps = null;
  runBtn.textContent = '실행';
  resetCounts();
  renderBars({ array: numbers });
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
  } else if (algoSelect.value === 'merge') {
    steps = mergeSort(numbers);
  } else if (algoSelect.value === 'quick') {
    steps = quickSort(numbers);
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
