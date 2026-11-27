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
const algoLegends = document.querySelectorAll('.legend li[data-algos]');   // 특정 알고리즘에서만 보이는 범례
const sizeInput = document.getElementById('size-input');
const randomBtn = document.getElementById('random-btn');
const runBtn = document.getElementById('run-btn');
const pauseBtn = document.getElementById('pause-btn');
const stepBtn = document.getElementById('step-btn');
const speedInput = document.getElementById('speed-input');
const barsBox = document.getElementById('bars');
const message = document.getElementById('message');
const codeLists = document.querySelectorAll('.code');   // 알고리즘별 의사코드 목록
const codeVars = document.getElementById('code-vars');
const codeScroll = document.getElementById('code-scroll');   // 의사코드의 스크롤되는 부분
const compareCountText = document.getElementById('compare-count');
const swapCountText = document.getElementById('swap-count');

// 현재 상태
let numbers = [];    // 화면에 보이는 배열
let steps = null;    // 정렬 제너레이터 (정렬 중이 아니면 null)
let timer = null;    // 자동 실행 타이머 (자동 실행 중이 아니면 null)
let compareCount = 0;   // 이번 정렬에서 비교한 횟수
let swapCount = 0;      // 이번 정렬에서 교환한 횟수


// ----- 공통 도우미 -----
// 배열에서 a번과 b번 값을 맞바꾼다 (정렬과 무작위 섞기에서 같이 쓴다)
function swapItems(arr, a, b) {
  const temp = arr[a];
  arr[a] = arr[b];
  arr[b] = temp;
}


