/**
 * 從表格名稱 (例如 "四縣基礎級") 解析出腔調和級別代碼。
 * @param {string} tableName - 表格名稱 (例如 "四縣基礎級")
 * @returns {object|null} 包含 dialect 和 level 代碼的物件，或在無法解析時返回 null。
 */
function extractDialectLevelCodes(tableName) {
  if (!tableName || typeof tableName !== 'string') {
    console.error('無效的 tableName:', tableName);
    return null;
  }

  let dialectCode = '';
  let levelCode = '';

  // 提取腔調部分
  if (tableName.startsWith('四縣')) {
    dialectCode = 'si';
  } else if (tableName.startsWith('海陸')) {
    dialectCode = 'ha';
  } else if (tableName.startsWith('大埔')) {
    dialectCode = 'da';
  } else if (tableName.startsWith('饒平')) {
    dialectCode = 'rh';
  } else if (tableName.startsWith('詔安')) {
    dialectCode = 'zh';
  } else {
    console.error('無法從 tableName 解析腔調:', tableName);
    return null; // 無法識別腔調
  }

  // 提取級別部分
  if (tableName.endsWith('基礎級')) {
    levelCode = '5'; // 基礎級對應代碼 5
  } else if (tableName.endsWith('初級')) {
    levelCode = '1'; // 初級對應代碼 1
  } else if (tableName.endsWith('中級')) {
    levelCode = '2'; // 中級對應代碼 2
  } else if (tableName.endsWith('中高級')) {
    levelCode = '3'; // 中高級對應代碼 3
  } else {
    console.error('無法從 tableName 解析級別:', tableName);
    return null; // 無法識別級別
  }

  return { dialect: dialectCode, level: levelCode };
}

// --- 全域變數 ---
let isCrossCategoryPlaying = false; // 標記是否正在進行跨類別連續播放
let categoryList = []; // 儲存目前腔調級別的類別列表
let currentCategoryIndex = -1; // 儲存目前播放類別的索引
let currentAudio = null; // 將 currentAudio 移到全域，以便在 playAudio 和其他地方共享
let isPlaying = false; // 播放狀態也移到全域
let isPaused = false; // 暫停狀態也移到全域
let currentAudioIndex = 0; // 當前音檔索引也移到全域
let finishedTableName = null; // 暫存剛播放完畢的表格名稱 (用於書籤替換)
let finishedCat = null; // 暫存剛播放完畢的類別名稱 (用於書籤替換)
let loadedViaUrlParams = false; // <-- 新增：標記是否透過 URL 參數載入

/* Gemini 老師。這種方式還是會因為 CORS 被擋下，無法偵測
function checkAudioStatus(url) {
  return fetch(url, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        return Promise.resolve(true); // 音訊存在且可存取
      } else {
        return Promise.resolve(false); // 音訊不存在或無法存取
      }
    })
    .catch(error => {
      console.error('檢查音訊狀態時發生錯誤：', error);
      if (error instanceof TypeError && error.message.includes('CORS')) {
        console.error('偵測到 CORS 錯誤，ORB 封鎖。');
        return Promise.resolve(false); // 發生 CORS 錯誤，認為音訊無法存取
      }
      return Promise.resolve(false); // 其他錯誤
    });
}*/
/* 這也會被 CORS 擋，氣人 
function checkAudioStatus(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('HEAD', url, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        resolve(true); // 音訊存在
      } else if (xhr.status === 404) {
        resolve(false); // 音訊不存在 (404)
      } else {
        resolve(false); // 其他錯誤
      }
    };
    xhr.onerror = function() {
      resolve(false); // 發生錯誤
    };
    xhr.send();
  });
}*/

function csvToArray(str, delimiter = ',') {
  // https://github.com/codewithnathan97/javascript-csv-array-example/blob/master/index.html

  /*  //str = str.replace(/\r/g,""); // GHSRobert 自己加的，原本弄的會在行尾跑出 \r；好像是 CSV 檔才要？
  
    // slice from start of text to the first \n index
    // use split to create an array from string by delimiter
    const headers = str.slice(0, str.indexOf("\n")).split(delimiter);
  
    // slice from \n index + 1 to the end of the text
    // use split to create an array of each csv value row
    const rows = str.slice(str.indexOf("\n") + 1).split("\n"); // GHSRobert：這樣多行 cell 也會被切開
  
    // Map the rows
    // split values from each row into an array
    // use headers.reduce to create an object
    // object properties derived from headers:values
    // the object passed as an element of the array
    const arr = rows.map(function (row) {
      const values = row.split(delimiter);
      const el = headers.reduce(function (object, header, index) {
        object[header] = values[index];
        return object;
      }, {});
      return el;
    });
  
    // return the array
    return arr;*/

  /* GHSRobert + Gemini */
  const rows = str.split('\n');
  const headers = rows[0].replace(/(四縣|海陸|大埔|饒平|詔安)/g, '').split(',');
  const data = [];

  // 將每一列轉換成 JavaScript 物件
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(',');
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j];
    }
    data.push(obj);
  }
  return data;
}

//cat = "2心理活動與感覺";
//console.log(cat);

// 加入新的可選參數：initialCategory, targetRowId
function generate(content, initialCategory = null, targetRowId = null) {
  // --- 保留 generate 開頭的變數定義和分析腔別級別的邏輯 ---
  console.log('Generate called for:', content.name); // 增加日誌

  // --- 新增：在 generate 開始時，確保清除舊的類別選中狀態 ---
  document.querySelectorAll('.radioItem').forEach((label) => {
    label.classList.remove('active-category');
  });
  // --- 新增：如果不是從下拉選單觸發，就清除進度詳情 ---
  if (!initialCategory && !targetRowId) {
    const progressDetailsSpan = document.getElementById('progressDetails');
    if (progressDetailsSpan) progressDetailsSpan.textContent = '';
  }
  // --- 新增結束 ---

  let 腔 = '';
  let 級 = '';
  腔 = content.name.substring(0, 1);
  級 = content.name.substring(1);
  const 例外音檔 = eval(級 + '例外音檔'); // 保持 eval，雖然不推薦，但沿用現有邏輯

  var fullLvlName;
  const generalMediaYr = '112';
  var 目錄級;
  var 目錄另級;
  var 腔名;
  var 級名;
  var 檔腔;
  var 檔級 = ''; // 初始化檔級

  // ... (保留 switch(腔) 和 switch(級) 的邏輯) ...
  switch (腔) {
    case '四':
      檔腔 = 'si';
      腔名 = '四縣';
      break;
    case '海':
      檔腔 = 'ha';
      腔名 = '海陸';
      break;
    case '大':
      檔腔 = 'da';
      腔名 = '大埔';
      break;
    case '平':
      檔腔 = 'rh';
      腔名 = '饒平';
      break;
    case '安':
      檔腔 = 'zh';
      腔名 = '詔安';
      break;
    default:
      break;
  }
  switch (級) {
    case '基':
      目錄級 = '5';
      目錄另級 = '1';
      級名 = '基礎級';
      break;
    case '初':
      目錄級 = '1';
      級名 = '初級';
      break;
    case '中':
      目錄級 = '2';
      檔級 = '1';
      級名 = '中級';
      break;
    case '中高':
      目錄級 = '3';
      檔級 = '2';
      級名 = '中高級';
      break;
    default:
      break;
  }
  fullLvlName = 腔名 + 級名;
  // --- 保留結束 ---

  categoryList = []; // 在 generate() 裡面清空類別列表，恁仔做得確保每擺切換腔調級別个時節，都會用全新个類別列表。
  
  var contentContainer = document.getElementById('generated');
  contentContainer.innerHTML = ''; // 清空顯示區域

  var title = document.getElementById('header');
  // title.innerHTML = ''; // <-- 刪除這行，這樣才不會在每次呼叫 generate 時清空 header 裡面的下拉選單。

  // 解析詞彙資料
  const arr = csvToArray(content.content);

  // --- 將建立表格和設定播放的邏輯移到新函式 ---
  // (這部分程式碼將從 generate 移到下面的 buildTableAndSetupPlayback)

  // --- *** 新增修改：克隆 cat-panel 以移除舊監聽器 *** ---
  const catPanel = document.getElementById('cat-panel');
  if (catPanel) {
    const catPanelClone = catPanel.cloneNode(true); // true 表示深層複製
    catPanel.parentNode.replaceChild(catPanelClone, catPanel);
    console.log('Cloned cat-panel to remove old listeners.');
  } else {
    console.error('Could not find #cat-panel to clone.');
    // 如果找不到 cat-panel，後續可能會出錯，但至少記錄下來
  }

  // --- 修改 radio button 的處理邏輯 ---
  // *** 注意：因為 cat-panel 被替換了，需要重新獲取 radios 和 radioLabels ***
  var radios = document.querySelectorAll('input[name="category"]');
  const radioLabels = document.querySelectorAll('.radioItem'); // 重新獲取

  // 將需要傳遞給 buildTableAndSetupPlayback 的資訊包裝起來
  const dialectInfo = {
    腔,
    級,
    例外音檔,
    fullLvlName,
    generalMediaYr,
    目錄級,
    目錄另級,
    檔腔,
    檔級,
    腔名,
    級名,
  };

  // 設定 radio button 的 change 事件監聽
  radios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (this.checked) {
        const selectedCategory = this.value;
        console.log('Category changed to:', selectedCategory); // 增加日誌

        // --- 修改：處理類別選中樣式 ---
        // 1. 移除所有 radio label 的 active class
        radioLabels.forEach((label) =>
          label.classList.remove('active-category')
        );
        // 2. 為當前選中的 radio button 對應的 label 加上 active class
        const currentLabel = this.closest('.radioItem');
        if (currentLabel) {
          currentLabel.classList.add('active-category');
        }
        // --- 修改結束 ---

        // --- 新增：手動切換分類時清除進度詳情 ---
        const progressDetailsSpan = document.getElementById('progressDetails');
        if (progressDetailsSpan) progressDetailsSpan.textContent = '';
        // --- 新增結束 ---
        // 當 radio button 改變時，呼叫新函式來建立表格並設定功能
        buildTableAndSetupPlayback(selectedCategory, arr, dialectInfo);
      }
    });
  });

  // --- 新增：處理從下拉選單跳轉過來的情況 ---
  if (initialCategory) {
    console.log('Initial category specified:', initialCategory); // 增加日誌
    const targetRadio = document.querySelector(
      `input[name="category"][value="${initialCategory}"]`
    );
    if (targetRadio) {
      console.log('Found target radio for:', initialCategory); // 增加日誌
      targetRadio.checked = true;

      // --- 新增：為自動選中的類別加上樣式 ---
      const targetLabel = targetRadio.closest('.radioItem');
      if (targetLabel) {
        // 先清除所有，再添加目標的 (以防萬一)
        radioLabels.forEach((label) =>
          label.classList.remove('active-category')
        );
        targetLabel.classList.add('active-category');
      }

      // 直接呼叫新函式來建立表格，並傳遞 targetRowId
      buildTableAndSetupPlayback(
        initialCategory,
        arr,
        dialectInfo,
        targetRowId
      );
    } else {
      console.warn('找不到要自動選擇的類別按鈕:', initialCategory);
      // 如果找不到指定的類別，可以選擇顯示第一個類別或不顯示任何內容
      // 這裡選擇不顯示 (因為 contentContainer 已清空)
    }
  } else {
    // 如果沒有指定初始分類 (例如使用者是手動點擊腔調級別連結)，
    // 可以選擇預設顯示第一個分類，或者讓使用者自行點選。
    // 目前行為：不預選，讓使用者點選。
    console.log('No initial category specified.'); // 增加日誌
    // 清除舊表格內容和 radio button 選擇
    radios.forEach((radio) => (radio.checked = false));
    contentContainer.innerHTML =
      '<p style="text-align: center; margin-top: 20px;">請選擇一個類別來顯示詞彙。</p>';
    // **新增這行**：移除 header 中的播放控制鈕
    header?.querySelector('#audioControls')?.remove(); // 使用 Optional Chaining 避免錯誤
  }
} // --- generate 函式結束 ---

