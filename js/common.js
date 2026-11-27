// ===== AlgoView 공용 기능 (sort.html, graph.html이 함께 쓴다) =====
// sort.js와 graph.js에 똑같이 들어 있던 함수를 한곳에 모았다.
// 이 함수들은 화면 요소나 상태를 매개변수로 넘겨받지 않고, 각 페이지의 스크립트(sort.js, graph.js)가 만들어 둔 변수를 이름으로 바로 쓴다.
// 그래서 HTML에서 common.js를 페이지 스크립트보다 먼저 불러와야 하고,
// 페이지 스크립트는 아래 이름을 같은 뜻으로 정의해 두어야 한다.
//   의사코드 상자: codeLists(의사코드 목록들), codeScroll(스크롤되는 부분), codeVars(변수 값 줄), algoSelect(알고리즘 선택창)
//   실행 제어:    speedInput(속도 입력), SPEED_DELAYS(속도별 간격), runBtn(실행 버튼), timer(타이머), steps(제너레이터)
//   함수:         doStep(), setRunning() - startTimer()와 finish()가 페이지의 이 함수들을 거꾸로 불러 쓴다


// ----- 의사코드 -----
// 고른 알고리즘의 의사코드 목록만 보이게 한다
function showPseudocode() {
  for (const list of codeLists) {
    list.hidden = (list.dataset.algo !== algoSelect.value);
  }
}

// 변수 값을 "이름 = 값 · 이름 = 값" 모양으로 보여 준다 (예: "n = 10 · i = 2 · j = 5"). vars가 없으면 비운다
function showVars(vars) {
  const parts = [];
  if (vars) {
    for (const name in vars) {
      parts.push(name + ' = ' + vars[name]);
    }
  }
  codeVars.textContent = parts.join(' · ');
}

// 보이는 의사코드에서 lines에 든 줄(1부터)을 모두 강조한다. 빈 목록이면 강조를 모두 지운다
function highlightLines(lines) {
  let lastItem = null;   // 강조한 줄 중 마지막 줄 (지금 하는 일에 가장 가까운 줄)
  for (const list of codeLists) {
    const items = list.querySelectorAll('li');
    for (let i = 0; i < items.length; i++) {
      if (!list.hidden && lines.includes(i + 1)) {
        items[i].classList.add('current');
        lastItem = items[i];
      } else {
        items[i].classList.remove('current');
      }
    }
  }
  scrollToLine(lastItem);
}

// 줄이 코드 영역에서 다 보이지 않을 때만, 그 줄이 가운데쯤 오도록 코드 영역만 스크롤한다
// (이미 보이는 줄이면 그대로 둔다. 페이지 전체는 움직이지 않는다)
// 줄이 없으면 맨 위로 돌린다
function scrollToLine(item) {
  if (item === null) {
    codeScroll.scrollTop = 0;
    return;
  }

  // 지금 코드 영역에 보이는 범위
  const viewTop = codeScroll.scrollTop;
  const viewBottom = codeScroll.scrollTop + codeScroll.clientHeight;
  const itemTop = item.offsetTop;
  const itemBottom = item.offsetTop + item.offsetHeight;
  if (itemTop >= viewTop && itemBottom <= viewBottom) {
    return;   // 이미 잘 보인다
  }

  // 줄의 위쪽 위치에서 (영역 높이 - 줄 높이)의 절반만큼 빼면 줄이 가운데에 온다
  const top = item.offsetTop - (codeScroll.clientHeight - item.offsetHeight) / 2;
  codeScroll.scrollTo({ top: top, behavior: 'smooth' });
}


// ----- 실행 제어 (타이머) -----
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

// 탐색·정렬이 끝났을 때: 타이머를 멈추고 진행을 비우고 버튼을 처음 상태로 돌린다
function finish() {
  stopTimer();
  steps = null;
  runBtn.textContent = '실행';
  setRunning(false);
}