// ----- 버블 정렬 -----
// 이웃한 두 값을 비교해 앞이 더 크면 바꾼다. 한 바퀴 돌 때마다 가장 큰 값이 맨 뒤로 간다.
// yield하는 상태 (모든 정렬이 같은 모양을 쓴다):
//   array   : 그 순간의 배열 (복사본)
//   compare : 비교 중인 칸 번호 목록
//   swap    : 방금 바꾼 칸 번호 목록
//   sorted  : 칸마다 true/false. true인 칸은 자리가 확정됨 (없으면 표시하지 않는다)
//   ordered : 칸마다 true/false. true인 칸은 순서만 맞고 아직 확정은 아님 (삽입·병합 정렬만)
//   lines   : 이번 단계에서 실행된 의사코드 줄 번호 목록 (1부터. 없으면 강조하지 않는다)
//             막대가 움직이지 않는 줄(반복문, i = i + 1 등)도 함께 실행됐다면 같이 담는다
//   vars    : 의사코드 아래에 보여 줄 변수 값 (예: { n: 10, i: 2, j: 5 }. 없으면 비운다)
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
      // 바퀴의 첫 비교는 바깥 반복(1번 줄)부터 지나오고, 그다음부터는 안쪽 반복(2번 줄)만 지나온다
      let lines = [2, 3];
      if (j === 0) {
        lines = [1, 2, 3];
      }

      yield {
        array: arr.slice(),
        compare: [j, j + 1],
        sorted: sorted.slice(),
        lines: lines,
        vars: { n: n, i: i, j: j },
        message: arr[j] + ' 와(과) ' + arr[j + 1] + ' 비교',
      };

      if (arr[j] > arr[j + 1]) {
        swapItems(arr, j, j + 1);

        yield {
          array: arr.slice(),
          swap: [j, j + 1],
          sorted: sorted.slice(),
          lines: [4],
          vars: { n: n, i: i, j: j },
          message: arr[j + 1] + ' 이(가) 더 커서 자리 교환',
        };
      }
    }

    // 이번 바퀴에서 가장 큰 값이 맨 뒤(n-1-i번)로 왔으므로 그 칸은 자리 확정
    sorted[n - 1 - i] = true;
    yield {
      array: arr.slice(),
      sorted: sorted.slice(),
      lines: [5],
      vars: { n: n, i: i },
      message: arr[n - 1 - i] + ' 은(는) ' + (n - i) + '번째 자리 확정',
    };
  }

  yield {
    array: arr.slice(),
    sorted: new Array(n).fill(true),
    lines: [6],
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
      // 바퀴의 첫 비교는 바깥 반복(1번 줄)과 minIndex 준비(2번 줄)부터 지나오고, 그다음부터는 안쪽 반복(3번 줄)만 지나온다
      let lines = [3, 4];
      if (j === i + 1) {
        lines = [1, 2, 3, 4];
      }

      yield {
        array: arr.slice(),
        compare: [minIndex, j],
        sorted: sorted.slice(),
        lines: lines,
        vars: { n: n, i: i, j: j, minIndex: minIndex },
        message: '현재 최솟값 ' + arr[minIndex] + ' 와(과) ' + arr[j] + ' 비교',
      };

      if (arr[j] < arr[minIndex]) {
        // 막대는 움직이지 않지만 minIndex가 바뀌므로 단계를 하나 보여 준다 (5번 줄)
        minIndex = j;

        yield {
          array: arr.slice(),
          sorted: sorted.slice(),
          lines: [5],
          vars: { n: n, i: i, j: j, minIndex: minIndex },
          message: arr[minIndex] + ' 이(가) 더 작아서 새 최솟값이 된다',
        };
      }
    }

    // 최솟값이 이미 i번에 있으면 바꿀 필요가 없다
    const swapped = (minIndex !== i);
    if (swapped) {
      swapItems(arr, i, minIndex);

      yield {
        array: arr.slice(),
        swap: [i, minIndex],
        sorted: sorted.slice(),
        lines: [6, 7],
        vars: { n: n, i: i, minIndex: minIndex },
        message: '최솟값 ' + arr[i] + ' 을(를) ' + (i + 1) + '번째 자리로 이동',
      };
    }

    // 최솟값이 i번에 들어왔으므로 그 칸은 자리 확정
    // 교환하지 않았으면 6번 줄(조건 확인)도 이 단계에서 지나온 것으로 칠한다
    let confirmLines = [8];
    if (!swapped) {
      confirmLines = [6, 8];
    }

    sorted[i] = true;
    yield {
      array: arr.slice(),
      sorted: sorted.slice(),
      lines: confirmLines,
      vars: { n: n, i: i },
      message: arr[i] + ' 은(는) ' + (i + 1) + '번째 자리 확정',
    };
  }

  yield {
    array: arr.slice(),
    sorted: new Array(n).fill(true),
    lines: [9],
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
      // 바퀴의 첫 비교는 바깥 반복(1번 줄)과 j 준비(2번 줄)부터 지나오고, 그다음부터는 while(3번 줄)만 지나온다
      let lines = [3, 4];
      if (j === i) {
        lines = [1, 2, 3, 4];
      }

      yield {
        array: arr.slice(),
        compare: [j - 1, j],
        ordered: ordered.slice(),
        lines: lines,
        vars: { n: n, i: i, j: j },
        message: arr[j - 1] + ' 와(과) ' + arr[j] + ' 비교',
      };

      if (arr[j - 1] > arr[j]) {
        // 앞의 값과 바꾸고 j를 1 줄인다 (5·6번 줄)
        // 보여 주는 j는 줄인 뒤의 값이므로, 방금 바꾼 두 칸은 j번과 j+1번이다
        swapItems(arr, j - 1, j);
        j--;

        yield {
          array: arr.slice(),
          swap: [j, j + 1],
          ordered: ordered.slice(),
          lines: [5, 6],
          vars: { n: n, i: i, j: j },
          message: arr[j] + ' 을(를) 앞으로 한 칸 이동하고, j를 1 줄인다',
        };
      } else {
        // 앞의 값이 더 작으면 제자리를 찾은 것 (7번 줄)
        yield {
          array: arr.slice(),
          ordered: ordered.slice(),
          lines: [7],
          vars: { n: n, i: i, j: j },
          message: arr[j] + ' 은(는) 제자리를 찾았으므로 반복을 멈춘다',
        };
        break;
      }
    }
  }

  yield {
    array: arr.slice(),
    sorted: new Array(n).fill(true),
    lines: [8],
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
    lines: [15],
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
    // 합치기의 첫 비교는 합치기 호출(6번 줄)과 준비(8번 줄)부터 지나오고, 그다음부터는 반복(9번 줄)만 지나온다
    let lines = [9, 10];
    if (k === left) {
      lines = [6, 8, 9, 10];
    }

    yield {
      array: arr.slice(),
      compare: [k, j],
      ordered: ordered.slice(),
      blockStart: blockStart.slice(),
      leftGroup: [k, leftEnd],
      rightGroup: [j, right],
      lines: lines,
      vars: { left: left, mid: mid, right: right, k: k, j: j },
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
      k++;   // 13번 줄. 보여 주는 k는 늘린 뒤의 값이므로, 방금 값이 들어간 칸은 k-1번이다

      // 값이 실제로 움직였으므로 교환 1회 (swap에는 값이 들어간 칸 하나만 담는다)
      yield {
        array: arr.slice(),
        swap: [k - 1],
        ordered: ordered.slice(),
        blockStart: blockStart.slice(),
        leftGroup: [k, leftEnd],
        rightGroup: [j, right],
        lines: [11, 13],
        vars: { left: left, mid: mid, right: right, k: k, j: j },
        message: '오른쪽 ' + value + ' 이(가) 더 작아서 ' + k + '번째 자리로 가져오고, 왼쪽 값들을 한 칸씩 뒤로 민다',
      };
    } else {
      // 왼쪽 값이 이미 제자리이므로 움직이지 않는다 (교환 아님)
      ordered[k] = true;
      k++;   // 13번 줄. 방금 그대로 둔 칸은 k-1번이다

      yield {
        array: arr.slice(),
        ordered: ordered.slice(),
        blockStart: blockStart.slice(),
        leftGroup: [k, leftEnd],
        rightGroup: [j, right],
        lines: [12, 13],
        vars: { left: left, mid: mid, right: right, k: k, j: j },
        message: '왼쪽 ' + arr[k - 1] + ' 이(가) 더 작아서 그대로 둔다',
      };
    }
  }

  // 한쪽 묶음을 다 쓰면, 다른 쪽에 남은 값은 이미 순서대로 제자리에 있다
  for (let i = k; i <= right; i++) {
    ordered[i] = true;
  }

  yield {
    array: arr.slice(),
    ordered: ordered.slice(),
    blockStart: blockStart.slice(),
    lines: [14],
    vars: { left: left, mid: mid, right: right },
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
    lines: [15],
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
      lines: [3],
      vars: { low: low, high: high },
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
    // 분할의 첫 비교는 partition 호출(4번 줄)과 피벗 준비(8번 줄)부터 지나오고, 그다음부터는 반복(9번 줄)만 지나온다
    let lines = [9, 10];
    if (j === low) {
      lines = [4, 8, 9, 10];
    }

    yield {
      array: arr.slice(),
      compare: [j],
      pivot: high,
      sorted: sorted.slice(),
      blockStart: makeQuickBlockStart(sorted),
      leftGroup: [low, i - 1],
      rightGroup: [i, j - 1],
      lines: lines,
      vars: { low: low, high: high, pivot: pivotValue, i: i, j: j },
      message: arr[j] + ' 와(과) 피벗 ' + pivotValue + ' 비교',
    };

    if (arr[j] < pivotValue) {
      // 피벗보다 작은 값은 앞쪽(i번)으로 보내고 i를 1 늘린다 (11·12번 줄)
      // 보여 주는 i는 늘린 뒤의 값이므로, 방금 값을 넣은 칸은 i-1번이다
      if (i !== j) {
        swapItems(arr, i, j);
        i++;

        yield {
          array: arr.slice(),
          swap: [i - 1, j],
          pivot: high,
          sorted: sorted.slice(),
          blockStart: makeQuickBlockStart(sorted),
          leftGroup: [low, i - 1],
          rightGroup: [i, j],
          lines: [11, 12],
          vars: { low: low, high: high, pivot: pivotValue, i: i, j: j },
          message: arr[i - 1] + ' 이(가) 피벗보다 작아서 앞쪽으로 교환하고, i를 1 늘린다',
        };
      } else {
        // 이미 i번(= j번)에 있으므로 교환은 하지 않고 i만 1 늘린다 (같은 칸끼리 교환은 아무 일도 안 한다)
        i++;

        yield {
          array: arr.slice(),
          pivot: high,
          sorted: sorted.slice(),
          blockStart: makeQuickBlockStart(sorted),
          leftGroup: [low, i - 1],
          rightGroup: [i, j],
          lines: [12],
          vars: { low: low, high: high, pivot: pivotValue, i: i, j: j },
          message: arr[j] + ' 은(는) 피벗보다 작지만 이미 앞쪽 끝에 있어서 i만 1 늘린다',
        };
      }
    }
  }

  // 작은 값들 바로 뒤(i번)에 피벗을 넣는다. 피벗이 이미 i번에 있으면 바꿀 필요가 없다
  const pivotMoved = (i !== high);
  if (pivotMoved) {
    swapItems(arr, i, high);

    yield {
      array: arr.slice(),
      swap: [i, high],
      sorted: sorted.slice(),
      blockStart: makeQuickBlockStart(sorted),
      leftGroup: [low, i - 1],
      rightGroup: [i + 1, high],
      lines: [13],
      vars: { low: low, high: high, pivot: pivotValue, i: i },
      message: '피벗 ' + pivotValue + ' 을(를) 작은 값들 바로 뒤(' + (i + 1) + '번째)로 교환',
    };
  }

  // 피벗 앞은 모두 작고 뒤는 모두 크므로 피벗의 자리는 확정이다
  // 피벗을 옮기지 않았으면 13번 줄(같은 칸끼리 교환)도 이 단계에서 지나온 것으로 칠한다
  let confirmLines = [14];
  if (!pivotMoved) {
    confirmLines = [13, 14];
  }

  sorted[i] = true;
  yield {
    array: arr.slice(),
    sorted: sorted.slice(),
    blockStart: makeQuickBlockStart(sorted),
    leftGroup: [low, i - 1],
    rightGroup: [i + 1, high],
    lines: confirmLines,
    vars: { low: low, high: high, pivot: pivotValue, i: i },
    message: '피벗 ' + pivotValue + ' 은(는) 자리 확정. 앞뒤 구간을 따로 정렬한다',
  };

  return i;
}