// --- 新增：建立表格和設定播放/書籤功能的主體函式 ---
// 加入新的可選參數：autoPlayTargetRowId
function buildTableAndSetupPlayback(
  category,
  vocabularyArray,
  dialectInfo,
  autoPlayTargetRowId = null
) {
  // 獲取類別列表和目前索引
  const radioButtons = document.querySelectorAll('input[name="category"]');
  categoryList = Array.from(radioButtons).map(radio => radio.value);
  const checkedRadio = document.querySelector('input[name="category"]:checked');
  currentCategoryIndex = checkedRadio ? categoryList.indexOf(checkedRadio.value) : -1;
  console.log("Current categories:", categoryList, "Current index:", currentCategoryIndex); // Debug log

  const contentContainer = document.getElementById('generated');
  contentContainer.innerHTML = ''; // 清空，確保只顯示當前分類的內容

  const header = document.getElementById('header'); // 改用 header 變數
  if (!header) {
    console.error('找不到 #header 元素');
    return; // 如果 header 不存在，後續操作無意義
  }

  // 同歸隻處理 headerTextSpan 个區塊刪除。因為𫣆俚毋會再過用 span 顯示文字，係直接用下拉擇單哩。

  // --- 修改：將 progressDetailsSpan 的宣告移到函式開頭 ---
  const progressDetailsSpan = document.getElementById('progressDetails');
  // --- 修改結束 ---

  console.log(
    `Building table for category: ${category}, autoPlayRow: ${autoPlayTargetRowId}`
  ); // 增加日誌

  // --- 將原本在 generate 內部 radio change listener 中的表格建立邏輯搬移至此 ---
  var table = document.createElement('table');
  table.innerHTML = '';
  let rowIndex = 0; // 音檔索引計數器
  let audioElementsList = []; // 收集此分類的 audio 元素
  let bookmarkButtonsList = []; // 收集此分類的書籤按鈕

  for (const line of vocabularyArray) {
    if (line.分類 && line.分類.includes(category) == true) {
      // --- 內部建立 tr, td, audio, button 的邏輯基本不變 ---
      // --- 但需要使用傳入的 dialectInfo 物件來獲取變數 ---
      let mediaYr = dialectInfo.generalMediaYr;
      let pre112Insertion = '';
      let 句目錄級 = dialectInfo.目錄級;
      let mediaNo = ''; // 在迴圈內計算

      // 編號處理
      var no = line.編號.split('-');
      if (no[0] <= 9) {
        no[0] = '0' + no[0];
      }
      if (dialectInfo.級 === '初') {
        no[0] = '0' + no[0];
      } // 初級特殊處理
      if (no[1] <= 9) {
        no[1] = '0' + no[1];
      }
      if (no[1] <= 99) {
        no[1] = '0' + no[1];
      }
      mediaNo = no[1]; // mediaNo 在此賦值

      // 例外音檔處理
      const index = dialectInfo.例外音檔.findIndex(
        ([編號]) => 編號 === line.編號
      );
      if (index !== -1) {
        const matchedElement = dialectInfo.例外音檔[index];
        console.log(`編號 ${line.編號} 符合例外音檔`);
        mediaYr = matchedElement[1];
        mediaNo = matchedElement[2]; // 例外 mediaNo 在此賦值
        pre112Insertion = 's/';
        句目錄級 = dialectInfo.目錄另級;
      }

      const 詞目錄 =
        dialectInfo.目錄級 +
        '/' +
        dialectInfo.檔腔 +
        '/' +
        dialectInfo.檔級 +
        dialectInfo.檔腔;
      const 句目錄 =
        句目錄級 +
        '/' +
        dialectInfo.檔腔 +
        '/' +
        pre112Insertion +
        dialectInfo.檔級 +
        dialectInfo.檔腔;

      let audioIndex = rowIndex * 2;
      rowIndex++;
      var item = document.createElement('tr');

      // TD1: 編號 & 控制按鈕
      const td1 = document.createElement('td');
      td1.className = 'no';
      const anchor = document.createElement('a');
      anchor.name = no[1]; // 使用 '001', '002' 等格式
      td1.appendChild(anchor);
      const noText = document.createTextNode(line.編號 + '\u00A0');
      td1.appendChild(noText);

      const bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = 'bookmarkBtn';
      bookmarkBtn.dataset.rowId = no[1]; // data-row-id 仍用 '001'
      bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
      td1.appendChild(bookmarkBtn);
      bookmarkButtonsList.push(bookmarkBtn); // 收集按鈕

      const playBtn = document.createElement('button');
      playBtn.className = 'playFromThisRow';
      playBtn.dataset.index = audioIndex; // 播放索引
      playBtn.dataset.rowId = no[1]; // 加入 rowId 方便查找
      playBtn.title = '從此列播放';
      playBtn.innerHTML = '<i class="fas fa-play"></i>';
      td1.appendChild(playBtn);
      item.appendChild(td1);

      // TD2: 詞彙、標音、音檔、意義、備註
      const td2 = document.createElement('td');
      const ruby = document.createElement('ruby');
      ruby.textContent = line.客家語;
      const rt = document.createElement('rt');
      rt.textContent = line.客語標音;
      ruby.appendChild(rt);
      td2.appendChild(ruby);
      td2.appendChild(document.createElement('br'));
      const audio1 = document.createElement('audio');
      audio1.className = 'media';
      audio1.controls = true;
      audio1.preload = 'none';
      const source1 = document.createElement('source');
      // *** 注意路徑組合 ***
      source1.src = `https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/${dialectInfo.generalMediaYr}/${詞目錄}-${no[0]}-${no[1]}.mp3`;
      source1.type = 'audio/mpeg';
      audio1.appendChild(source1);
      td2.appendChild(audio1);
      audioElementsList.push(audio1); // 收集音檔
      td2.appendChild(document.createElement('br'));
      const meaningText = document.createTextNode(
        line.華語詞義.replace(/"/g, '')
      );
      td2.appendChild(meaningText);
      if (line.備註 && line.備註.trim() !== '') {
        const notesP = document.createElement('p');
        notesP.className = 'notes';
        notesP.textContent = `（${line.備註}）`;
        td2.appendChild(notesP);
      } // 不需要 else 隱藏的 p
      item.appendChild(td2);

      // TD3: 例句、音檔、翻譯
      const td3 = document.createElement('td');
      if (line.例句 && line.例句.trim() !== '') {
        const sentenceSpan = document.createElement('span');
        sentenceSpan.className = 'sentence';
        sentenceSpan.innerHTML = line.例句
          .replace(/"/g, '')
          .replace(/\\n/g, '<br>');
        td3.appendChild(sentenceSpan);
        td3.appendChild(document.createElement('br'));
        const audio2 = document.createElement('audio');
        audio2.className = 'media';
        audio2.controls = true;
        audio2.preload = 'none';
        const source2 = document.createElement('source');
        // *** 注意路徑組合 ***
        source2.src = `https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/${mediaYr}/${句目錄}-${no[0]}-${mediaNo}s.mp3`;
        source2.type = 'audio/mpeg';
        audio2.appendChild(source2);
        td3.appendChild(audio2);
        audioElementsList.push(audio2); // 收集音檔
        td3.appendChild(document.createElement('br'));
        const translationText = document.createElement('span');
        translationText.innerHTML = line.翻譯
          .replace(/"/g, '')
          .replace(/\\n/g, '<br>');
        td3.appendChild(translationText);
      } else {
        // 加入 skip 的 audio
        const audio3 = document.createElement('audio');
        audio3.className = 'media';
        audio3.dataset.skip = 'true';
        audio3.controls = false; // 可以設為 false 因為是隱藏的
        audio3.preload = 'none';
        audio3.style.display = 'none'; // 確保隱藏
        // source 可以不加或加一個無效 src
        td3.appendChild(audio3);
        audioElementsList.push(audio3); // 仍然收集，以保持索引一致
      }
      item.appendChild(td3);

      table.appendChild(item);

      // 例外音檔處理結束的相關復位 (這部分似乎不需要了，因為變數在迴圈開始時重置)
      // pre112Insertion = "";
      // mediaYr = dialectInfo.generalMediaYr;
      // 句目錄級 = dialectInfo.目錄級;
    } else {
      continue;
    }
  } // --- for loop 結束 ---

  table.setAttribute('width', '100%');
  contentContainer.appendChild(table);

  // 執行標示大埔變調 (如果需要)
  if (dialectInfo.腔 === '大') {
    大埔高降異化();
    大埔中遇低升();
    大埔低升異化();
  }

  // --- 將原本在 generate 內部 radio change listener 中的播放/書籤設定邏輯搬移至此 ---
  // --- 並將其包裝以便重複使用和觸發 ---

  // 先定義播放相關的狀態變數 (移到更外層，或作為某個物件的屬性，以保持狀態)
  // 為了簡單起見，暫時放在 buildTableAndSetupPlayback 內部，但注意這意味著每次切換分類狀態會重置
  // let currentAudioIndex = 0; // 移到全域
  // let isPlaying = false; // 移到全域
  // let isPaused = false; // 移到全域
  // let currentAudio = null; // 移到全域
  const audioElements = audioElementsList; // 使用收集到的元素 (保持局部，因為每個類別不同)
  const bookmarkButtons = bookmarkButtonsList; // 使用收集到的按鈕 (保持局部)

  // --- 播放控制相關函式 (playAudio, handleAudioEnded, addNowPlaying, removeNowPlaying) ---
  // --- 這些函式現在定義在 buildTableAndSetupPlayback 內部或可以訪問其變數 ---
  function addNowPlaying(element) {
    removeNowPlaying();
    element.id = 'nowPlaying';
  }
  function removeNowPlaying() {
    const nowPlaying = document.getElementById('nowPlaying');
    if (nowPlaying) {
      nowPlaying.removeAttribute('id');
    }
  }
  // --- 抽離出播放結束音效和重置狀態的邏輯 ---
  function playEndOfPlayback() {
       const endAudio = new Audio('endOfPlay.mp3');
       endAudio.play().catch((e) => console.error('播放結束音效失敗:', e));
       currentAudioIndex = 0;
       isPlaying = false;
       isPaused = false;
       currentAudio = null;
       const pauseResumeButton = document.getElementById('pauseResumeBtn'); // 需要重新獲取按鈕引用
       const stopButton = document.getElementById('stopBtn'); // 需要重新獲取按鈕引用
       if (pauseResumeButton) pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
       if (pauseResumeButton) pauseResumeButton.classList.remove('ongoing');
       if (pauseResumeButton) pauseResumeButton.classList.add('ended');
       if (stopButton) stopButton.classList.remove('ongoing');
       if (stopButton) stopButton.classList.add('ended');
       document.querySelectorAll('.playFromThisRow').forEach((element) => {
           element.classList.remove('ongoing');
           element.classList.add('playable');
       });
       removeNowPlaying();
       isCrossCategoryPlaying = false; // 確保標記被重設
  }
  // --- 抽離結束 ---

  function playAudio(index) {
    // 獲取類別列表和目前索引，並將其設為 currentCategoryIndex
    const radioButtons = document.querySelectorAll('input[name="category"]');
    categoryList = Array.from(radioButtons).map(radio => radio.value);
    const checkedRadio = document.querySelector('input[name="category"]:checked');
    currentCategoryIndex = checkedRadio ? categoryList.indexOf(checkedRadio.value) : -1;
    console.log("Current categories (inside playAudio):", categoryList, "Current index:", currentCategoryIndex);

    // 獲取當前類別的 audioElements (因為 audioElements 是 buildTableAndSetupPlayback 的局部變數)
    const currentCategoryAudioElements = audioElementsList; // 使用 buildTableAndSetupPlayback 內部的 audioElementsList

    if (index >= currentCategoryAudioElements.length) {
        console.log("Reached end of category. Current index:", currentCategoryIndex, "Total categories:", categoryList.length);
        const nextCategoryIndex = currentCategoryIndex + 1;
        if (nextCategoryIndex < categoryList.length) {
            const nextCategoryValue = categoryList[nextCategoryIndex];
            const nextRadioButton = document.querySelector(`input[name="category"][value="${nextCategoryValue}"]`);
            if (nextRadioButton) {
                console.log(`Switching to next category: ${nextCategoryValue}`);
                console.log(`Storing finished category: ${dialectInfo.fullLvlName} - ${category}`); // Debug
                finishedTableName = dialectInfo.fullLvlName; // 儲存剛完成的表格名稱
                finishedCat = category; // 儲存剛完成的類別
                isCrossCategoryPlaying = true; // 設定標記
                // 確保停止目前的播放狀態視覺效果
                const stopButton = document.getElementById('stopBtn'); // 獲取停止按鈕
                if (stopButton && isPlaying) { // 只有在播放中才需要點擊停止
                   console.log("Stopping current playback before switching category...");
                   stopButton.click(); // 模擬點擊停止按鈕來清理狀態
                }
                // 使用 setTimeout 確保狀態清理完成
                setTimeout(() => {
                    console.log("Clicking next radio button...");
                    nextRadioButton.click(); // 觸發切換類別
                }, 50); // 短暫延遲
            } else {
                console.error(`Could not find radio button for next category: ${nextCategoryValue}`);
                // 找不到下一個類別按鈕，執行停止邏輯
                playEndOfPlayback();
            }
        } else {
            console.log("Reached end of all categories.");
            // 已經是最後一個類別，執行停止邏輯
            playEndOfPlayback();
        }
        return; // 無論如何都返回，避免執行後續的播放邏輯
    }

    // 使用當前類別的音檔列表
    currentAudio = currentCategoryAudioElements[index];
    if (currentAudio.dataset.skip === 'true') {
      console.log('Skipping audio index:', index);
      currentAudioIndex++;
      playAudio(currentAudioIndex);
      return;
    }

    currentAudio
      .play()
      .then(() => {
        // 播放成功
        console.log('Playing audio index:', index, currentAudio.src);
        currentAudio.removeEventListener('ended', handleAudioEnded); // Ensure no duplicates
        currentAudio.addEventListener('ended', handleAudioEnded, {
          once: true,
        });

        const rowElement = currentAudio.closest('tr');
        if (rowElement) {
          addNowPlaying(rowElement);
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      })
      .catch((error) => {
        console.error(
          `播放音訊失敗 (索引 ${index}, src: ${currentAudio.src}):`,
          error
        );
        // 播放失敗，自動跳到下一個
        currentAudioIndex++;
        playAudio(currentAudioIndex);
      });
  }
  function handleAudioEnded() {
    console.log('Audio ended index:', currentAudioIndex);
    currentAudioIndex++;
    playAudio(currentAudioIndex);
  }

  // --- 設定書籤按鈕和音檔播放的進度儲存邏輯 ---
  const currentTableNameForBookmark = dialectInfo.fullLvlName;
  const currentCategoryForBookmark = category;

  bookmarkButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const rowId = this.dataset.rowId;
      let rowNum = rowId.replace(/^0+/, '');
      // 確保 bookmarkButtonsList 在這裡可用，或者傳遞總行數
      let totalRows = bookmarkButtonsList.length; // 假設 bookmarkButtonsList 包含所有按鈕
      let percentage = (rowNum / totalRows) * 100;
      let percentageFixed = percentage.toFixed(2);

      // --- 修改開始 ---
      // 呼叫新的儲存函式
      saveBookmark(
        rowId,
        percentageFixed,
        currentCategoryForBookmark,
        currentTableNameForBookmark
      );
      // --- 修改結束 ---

      console.log(`書籤 ${rowId} 已儲存至列表`); // 可以保留這個 log
    });
  });

  audioElements.forEach((audio) => {
    // 檢查是否為可播放的音檔 (非 data-skip)
    if (audio.dataset.skip !== 'true') {
      audio.addEventListener('play', function () {
        const rowButton = this.closest('tr')?.querySelector(
          'button[data-row-id]'
        );
        if (!rowButton) return;
        const rowId = rowButton.dataset.rowId;
        let rowNum = rowId.replace(/^0+/, '');
        // 確保 bookmarkButtonsList 在這裡可用，或者傳遞總行數
        let totalRows = bookmarkButtonsList.length; // 假設 bookmarkButtonsList 包含所有按鈕
        let percentage = (rowNum / totalRows) * 100;
        let percentageFixed = percentage.toFixed(2);

        // --- 修改開始 ---
        // 呼叫新的儲存函式
        saveBookmark(
          rowId,
          percentageFixed,
          currentCategoryForBookmark,
          currentTableNameForBookmark
        );
        // --- 修改結束 ---

        console.log(`播放觸發進度儲存至列表：${rowId}`); // 可以保留這個 log
      });
    }
  });

  // --- 修改：尋找或建立 Header 內的播放控制按鈕 ---
  let audioControlsDiv = header.querySelector('#audioControls');
  let playAllButton, pauseResumeButton, stopButton;

  if (!audioControlsDiv) {
    console.log('Creating #audioControls span inside #header');
    // 如果 #audioControls 不在 header 內，則建立它
    audioControlsDiv = document.createElement('span');
    audioControlsDiv.id = 'audioControls';

    // 建立按鈕
    playAllButton = document.createElement('button');
    playAllButton.id = 'playAllBtn';
    playAllButton.title = '依序播放';
    playAllButton.innerHTML = '<i class="fas fa-play"></i>';
    playAllButton.style.display = 'none'; // 保持隱藏 playAll

    pauseResumeButton = document.createElement('button');
    pauseResumeButton.id = 'pauseResumeBtn';
    pauseResumeButton.title = '暫停/繼續';
    pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>'; // 初始狀態

    stopButton = document.createElement('button');
    stopButton.id = 'stopBtn';
    stopButton.title = '停止';
    stopButton.innerHTML = '<i class="fas fa-stop"></i>'; // 初始狀態

    // 將按鈕加入 #audioControls span
    audioControlsDiv.appendChild(playAllButton);
    audioControlsDiv.appendChild(pauseResumeButton);
    audioControlsDiv.appendChild(stopButton);

    // 將 #audioControls span 加入 header
    header.appendChild(audioControlsDiv);
  } else {
    console.log('Found existing #audioControls span inside #header');
    // 如果 #audioControls 已存在，直接找到裡面的按鈕
    playAllButton = audioControlsDiv.querySelector('#playAllBtn');
    pauseResumeButton = audioControlsDiv.querySelector('#pauseResumeBtn');
    stopButton = audioControlsDiv.querySelector('#stopBtn');

    // 可選的健壯性檢查：如果 span 存在但按鈕丟失了，重新創建它們
    if (!pauseResumeButton || !stopButton /* || !playAllButton */) {
      console.warn(
        '#audioControls span exists, but buttons missing. Recreating buttons.'
      );
      audioControlsDiv.innerHTML = ''; // 清空舊內容
      // 重新創建按鈕 (程式碼同上 if 區塊)
      playAllButton = document.createElement('button'); /*...*/
      pauseResumeButton = document.createElement('button'); /*...*/
      stopButton = document.createElement('button'); /*...*/
      playAllButton.style.display = 'none';
      audioControlsDiv.appendChild(playAllButton);
      audioControlsDiv.appendChild(pauseResumeButton);
      audioControlsDiv.appendChild(stopButton);
      // 重新獲取按鈕引用
      playAllButton = audioControlsDiv.querySelector('#playAllBtn');
      pauseResumeButton = audioControlsDiv.querySelector('#pauseResumeBtn');
      stopButton = audioControlsDiv.querySelector('#stopBtn');
    }
  }
  // --- 修改結束 ---

  // --- 綁定事件到按鈕 (使用 onclick 覆蓋舊監聽器) ---
  // 確保按鈕變數在此處是有效的
  if (pauseResumeButton) {
    pauseResumeButton.onclick = function () {
      // 使用 onclick 覆蓋舊監聽器
      if (isPlaying) {
        if (isPaused) {
          currentAudio?.play().catch((e) => console.error('恢復播放失敗:', e));
          isPaused = false;
          this.innerHTML = '<i class="fas fa-pause"></i>';
          this.classList.add('ongoing');
          this.classList.remove('ended');
        } else {
          currentAudio?.pause();
          isPaused = true;
          this.innerHTML = '<i class="fas fa-play"></i>';
          this.classList.remove('ongoing');
          this.classList.add('ended'); // Or a specific paused style
        }
      }
    };
  } else {
    console.error('pauseResumeButton not found for binding');
  }

  if (stopButton) {
    stopButton.onclick = function () {
      // 使用 onclick 覆蓋舊監聽器
      if (isPlaying) {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          currentAudio.removeEventListener('ended', handleAudioEnded);
        }
        currentAudioIndex = 0;
        isPlaying = false;
        isPaused = false;
        currentAudio = null;
        if (pauseResumeButton)
          pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
        if (pauseResumeButton) pauseResumeButton.classList.remove('ongoing');
        pauseResumeButton.classList.add('ended');
        this.classList.remove('ongoing');
        this.classList.add('ended');
        document.querySelectorAll('.playFromThisRow').forEach((element) => {
          element.classList.remove('ongoing');
          element.classList.add('playable');
        });
        removeNowPlaying();
      }
    };
  } else {
    console.error('stopButton not found for binding');
  }

  // 設定 "Play From Row" 按鈕的事件
  const playFromRowButtons = document.querySelectorAll('.playFromThisRow');
  playFromRowButtons.forEach((button) => {
    button.onclick = function () {
      // 使用 onclick 覆蓋舊監聽器
      if (isPlaying) {
        // 如果正在播放，先停止
        if (stopButton) stopButton.click();
        // 使用 timeout 確保停止完成後再開始新的播放
        setTimeout(() => {
          startPlayingFromRow(this);
        }, 100);
      } else {
        startPlayingFromRow(this);
      }
    };
  });

  // 抽離出的啟動播放邏輯
  function startPlayingFromRow(buttonElement) {
    isCrossCategoryPlaying = false; // User initiated playback, disable cross-category mode
    currentAudioIndex = parseInt(buttonElement.dataset.index);
    console.log('Starting playback from index:', currentAudioIndex); // 增加日誌
    isPlaying = true;
    isPaused = false;
    playAudio(currentAudioIndex); // 開始播放
    // 更新按鈕狀態
    if (pauseResumeButton)
      pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
    if (pauseResumeButton) {
      pauseResumeButton.classList.remove('ended');
      pauseResumeButton.classList.add('ongoing');
    }
    if (stopButton) {
      stopButton.classList.remove('ended');
      stopButton.classList.add('ongoing');
    }
    playFromRowButtons.forEach((element) => {
      element.classList.add('ongoing');
    }); // 所有播放按鈕變色
  }

  // --- 新增：處理自動捲動和自動播放 ---
  if (autoPlayTargetRowId) {
    console.log('Attempting to auto-scroll and play row:', autoPlayTargetRowId); // 增加日誌
    const targetAnchor = document.querySelector(
      `a[name="${autoPlayTargetRowId}"]`
    );
    if (targetAnchor) {
      const targetRow = targetAnchor.closest('tr');
      if (targetRow) {
        console.log('Found target row for auto-play'); // 增加日誌

        // --- 修改：無論如何都嘗試產生連結 ---
        if (progressDetailsSpan) {
          // 嘗試從 localStorage 找對應的書籤以取得百分比
          const bookmarks =
            JSON.parse(localStorage.getItem('hakkaBookmarks')) || [];
          const loadedBookmark = bookmarks.find(
            (bm) =>
              bm.tableName === dialectInfo.fullLvlName &&
              bm.cat === category &&
              bm.rowId === autoPlayTargetRowId
          );

          // 產生分享連結
          const dialectLevelCodes = extractDialectLevelCodes(
            dialectInfo.fullLvlName
          ); // 使用 dialectInfo
          if (dialectLevelCodes) {
            // --- 修改 baseURL 計算方式 ---
            let baseURL = '';
            if (window.location.protocol === 'file:') {
              baseURL = window.location.href.substring(
                0,
                window.location.href.lastIndexOf('/') + 1
              );
            } else {
              let path = window.location.pathname;
              baseURL =
                window.location.origin +
                path.substring(0, path.lastIndexOf('/') + 1);
              if (!baseURL.endsWith('/')) {
                baseURL += '/';
              }
            }
            console.log('Calculated baseURL (on load):', baseURL); // 增加日誌檢查 baseURL
            // --- 修改結束 ---
            const encodedCategory = encodeURIComponent(category);
            const shareURL = `${baseURL}index.html?dialect=${dialectLevelCodes.dialect}&level=${dialectLevelCodes.level}&category=${encodedCategory}&row=${autoPlayTargetRowId}`;

            // 決定連結文字
            const linkText = loadedBookmark
              ? `第 ${loadedBookmark.rowId} 行 (${loadedBookmark.percentage}%)`
              : `第 ${autoPlayTargetRowId} 行`;

            // 建立連結元素
            const linkElement = document.createElement('a');
            linkElement.href = shareURL;
            linkElement.textContent = linkText;
            linkElement.target = '_blank'; // 可選：在新分頁開啟
            linkElement.rel = 'noopener noreferrer'; // 安全性考量
            linkElement.style.marginLeft = '5px'; // 加點間距

            // 清空 span 並加入連結
            progressDetailsSpan.innerHTML = '';
            progressDetailsSpan.appendChild(linkElement);
            console.log(
              'Progress details updated with shareable link on load.'
            );
          } else {
            // 如果無法產生連結，只顯示文字 (備用情況)
            const textContent = loadedBookmark
              ? `第 ${loadedBookmark.rowId} 行 (${loadedBookmark.percentage}%)`
              : `第 ${autoPlayTargetRowId} 行`;
            progressDetailsSpan.textContent = textContent;
            console.error(
              '無法從 tableName 解析腔調和級別代碼:',
              dialectInfo.fullLvlName
            );
          }
        }
        // --- 修改結束 ---

        // 捲動到目標行
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 找到該行的播放按鈕
        const playButton = targetRow.querySelector(
          `.playFromThisRow[data-row-id="${autoPlayTargetRowId}"]`
        );
        if (playButton) {
          console.log('Found play button for auto-play'); // 增加日誌
          // 先停止當前可能正在播放的內容
          if (stopButton && isPlaying) {
            console.log('Stopping existing playback before auto-play...'); // 增加日誌
            stopButton.click();
          }
          // 使用 setTimeout 確保停止動作完成，以及捲動動畫有時間開始
          setTimeout(() => {
            console.log('Triggering click on play button for auto-play'); // 增加日誌
            playButton.click(); // 觸發點擊事件，開始播放
          }, 300); // 稍微加長延遲，確保捲動和停止完成
        } else {
          console.warn('找不到目標行的播放按鈕:', autoPlayTargetRowId);
        }
      }
    } else {
      console.warn('找不到要滾動到的目標行錨點:', autoPlayTargetRowId);
      // --- 新增：如果找不到目標行，也清除進度詳情 ---
      if (progressDetailsSpan) {
        progressDetailsSpan.textContent = ''; // 清除文字
      }
      // --- 新增結束 ---
    }
  } else {
    // --- 如果不是自動播放 (例如只是切換分類)，清除進度詳情 ---
    if (progressDetailsSpan) {
      progressDetailsSpan.textContent = ''; // 清除文字
    }
    // --- 結束 ---

    // --- 新增：處理跨類別連續播放 ---
    if (isCrossCategoryPlaying) {
        console.log("Cross-category playback flag is true.");
        // --- 書籤替換邏輯 ---
        if (finishedTableName && finishedCat) {
            console.log(`Attempting to replace bookmark for finished category: ${finishedTableName} - ${finishedCat}`);
            let bookmarks = JSON.parse(localStorage.getItem('hakkaBookmarks')) || [];
            const previousBookmarkIndex = bookmarks.findIndex(
                (bm) => bm.tableName === finishedTableName && bm.cat === finishedCat
            );
            if (previousBookmarkIndex > -1) {
                console.log(`Found finished bookmark at index ${previousBookmarkIndex}. Removing it.`);
                bookmarks.splice(previousBookmarkIndex, 1);
                localStorage.setItem('hakkaBookmarks', JSON.stringify(bookmarks));
                // 更新下拉選單以反映移除 (雖然 saveBookmark 等下會再更新一次)
                updateProgressDropdown();
            } else {
                console.log(`Could not find bookmark for finished category: ${finishedTableName} - ${finishedCat}`);
            }
            // 清除暫存變數
            finishedTableName = null;
            finishedCat = null;
        } else {
             console.log("No finished category info found for bookmark replacement.");
        }
        // --- 書籤替換邏輯結束 ---

        console.log("Starting playback from beginning of the new category.");
        const firstPlayButton = contentContainer.querySelector('.playFromThisRow'); // 找新建立表格的第一個播放按鈕
        if (firstPlayButton) {
             // 使用 setTimeout 確保 DOM 更新完成
             setTimeout(() => {
                console.log("Triggering playback for the first item of the new category.");
                startPlayingFromRow(firstPlayButton); // 自動播放第一個
             }, 100); // 短暫延遲
        } else {
            console.warn("Could not find the first play button for cross-category playback.");
        }
        // isCrossCategoryPlaying = false; // 不在這裡重設，在 playEndOfPlayback 或 startPlayingFromRow 重設
    }
    // --- 新增結束 ---

} // --- buildTableAndSetupPlayback 函式結束 ---
} // <-- 添加遺漏的大括號

/* 最頂端一開始讀取進度 */
document.addEventListener('DOMContentLoaded', function () {
  // --- 新增：處理腔別級別連結點擊 ---
  const dialectLevelLinks = document.querySelectorAll('.dialect a');
  // const dialectSpans = document.querySelectorAll('.dialect'); // 取得所有 span // 不再需要

  dialectLevelLinks.forEach((link) => {
    link.addEventListener('click', function (event) {
      event.preventDefault(); // 防止頁面跳轉

      // 找到包覆 <a> 的那個帶有 data-varname 的 span
      const targetSpan = this.parentElement;
      if (!targetSpan || !targetSpan.dataset.varname) {
        console.error('無法找到帶有 data-varname 的父層 span:', this);
        alert('處理點擊時發生錯誤。');
        return;
      }

      const dataVarName = targetSpan.dataset.varname; // 從正確的 span 讀取 data-varname

      if (dataVarName && typeof window[dataVarName] !== 'undefined') {
        // 1. 移除所有級別連結 span 的 active class
        //    (更精確地針對帶 data-varname 的 span 操作)
        document.querySelectorAll('span[data-varname]').forEach((span) => {
          span.classList.remove('active-dialect-level');
        });
        // 2. 為當前點擊的連結對應的 span 加上 active class
        targetSpan.classList.add('active-dialect-level');

        // 3. 清除類別選項的 active class (因為換了詞庫)
        document.querySelectorAll('.radioItem').forEach((label) => {
          label.classList.remove('active-category');
        });

        // 4. 呼叫 generate 函式
        console.log(
          `Dialect link clicked, calling generate for ${dataVarName}`
        );
        generate(window[dataVarName]);
      } else {
        // 在錯誤訊息中加入更多上下文
        console.error(
          '找不到對應的資料變數或 data-varname:',
          dataVarName,
          'on element:',
          targetSpan
        );
        alert('載入詞庫時發生錯誤。');
      }
    });
  });
  updateProgressDropdown();

  const backToTopButton = document.getElementById('backToTopBtn');

  // 當捲動超過一定距離時顯示按鈕
  window.onscroll = function () {
    if (
      document.body.scrollTop > 20 ||
      document.documentElement.scrollTop > 20
    ) {
      if (backToTopButton) backToTopButton.style.display = 'block'; // Add null check
    } else {
      if (backToTopButton) backToTopButton.style.display = 'none'; // Add null check
    }
  };

  // 點擊按鈕時回到頂部
  if (backToTopButton) {
    // Add null check
    backToTopButton.addEventListener('click', function () {
      document.body.scrollTop = 0; // For Safari
      document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    });
  }

  // --- 下拉選單選擇事件 ---
  const progressDropdown = document.getElementById('progressDropdown');
  const progressDetailsSpan = document.getElementById('progressDetails'); // 移到這裡方便共用

  if (progressDropdown) {
    progressDropdown.addEventListener('change', function (event) {
      const selectedValue = this.value;

      if (selectedValue && selectedValue !== '學習進度') {
        const bookmarks =
          JSON.parse(localStorage.getItem('hakkaBookmarks')) || [];
        const selectedBookmark = bookmarks.find(
          (bm) => bm.tableName + '||' + bm.cat === selectedValue
        );

        if (selectedBookmark) {
          console.log(
            'Dropdown selected (value):',
            selectedValue,
            'Bookmark:',
            selectedBookmark
          );
          const targetTableName = selectedBookmark.tableName;
          const targetCategory = selectedBookmark.cat;
          const targetRowIdToGo = selectedBookmark.rowId;
          const dataVarName = mapTableNameToDataVar(targetTableName);

          if (dataVarName && typeof window[dataVarName] !== 'undefined') {
            const dataObject = window[dataVarName];
            console.log(
              `Calling generate from dropdown for ${dataVarName}, category: ${targetCategory}, row: ${targetRowIdToGo}`
            );
            generate(dataObject, targetCategory, targetRowIdToGo);

            // --- 更新進度詳情為連結 ---
            if (progressDetailsSpan) {
              const dialectLevelCodes =
                extractDialectLevelCodes(targetTableName);
              if (dialectLevelCodes) {
                let baseURL = '';
                if (window.location.protocol === 'file:') {
                  baseURL = window.location.href.substring(
                    0,
                    window.location.href.lastIndexOf('/') + 1
                  );
                } else {
                  let path = window.location.pathname;
                  baseURL =
                    window.location.origin +
                    path.substring(0, path.lastIndexOf('/') + 1);
                  if (!baseURL.endsWith('/')) {
                    baseURL += '/';
                  }
                }
                const encodedCategory = encodeURIComponent(targetCategory);
                const shareURL = `${baseURL}index.html?dialect=${dialectLevelCodes.dialect}&level=${dialectLevelCodes.level}&category=${encodedCategory}&row=${targetRowIdToGo}`;

                const linkElement = document.createElement('a');
                linkElement.href = shareURL;
                linkElement.textContent = `第 ${selectedBookmark.rowId} 行 (${selectedBookmark.percentage}%)`;
                linkElement.target = '_blank';
                linkElement.rel = 'noopener noreferrer';
                linkElement.style.marginLeft = '5px';

                progressDetailsSpan.innerHTML = '';
                progressDetailsSpan.appendChild(linkElement);
                console.log(
                  'Progress details updated with shareable link from dropdown.'
                );
              } else {
                progressDetailsSpan.textContent = `第 ${selectedBookmark.rowId} 行 (${selectedBookmark.percentage}%)`; // Fallback text
                console.error(
                  '無法從 tableName 解析腔調和級別代碼:',
                  targetTableName
                );
              }
            }
            // --- 更新結束 ---
          } else {
            console.error(
              '無法找到對應的資料變數:',
              dataVarName || targetTableName
            );
            alert('載入選定進度時發生錯誤：找不到對應的資料集。');
            if (progressDetailsSpan) progressDetailsSpan.textContent = '';
            this.selectedIndex = 0;
          }
        } else {
          console.error('找不到對應 value 的書籤:', selectedValue);
          alert('載入選定進度時發生錯誤：選項與儲存資料不符。');
          if (progressDetailsSpan) progressDetailsSpan.textContent = '';
          this.selectedIndex = 0;
        }
      } else {
        if (progressDetailsSpan) progressDetailsSpan.textContent = '';
      }
    });
  } else {
    console.error('找不到 #progressDropdown 元素');
  }

  // --- 新增：頁面載入時解析 URL 參數 ---
  const urlParams = new URLSearchParams(window.location.search);
  const dialectParam = urlParams.get('dialect');
  const levelParam = urlParams.get('level');
  const categoryParam = urlParams.get('category'); // 這是編碼過的
  const rowParam = urlParams.get('row');

  if (dialectParam && levelParam && categoryParam && rowParam) {
    console.log(
      'URL parameters detected on load:',
      dialectParam,
      levelParam,
      categoryParam,
      rowParam
    );
    loadedViaUrlParams = true; // <-- 在這裡設定旗標

    // 將 URL 參數映射回表格名稱 (例如 "da", "2" -> "大埔中級")
    let dialectName = '';
    let levelName = '';
    switch (dialectParam) {
      case 'si':
        dialectName = '四縣';
        break;
      case 'ha':
        dialectName = '海陸';
        break;
      case 'da':
        dialectName = '大埔';
        break;
      case 'rh':
        dialectName = '饒平';
        break;
      case 'zh':
        dialectName = '詔安';
        break;
    }
    switch (levelParam) {
      case '5':
        levelName = '基礎級';
        break;
      case '1':
        levelName = '初級';
        break;
      case '2':
        levelName = '中級';
        break;
      case '3':
        levelName = '中高級';
        break;
    }

    if (dialectName && levelName) {
      const targetTableName = dialectName + levelName;
      const dataVarName = mapTableNameToDataVar(targetTableName); // 取得對應的資料變數名稱，例如 '大中'

      if (dataVarName && typeof window[dataVarName] !== 'undefined') {
        const dataObject = window[dataVarName]; // 取得對應的詞彙資料物件
        const decodedCategory = decodeURIComponent(categoryParam); // **解碼 category**

        // --- 修改：顯示 Modal 而不是直接呼叫 generate ---
        const autoplayModal = document.getElementById('autoplayModal');
        // const modalBackdrop = autoplayModal.querySelector('.modal-backdrop'); // 背景現在是 #autoplayModal 本身
        const modalContent = autoplayModal.querySelector('.modal-content');

        if (autoplayModal && modalContent) {
          // 儲存需要傳遞的資訊 (或者在監聽器內重新獲取)
          // 這裡選擇在監聽器內重新獲取，避免閉包問題

          // 隱藏 Modal 並執行 generate 的函式
          const startPlayback = () => {
            console.log('Modal clicked, starting playback...');
            autoplayModal.style.display = 'none';
            // 在使用者互動後呼叫 generate
            generate(dataObject, decodedCategory, rowParam);

            // --- (可選) 更新下拉選單狀態 ---
            if (progressDropdown) {
              const targetValue = targetTableName + '||' + decodedCategory;
              const optionToSelect = progressDropdown.querySelector(
                `option[value="${targetValue}"]`
              );
              if (optionToSelect) {
                optionToSelect.selected = true;
                console.log(
                  'Selected corresponding option in dropdown based on URL params.'
                );
              } else {
                progressDropdown.selectedIndex = 0;
                console.log(
                  'URL params specified a bookmark not currently in the top 10 dropdown options.'
                );
              }
            }
            // --- 更新結束 ---
          };

          // 點擊 Modal 內容區域時觸發播放
          modalContent.addEventListener('click', startPlayback, { once: true });

          // 點擊 Modal 背景 (外部陰暗處) 時僅關閉 Modal
          autoplayModal.addEventListener(
            'click',
            (event) => {
              // 檢查點擊的是否是背景本身，而不是內容區域
              if (event.target === autoplayModal) {
                console.log('Modal backdrop clicked, cancelling autoplay.');
                autoplayModal.style.display = 'none';
                // 清理 modalContent 的監聽器，避免下次 modal 顯示時重複觸發
                modalContent.removeEventListener('click', startPlayback);
                // 可選：顯示預設提示
                const contentContainer = document.getElementById('generated');
                if (
                  contentContainer &&
                  contentContainer.innerHTML.trim() === ''
                ) {
                  contentContainer.innerHTML =
                    '<p style="text-align: center; margin-top: 20px;">請點擊上方連結選擇腔調與級別。</p>';
                }
              }
            },
            { once: true }
          ); // 背景的監聽器也設為 once，點擊一次後移除

          // 顯示 Modal
          autoplayModal.style.display = 'flex'; // 使用 flex 來置中
          console.log('Autoplay modal displayed.');
        } else {
          console.error('Modal elements not found!');
          // 備用方案：如果找不到 Modal，直接呼叫 generate (可能無法自動播放)
          console.warn(
            'Modal not found, attempting direct generation (autoplay might fail).'
          );
          generate(dataObject, decodedCategory, rowParam);
          // ... (對應的下拉選單更新邏輯) ...
        }
        // --- 修改結束 ---
      } else {
        console.error(
          '無法找到對應的資料變數:',
          dataVarName || targetTableName
        );
        loadedViaUrlParams = false; // <-- 失敗時重設旗標 (可選，但較安全)
        // 可以在這裡顯示錯誤訊息或預設內容
        const contentContainer = document.getElementById('generated');
        if (contentContainer)
          contentContainer.innerHTML = '<p>載入資料時發生錯誤。</p>';
        if (progressDetailsSpan) progressDetailsSpan.textContent = ''; // 清除文字
      }
    } else {
      console.error(
        '無法從 URL 參數映射腔調或級別名稱:',
        dialectParam,
        levelParam
      );
      loadedViaUrlParams = false; // <-- 失敗時重設旗標 (可選，但較安全)
      if (progressDetailsSpan) progressDetailsSpan.textContent = ''; // 清除文字
    }
  } else {
    console.log('No valid URL parameters found for auto-generation on load.');
    // 如果沒有 URL 參數，顯示提示訊息
    const contentContainer = document.getElementById('generated');
    if (contentContainer && contentContainer.innerHTML.trim() === '') {
      // 只有在內容為空時才顯示提示
      contentContainer.innerHTML =
        '<p style="text-align: center; margin-top: 20px;">請點擊上方連結選擇腔調與級別。</p>';
    }
    // 確保 header 控制鈕被移除
    const header = document.getElementById('header');
    header?.querySelector('#audioControls')?.remove(); // 使用 Optional Chaining
    if (progressDetailsSpan) progressDetailsSpan.textContent = ''; // 清除文字
  }
  // --- 新增結束 ---

  // --- 新增：如果沒有 URL 參數，確保清除所有 active 狀態 ---
  // 這個區塊會在上面的 if/else 執行完畢 *之後* 執行
  // 它的目的是確保，如果頁面不是透過完整的 URL 參數載入的
  // (也就是說，上面的 if 條件不成立，或者雖然成立但 generate 還沒執行或失敗)
  // 那麼就強制清除所有可能的 active 狀態，回到初始視覺效果。
  if (!urlParams.has('dialect')) {
    // 檢查是否有 URL 參數觸發 generate
    document.querySelectorAll('span[data-varname]').forEach((span) =>
      span.classList.remove('active-dialect-level')
    );
    document.querySelectorAll('.radioItem').forEach((label) => {
      label.classList.remove('active-category');
    });
    // 確保 header 控制鈕被移除 (這部分你已經有了)
    const header = document.getElementById('header');
    header?.querySelector('#audioControls')?.remove();
    const progressDetailsSpan = document.getElementById('progressDetails');
    if (progressDetailsSpan) progressDetailsSpan.textContent = '';
    // 顯示初始提示 (這部分你已經有了)
    const contentContainer = document.getElementById('generated');
    if (contentContainer && contentContainer.innerHTML.trim() === '') {
      contentContainer.innerHTML =
        '<p style="text-align: center; margin-top: 20px;">請點擊上方連結選擇腔調與級別。</p>';
    }
  }
});