// ----- 막대 그리기 -----
// state는 정렬 함수가 yield한 상태와 같은 모양이다
// 막대마다 칸(slot)을 하나씩 만들고 그 안에 막대를 넣는다. 칸의 배경색으로 병합·퀵 정렬의 묶음을 보여 준다
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


// ----- 의사코드 -----
// showPseudocode(), showVars(), highlightLines(), scrollToLine()은 common.js에 있다


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
    swapItems(arr, i, randomNumber);
  }
  return arr;
}

// 진행 중이던 정렬을 버리고, 지금 배열을 색·강조·횟수 없이 처음 상태로 다시 보여 준다
function clearProgress() {
  steps = null;
  runBtn.textContent = '실행';
  resetCounts();
  renderBars({ array: numbers });
  highlightLines([]);
  showVars(null);
  message.textContent = '실행 또는 한 단계를 눌러 보세요.';
}

// 새 배열을 만든다. 새 배열이므로 진행 중이던 정렬은 버린다
function resetArray() {
  const size = readSize();
  numbers = makeRandomArray(size);
  clearProgress();
}

// 알고리즘을 바꾸면 제목·범례·의사코드를 그 알고리즘에 맞추고, 진행 중이던 단계는 버린다
function changeAlgorithm() {
  algoTitle.textContent = algoSelect.options[algoSelect.selectedIndex].text;
  // 범례 중 data-algos가 있는 것은 거기 적힌 알고리즘(공백으로 구분)을 골랐을 때만 보인다
  for (const item of algoLegends) {
    const algos = item.dataset.algos.split(' ');
    item.hidden = !algos.includes(algoSelect.value);
  }
  showPseudocode();
  clearProgress();
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

// getDelay(), startTimer(), stopTimer(), finish()는 common.js에 있다

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
  // 줄 번호가 없는 상태는 강조를 지운다
  if (state.lines) {
    highlightLines(state.lines);
  } else {
    highlightLines([]);
  }
  showVars(state.vars);
  message.textContent = state.message;
  numbers = state.array;

  if (state.done) {
    finish();
  }
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