/* 標示大埔變調 */
function 大埔高降異化() {
  const specialChars = ['à', 'è', 'ì', 'ò', 'ù'];
  const rtElements = document.querySelectorAll('rt');

  rtElements.forEach((rt) => {
    let text = rt.textContent;
    let words = text.split(/(\s+)/);
    let modifiedWords = [];

    for (let i = 0; i < words.length; i++) {
      if (
        words[i].length > 0 &&
        words[i].match(/[\u00E0\u00E8\u00EC\u00F2\u00F9]/)
      ) {
        // 若前字為 à è ì ò ù
        // 檢查下一個單字是否也包含 à è ì ò ù 或 â ê î ô û
        if (
          i + 2 < words.length &&
          words[i + 2].match(
            /[\u00E0\u00E8\u00EC\u00F2\u00F9\u00E2\u00EA\u00EE\u00F4\u00FB]/
          )
        ) {
          // 檢查 A 單字是否含有右括號，或 B 單字是否含有左括號
          if (words[i].includes(')') || words[i + 2].includes('(')) {
            // 如果含有括號，則直接加入 A 單字
            modifiedWords.push(words[i]);
          } else {
            // 如果沒有括號，則將 A 單字放在 <ruby> 裡
            let rubyElement = document.createElement('ruby');
            rubyElement.className = 'sandhi';
            rubyElement.classList.add('高降變');
            rubyElement.textContent = words[i];
            let rtElement = document.createElement('rt');
            rtElement.textContent = '55';
            rubyElement.appendChild(rtElement);
            modifiedWords.push(rubyElement.outerHTML);
          }
        } else {
          // 如果下一個單字不包含特殊字元，則直接加入 A 單字
          modifiedWords.push(words[i]);
        }
      } else {
        modifiedWords.push(words[i]);
      }
    }

    let newText = modifiedWords.join('');

    if (newText !== text) {
      let tempDiv = document.createElement('div');
      tempDiv.innerHTML = newText;
      rt.innerHTML = ''; // 清空 rt 內容
      while (tempDiv.firstChild) {
        rt.appendChild(tempDiv.firstChild);
      }
    }
  });
}
function 大埔中遇低升() {
  const specialChars = ['à', 'è', 'ì', 'ò', 'ù'];
  const rtElements = document.querySelectorAll('rt');

  rtElements.forEach((rt) => {
    let text = rt.textContent;
    let words = text.split(/(\s+)/);
    let modifiedWords = [];

    for (let i = 0; i < words.length; i++) {
      if (
        words[i].length > 0 &&
        words[i].match(/[\u0101\u0113\u012B\u014D\u016B]/)
      ) {
        // 若前字為 ā ē ī ō ū
        // 檢查下一個單字是否也包含 ǎ ě ǐ ǒ ǔ 或 â ê î ô û
        if (
          i + 2 < words.length &&
          words[i + 2].match(
            /[\u01CE\u011B\u01D0\u01D2\u01D4\u00E2\u00EA\u00EE\u00F4\u00FB]/
          )
        ) {
          // 檢查 A 單字是否含有右括號，或 B 單字是否含有左括號
          if (words[i].includes(')') || words[i + 2].includes('(')) {
            // 如果含有括號，則直接加入 A 單字
            modifiedWords.push(words[i]);
          } else {
            // 如果沒有括號，則將 A 單字放在 <ruby> 裡
            let rubyElement = document.createElement('ruby');
            rubyElement.className = 'sandhi';
            rubyElement.classList.add('中平變');
            rubyElement.textContent = words[i];
            let rtElement = document.createElement('rt');
            rtElement.textContent = '35';
            rubyElement.appendChild(rtElement);
            modifiedWords.push(rubyElement.outerHTML);
          }
        } else {
          // 如果下一個單字不包含特殊字元，則直接加入 A 單字
          modifiedWords.push(words[i]);
        }
      } else {
        modifiedWords.push(words[i]);
      }
    }

    let newText = modifiedWords.join('');

    if (newText !== text) {
      let tempDiv = document.createElement('div');
      tempDiv.innerHTML = newText;
      rt.innerHTML = ''; // 清空 rt 內容
      while (tempDiv.firstChild) {
        rt.appendChild(tempDiv.firstChild);
      }
    }
  });
}
function 大埔低升異化() {
  const specialChars = ['à', 'è', 'ì', 'ò', 'ù'];
  const rtElements = document.querySelectorAll('rt');

  rtElements.forEach((rt) => {
    let text = rt.textContent;
    let words = text.split(/(\s+)/);
    let modifiedWords = [];

    for (let i = 0; i < words.length; i++) {
      if (
        words[i].length > 0 &&
        words[i].match(/[\u01CE\u011B\u01D0\u01D2\u01D4]/)
      ) {
        // 若前字為 ǎ ě ǐ ǒ ǔ
        // 檢查下一個單字是否也包含 ǎ ě ǐ ǒ ǔ
        if (
          i + 2 < words.length &&
          words[i + 2].match(/[\u01CE\u011B\u01D0\u01D2\u01D4]/)
        ) {
          // 檢查 A 單字是否含有右括號，或 B 單字是否含有左括號
          if (words[i].includes(')') || words[i + 2].includes('(')) {
            // 如果含有括號，則直接加入 A 單字
            modifiedWords.push(words[i]);
          } else {
            // 如果沒有括號，則將 A 單字放在 <ruby> 裡
            let rubyElement = document.createElement('ruby');
            rubyElement.className = 'sandhi';
            rubyElement.classList.add('低升變');
            rubyElement.textContent = words[i];
            let rtElement = document.createElement('rt');
            rtElement.textContent = '33';
            rubyElement.appendChild(rtElement);
            modifiedWords.push(rubyElement.outerHTML);
          }
        } else {
          // 如果下一個單字不包含特殊字元，則直接加入 A 單字
          modifiedWords.push(words[i]);
        }
      } else {
        modifiedWords.push(words[i]);
      }
    }

    let newText = modifiedWords.join('');

    if (newText !== text) {
      let tempDiv = document.createElement('div');
      tempDiv.innerHTML = newText;
      rt.innerHTML = ''; // 清空 rt 內容
      while (tempDiv.firstChild) {
        rt.appendChild(tempDiv.firstChild);
      }
    }
  });
}

/* --- 新增開始：更新進度下拉選單 --- */
function updateProgressDropdown() {
  const progressDropdown = document.getElementById('progressDropdown');
  const progressDetailsSpan = document.getElementById('progressDetails'); // <--- 取得 span

  if (!progressDropdown) return; // 如果找不到元素就返回

  // --- 修改：只在需要時清除文字，例如在重建選項前 ---
  // if (progressDetailsSpan) progressDetailsSpan.textContent = ''; // <-- 暫時先不要在這裡清除

  const previousValue = progressDropdown.value; // <-- 新增：記住舊的 value

  // 讀取儲存的進度，若無則初始化為空陣列
  const bookmarks = JSON.parse(localStorage.getItem('hakkaBookmarks')) || [];

  // 清空現有選項 (保留第一個預設選項)
  progressDropdown.innerHTML = '<option selected disabled>學習進度</option>';
  // --- 新增：如果沒有書籤，確保 details 是空的 ---
  if (bookmarks.length === 0 && progressDetailsSpan) {
    progressDetailsSpan.textContent = '';
  }
  // --- 新增結束 ---

  // 遍歷進度陣列，為每個進度產生一個選項
  bookmarks.forEach((bookmark, index) => {
    const option = document.createElement('option');
    // 格式化顯示文字
    option.textContent = `${index + 1}. ${bookmark.tableName} - ${
      bookmark.cat
    } - 第 ${bookmark.rowId} 行 (${bookmark.percentage}%)`;
    // 可以設定 value 屬性，方便未來擴充點選跳轉功能
    // option.value = JSON.stringify(bookmark);
    option.value = bookmark.tableName + '||' + bookmark.cat; // 用 tableName 和 cat 組合，' || ' 當分隔符
    progressDropdown.appendChild(option);
  });

  // --- 新增：嘗試恢復之前的選中狀態 ---
  if (previousValue && previousValue !== '學習進度') {
    // 尋找具有相同 value 的新選項
    const newOptionToSelect = progressDropdown.querySelector(
      `option[value="${previousValue}"]`
    );
    if (newOptionToSelect) {
      // 如果找到了，就選中它
      newOptionToSelect.selected = true;
      console.log('恢復下拉選單選擇:', previousValue);
      restoredSelection = true; // 標記成功恢復

      // --- 修改：如果恢復了選項，在這裡更新 details 文字 ---
      const selectedBookmark = bookmarks.find(
        (bm) => bm.tableName + '||' + bm.cat === previousValue
      );
      if (selectedBookmark && progressDetailsSpan) {
        progressDetailsSpan.textContent = `第 ${selectedBookmark.rowId} 行 (${selectedBookmark.percentage}%)`;
      }
      // --- 修改結束 ---
    } else {
      // 如果找不到了 (可能該進度被擠出前10名)，就顯示預設的 "學習進度"
      progressDropdown.selectedIndex = 0;
      console.log('先前選擇的項目已不在列表中，重設下拉選單');
    }
  } else {
    // 如果之前沒有選擇，或是選的是預設值，保持預設值被選中
    progressDropdown.selectedIndex = 0;
  }
  // --- 新增結束 ---
}
/* --- 新增結束 --- */

/* --- 新增開始：將表格名稱映射回資料變數名稱 --- */
function mapTableNameToDataVar(tableName) {
  const mapping = {
    四縣基礎級: '四基',
    四縣初級: '四初',
    四縣中級: '四中',
    四縣中高級: '四中高',
    海陸基礎級: '海基',
    海陸初級: '海初',
    海陸中級: '海中',
    海陸中高級: '海中高',
    大埔基礎級: '大基',
    大埔初級: '大初',
    大埔中級: '大中',
    大埔中高級: '大中高',
    饒平基礎級: '平基',
    饒平初級: '平初',
    饒平中級: '平中',
    饒平中高級: '平中高',
    詔安基礎級: '安基',
    詔安初級: '安初',
    詔安中級: '安中',
    詔安中高級: '安中高',
    // 如果未來有更多級別或腔調，需要在此處更新
  };
  // 特殊處理：如果傳入的已經是變數名，直接返回
  if (typeof window[tableName] !== 'undefined') {
    return tableName;
  }
  return mapping[tableName];
}
/* --- 新增結束 --- */

/**
 * 儲存學習進度書籤，並根據規則刪除舊紀錄。
 * @param {string} rowId - 當前行的 ID (例如 '001')
 * @param {string} percentage - 學習進度百分比 (字串)
 * @param {string} category - 當前類別名稱
 * @param {string} tableName - 當前表格名稱 (腔調級別)
 */
function saveBookmark(rowId, percentage, category, tableName) {
  let bookmarks = JSON.parse(localStorage.getItem('hakkaBookmarks')) || [];
  const newBookmark = {
    rowId: rowId,
    percentage: percentage,
    cat: category,
    tableName: tableName,
    timestamp: Date.now(),
  };

  // --- (保留現有的移除、新增、刪除舊紀錄邏輯) ---
  // 1. 移除已存在的完全相同的紀錄 (同表格同類別)
  const existingIndex = bookmarks.findIndex(
    (bm) => bm.tableName === newBookmark.tableName && bm.cat === newBookmark.cat
  );
  if (existingIndex > -1) {
    bookmarks.splice(existingIndex, 1);
    console.log(`移除已存在的紀錄: ${tableName} - ${category}`);
  }
  // 2. 將新紀錄加到最前面
  bookmarks.unshift(newBookmark);
  console.log(`新增紀錄: ${tableName} - ${category} 在行 ${rowId}`);
  // 3. 如果紀錄超過 10 筆，執行刪除邏輯
  if (bookmarks.length > 10) {
    console.log(`紀錄超過 10 筆 (${bookmarks.length})，執行刪除邏輯。新紀錄: ${newBookmark.tableName} - ${newBookmark.cat}`);
    let indexToDelete = -1;
    let foundMatch = false; // 用一個 flag 追蹤是否找到匹配

    console.log('開始檢查索引從', bookmarks.length - 1, '到 1');
    // 修改迴圈條件，更簡潔，避免檢查索引 0
    for (let i = bookmarks.length - 1; i >= 1; i--) {
      const currentBookmark = bookmarks[i];
      console.log(`  檢查索引 ${i}: ${currentBookmark.tableName} - ${currentBookmark.cat}`);

      // 檢查是否同表格且不同類別
      if (
        currentBookmark.tableName === newBookmark.tableName &&
        currentBookmark.cat !== newBookmark.cat
      ) {
        indexToDelete = i;
        foundMatch = true; // 設定 flag
        console.log(
          `  找到符合條件的紀錄於索引 ${i} (同表格，不同類別)。將刪除此筆。`
        );
        break; // 找到目標，停止搜尋
      }
      // (可選) 增加其他情況的 log，幫助判斷為何沒匹配
      else if (currentBookmark.tableName === newBookmark.tableName) {
          console.log(`  索引 ${i} 表格名稱相符，但類別相同 (${currentBookmark.cat})。跳過。`);
          // 理論上不該發生，但 log 有助於確認
      } else {
          console.log(`  索引 ${i} 表格名稱不符 (${currentBookmark.tableName})。跳過。`);
      }
    }

    // 根據 flag 判斷如何刪除
    if (foundMatch) {
      console.log(`執行刪除特定紀錄於索引 ${indexToDelete}`);
      bookmarks.splice(indexToDelete, 1);
    } else {
      console.log('未找到符合條件的紀錄 (同表格，不同類別)。將刪除最舊的一筆 (索引 10)。');
      // 確保索引 10 存在 (雖然 length > 10 應該保證了)
      if (bookmarks.length > 10) {
          bookmarks.splice(10, 1);
      } else {
          // 理論上不該發生
          console.warn("嘗試刪除索引 10，但書籤數量不足。");
      }
    }
  }

  // 4. 儲存更新後的紀錄 (最多 10 筆)
  localStorage.setItem('hakkaBookmarks', JSON.stringify(bookmarks));
  updateProgressDropdown(); // 更新下拉選單顯示

  // --- 新增：如果頁面是透過 URL 參數載入的，則在第一次儲存書籤後清除參數 ---
  if (loadedViaUrlParams) {
      console.log("首次儲存書籤 (來自 URL 參數載入)，清除 URL 參數...");
      // 取得目前的 URL 路徑部分 (不含查詢字串和 hash)
      const newUrl = window.location.pathname;
      try {
          // 使用 replaceState 修改 URL 而不重新載入頁面，也不會留下舊的 URL 在歷史紀錄中
          history.replaceState(null, '', newUrl);
          console.log("URL 參數已清除。");
          loadedViaUrlParams = false; // 將旗標設回 false，表示參數已處理完畢，避免後續重複清除
      } catch (e) {
          console.error("清除 URL 參數時發生錯誤:", e);
          // 即使清除失敗，也將標記設為 false，避免無限嘗試
          loadedViaUrlParams = false;
      }
  }

  // --- 修改：強制選中剛儲存的進度並更新詳情為連結 ---
  const progressDropdown = document.getElementById('progressDropdown');
  const progressDetailsSpan = document.getElementById('progressDetails');

  if (progressDropdown && progressDetailsSpan) {
    if (bookmarks.length > 0) {
      // 確保有書籤
      progressDropdown.selectedIndex = 1; // 選中第一個實際進度 (索引為 1)
      console.log('Dropdown selection forced to index 1 (newest).');

      // --- 修改 baseURL 計算方式 ---
      let baseURL = '';
      if (window.location.protocol === 'file:') {
        // For local files, get the directory path from href
        baseURL = window.location.href.substring(
          0,
          window.location.href.lastIndexOf('/') + 1
        );
      } else {
        // For http/https, combine origin and directory path (removing filename)
        let path = window.location.pathname;
        baseURL =
          window.location.origin + path.substring(0, path.lastIndexOf('/') + 1);
        // Ensure baseURL ends with a slash if pathname was just '/'
        if (!baseURL.endsWith('/')) {
          baseURL += '/';
        }
      }
      console.log('Calculated baseURL:', baseURL); // 增加日誌檢查 baseURL
      // --- 修改結束 ---

      // 產生分享連結
      const dialectLevelCodes = extractDialectLevelCodes(tableName);
      if (dialectLevelCodes) {
        // const baseURL = window.location.origin + window.location.pathname;
        const encodedCategory = encodeURIComponent(category);
        const shareURL = `${baseURL}index.html?dialect=${dialectLevelCodes.dialect}&level=${dialectLevelCodes.level}&category=${encodedCategory}&row=${rowId}`;

        // 建立連結元素
        const linkElement = document.createElement('a');
        linkElement.href = shareURL;
        linkElement.textContent = `第 ${newBookmark.rowId} 行 (${newBookmark.percentage}%)`;
        linkElement.target = '_blank'; // 可選：在新分頁開啟
        linkElement.rel = 'noopener noreferrer'; // 安全性考量
        linkElement.style.marginLeft = '5px'; // 加點間距

        // 清空 span 並加入連結
        progressDetailsSpan.innerHTML = '';
        progressDetailsSpan.appendChild(linkElement);
        console.log('Progress details updated with shareable link.');
      } else {
        // 如果無法產生連結，只顯示文字
        progressDetailsSpan.textContent = `第 ${newBookmark.rowId} 行 (${newBookmark.percentage}%)`;
        console.error('無法從 tableName 解析腔調和級別代碼:', tableName);
      }
    } else {
      // 如果沒有書籤了，清空詳情
      progressDetailsSpan.textContent = '';
      progressDropdown.selectedIndex = 0; // 確保選回預設
    }
  }
  // --- 修改結束 ---
}

/**
 * Debounce Function: 延遲執行函式，直到事件停止觸發後的一段時間。
 * (如果你的 main.js 或其他地方已經有 debounce 函式，可以不用重複定義)
 * @param {Function} func 要執行的函式
 * @param {number} wait 等待的毫秒數
 * @param {boolean} immediate 是否在事件一開始就觸發一次
 * @returns {Function} Debounced function
 */
function debounce(func, wait, immediate) {
  let timeout;
  return function () {
    const context = this,
      args = arguments;
    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * 捲動到目前具有 'nowPlaying' ID 的元素 (正在播放或暫停的列)
 */
function scrollToNowPlayingElement() {
  // 直接尋找 id 為 nowPlaying 的元素
  const activeRow = document.getElementById('nowPlaying');

  if (activeRow && activeRow.tagName === 'TR') {
    // 確保找到的是表格列
    console.log('視窗大小改變，捲動到:', activeRow);
    activeRow.scrollIntoView({
      behavior: 'smooth', // 平滑捲動
      block: 'center', // 嘗試置中顯示
    });
  } else {
    console.log('視窗大小改變，但找不到 #nowPlaying 元素。');
  }
}

// 監聽 window 的 resize 事件，並使用 debounce 處理
// 這裡設定 250 毫秒，表示停止調整大小 250ms 後才執行捲動
// window.addEventListener('resize', debounce(scrollToNowPlayingElement, 250)); // 為了除錯暫時註解掉
