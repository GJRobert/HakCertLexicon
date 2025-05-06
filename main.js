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
  } else if (tableName.endsWith('高級')) {
    levelCode = '4'; // 高級對應代碼 4
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
    case '高':
      目錄級 = '4';
      檔級 = '3';
      級名 = '高級';
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

  // --- 在函式最尾項 ---
  setTimeout(adjustHeaderFontSizeOnOverflow, 0);
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
  categoryList = Array.from(radioButtons).map((radio) => radio.value);
  const checkedRadio = document.querySelector('input[name="category"]:checked');
  currentCategoryIndex = checkedRadio
    ? categoryList.indexOf(checkedRadio.value)
    : -1;
  console.log(
    'Current categories:',
    categoryList,
    'Current index:',
    currentCategoryIndex
  ); // Debug log

  const contentContainer = document.getElementById('generated');
  contentContainer.innerHTML = ''; // 清空，確保只顯示當前分類的內容

  const header = document.getElementById('header'); // 改用 header 變數
  if (!header) {
    console.error('找不到 #header 元素');
    return; // 如果 header 不存在，後續操作無意義
  }

  // --- 新增：在建立表格前，先移除可能殘留的 iOS 提示訊息 ---
  const existingInstructions = document.querySelectorAll('.ios-autoplay-instruction');
  existingInstructions.forEach(el => el.remove());
  console.log('Removed existing iOS instruction messages.');

  const progressDetailsSpan = document.getElementById('progressDetails');

  console.log(
    `Building table for category: ${category}, autoPlayRow: ${autoPlayTargetRowId}`
  ); // 增加日誌

  // --- *** 新增：先過濾出目前類別个詞彙 *** ---
  const filteredItems = vocabularyArray.filter(
    (line) => line.分類 && line.分類.includes(category)
  );
  console.log(`Category "${category}" has ${filteredItems.length} items.`); // 增加日誌

  // --- *** 新增：處理空類別个情況 *** ---
  if (filteredItems.length === 0) {
    // 顯示空類別訊息
    contentContainer.innerHTML = `<p style="text-align: center; margin-top: 20px;">${dialectInfo.級名} 無「${category}」个內容。</p>`;
    // **移除** header 中的播放控制鈕 (因為這類別無東西好播)
    header?.querySelector('#audioControls')?.remove(); // 使用 Optional Chaining 避免錯誤

    // 檢查係無係在跨類別播放模式
    if (isCrossCategoryPlaying) {
      console.log(
        `Empty category "${category}" encountered during cross-category playback.`
      );
      // 播放特殊音檔
      const emptyAudio = new Audio('empty_category.mp3'); // <--- 請確定這隻檔案存在

      emptyAudio.play().catch((e) => console.error('播放空類別音效失敗:', e));

      // 監聽音檔結束事件
      emptyAudio.addEventListener(
        'ended',
        () => {
          isCrossCategoryPlaying = false; // <--- 在處理完空類別後重設旗標
          console.log('Empty category audio finished.');
          const nextCategoryIndex = currentCategoryIndex + 1;

          // 檢查係無係還有下一隻類別
          if (nextCategoryIndex < categoryList.length) {
            const nextCategoryValue = categoryList[nextCategoryIndex];
            const nextRadioButton = document.querySelector(
              `input[name="category"][value="${nextCategoryValue}"]`
            );
            if (nextRadioButton) {
              console.log(`Switching to next category: ${nextCategoryValue}`);
              // --- 新增：在點擊前，先處理書籤替換 ---
              if (finishedTableName && finishedCat) {
                console.log(
                  `Attempting to replace bookmark for finished (empty) category: ${finishedTableName} - ${finishedCat}`
                );
                let bookmarks =
                  JSON.parse(localStorage.getItem('hakkaBookmarks')) || [];
                const previousBookmarkIndex = bookmarks.findIndex(
                  (bm) =>
                    bm.tableName === finishedTableName && bm.cat === finishedCat
                );
                if (previousBookmarkIndex > -1) {
                  console.log(
                    `Found finished bookmark at index ${previousBookmarkIndex}. Removing it.`
                  );
                  bookmarks.splice(previousBookmarkIndex, 1);
                  localStorage.setItem(
                    'hakkaBookmarks',
                    JSON.stringify(bookmarks)
                  );
                  updateProgressDropdown(); // 更新下拉選單
                } else {
                  console.log(
                    `Could not find bookmark for finished (empty) category: ${finishedTableName} - ${finishedCat}`
                  );
                }
                // 清除暫存變數
                finishedTableName = null;
                finishedCat = null;
              }
              // --- 書籤替換結束 ---
              isCrossCategoryPlaying = true; // <--- 在點擊下一隻 *前* 重新設定旗標
              nextRadioButton.click(); // 觸發切換
            } else {
              console.error(
                `Could not find radio button for next category after empty: ${nextCategoryValue}`
              );
              playEndOfPlayback(); // 尋毋著下一隻按鈕，結束播放
            }
          } else {
            // 這係最尾一隻類別
            console.log('Empty category was the last one.');
            playEndOfPlayback(); // 結束播放
          }
        },
        { once: true }
      ); // 事件只觸發一次
    } else {
      // 非跨類別播放模式下選到空類別，單淨顯示訊息
      console.log(`Empty category "${category}" selected manually.`);
    }
    return; // 結束 buildTableAndSetupPlayback 函式，毋使建立表格
  }
  // --- *** 空類別處理結束 *** ---

  // --- 如果類別毋係空个，繼續執行原本个邏輯 ---
  var table = document.createElement('table');
  table.innerHTML = '';
  let rowIndex = 0; // 音檔索引計數器
  let audioElementsList = []; // 收集此分類的 audio 元素
  let bookmarkButtonsList = []; // 收集此分類的書籤按鈕

  // *** 修改：用 filteredItems 來建立表格 ***
  for (const line of filteredItems) {
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
    td1.dataset.label = '編號'; // <-- 加入 data-label
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
    td2.dataset.label = '詞彙'; // <-- 加入 data-label
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
    td3.dataset.label = '例句'; // <-- 加入 data-label

    const hasExampleSentenceText = line.例句 && line.例句.trim() !== '';

    if (hasExampleSentenceText) {
      const sentenceSpan = document.createElement('span');
      sentenceSpan.className = 'sentence';
      sentenceSpan.innerHTML = line.例句
        .replace(/"/g, '')
        .replace(/\n/g, '<br>');
      td3.appendChild(sentenceSpan);
      td3.appendChild(document.createElement('br'));

      // --- 修改：根據係無係「高級」來決定愛用實際音檔還係假音檔 ---
      if (dialectInfo.級名 === '高級') {
        // 「高級」級別：就算有例句文字，也加入一個跳過的假音檔
        const dummyAudioForAdvanced = document.createElement('audio');
        dummyAudioForAdvanced.className = 'media';
        dummyAudioForAdvanced.dataset.skip = 'true';
        dummyAudioForAdvanced.controls = false;
        dummyAudioForAdvanced.preload = 'none';
        dummyAudioForAdvanced.style.display = 'none'; // 確保隱藏
        td3.appendChild(dummyAudioForAdvanced);
        audioElementsList.push(dummyAudioForAdvanced); // 收集假音檔
      } else {
        // 非「高級」級別：若有例句文字，則加入實際个 audio2
        const audio2 = document.createElement('audio');
        audio2.className = 'media';
        audio2.controls = true;
        audio2.preload = 'none';
        const source2 = document.createElement('source');
        source2.src = `https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/${mediaYr}/${句目錄}-${no[0]}-${mediaNo}s.mp3`;
        source2.type = 'audio/mpeg';
        audio2.appendChild(source2);
        td3.appendChild(audio2);
        audioElementsList.push(audio2); // 收集音檔
      }
      // --- 修改結束 ---

      td3.appendChild(document.createElement('br'));
      const translationText = document.createElement('span');
      translationText.innerHTML = line.翻譯
        .replace(/"/g, '')
        .replace(/\n/g, '<br>');
      td3.appendChild(translationText);
    } else {
      // 無例句文本：加入一個跳過的假音檔
      const dummyAudioNoSentence = document.createElement('audio');
      dummyAudioNoSentence.className = 'media';
      dummyAudioNoSentence.dataset.skip = 'true';
      dummyAudioNoSentence.controls = false;
      dummyAudioNoSentence.preload = 'none';
      dummyAudioNoSentence.style.display = 'none'; // 確保隱藏
      td3.appendChild(dummyAudioNoSentence);
      audioElementsList.push(dummyAudioNoSentence); // 收集假音檔，保持索引一致
    }
    item.appendChild(td3);

    table.appendChild(item);
  } // --- for loop 結束 ---

  table.setAttribute('width', '100%');
  contentContainer.appendChild(table);

  // 執行標示大埔變調 (如果需要)
  if (dialectInfo.腔 === '大') {
    大埔高降異化();
    大埔中遇低升();
    大埔低升異化();
  }

  console.log('Table generated, calling handleResizeActions initially.'); // 加一條 log
  handleResizeActions(); // 產生表格後黏時先做一擺調整 ruby 字體大細

  // --- 將原本在 generate 內部 radio change listener 中的播放/書籤設定邏輯搬移至此 ---
  // --- 並將其包裝以便重複使用和觸發 ---

  const audioElements = audioElementsList; // 使用收集到的元素 (保持局部，因為每個類別不同)
  const bookmarkButtons = bookmarkButtonsList; // 使用收集到的按鈕 (保持局部)

  // --- 播放控制相關函式 (playAudio, handleAudioEnded, addNowPlaying, removeNowPlaying) ---
  // --- 這些函式現在定義在 buildTableAndSetupPlayback 內部或可以訪問其變數 ---
  function addNowPlaying(element) {
    removeNowPlaying();
    element.id = 'nowPlaying';
    element.classList.remove('paused-playback'); // <--- 在這搭加這行，確保開始播放時毋會有暫停樣式
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
    if (pauseResumeButton)
      pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
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
    // --- 新增：播放結束時也清除書籤暫存 ---
    finishedTableName = null;
    finishedCat = null;
    // --- 新增結束 ---
  }
  // --- 抽離結束 ---

  function playAudio(index) {
    // 獲取類別列表和目前索引，並將其設為 currentCategoryIndex
    const radioButtons = document.querySelectorAll('input[name="category"]');
    categoryList = Array.from(radioButtons).map((radio) => radio.value);
    const checkedRadio = document.querySelector(
      'input[name="category"]:checked'
    );
    currentCategoryIndex = checkedRadio
      ? categoryList.indexOf(checkedRadio.value)
      : -1;
    console.log(
      'Current categories (inside playAudio):',
      categoryList,
      'Current index:',
      currentCategoryIndex
    );

    // 獲取當前類別的 audioElements (因為 audioElements 是 buildTableAndSetupPlayback 的局部變數)
    const currentCategoryAudioElements = audioElementsList; // 使用 buildTableAndSetupPlayback 內部的 audioElementsList

    if (index >= currentCategoryAudioElements.length) {
      console.log(
        'Reached end of category. Current index:',
        currentCategoryIndex,
        'Total categories:',
        categoryList.length
      );
      const nextCategoryIndex = currentCategoryIndex + 1;
      if (nextCategoryIndex < categoryList.length) {
        const nextCategoryValue = categoryList[nextCategoryIndex];
        const nextRadioButton = document.querySelector(
          `input[name="category"][value="${nextCategoryValue}"]`
        );
        if (nextRadioButton) {
          console.log(`Switching to next category: ${nextCategoryValue}`);
          console.log(
            `Storing finished category: ${dialectInfo.fullLvlName} - ${category}`
          ); // Debug
          finishedTableName = dialectInfo.fullLvlName; // 儲存剛完成的表格名稱
          finishedCat = category; // 儲存剛完成的類別
          isCrossCategoryPlaying = true; // 設定標記
          // 確保停止目前的播放狀態視覺效果
          const stopButton = document.getElementById('stopBtn'); // 獲取停止按鈕
          if (stopButton && isPlaying) {
            // 只有在播放中才需要點擊停止
            console.log(
              'Stopping current playback before switching category...'
            );
            stopButton.click(); // 模擬點擊停止按鈕來清理狀態
          }
          // 使用 setTimeout 確保狀態清理完成
          setTimeout(() => {
            console.log('Clicking next radio button...');
            nextRadioButton.click(); // 觸發切換類別
          }, 50); // 短暫延遲
        } else {
          console.error(
            `Could not find radio button for next category: ${nextCategoryValue}`
          );
          // 找不到下一個類別按鈕，執行停止邏輯
          playEndOfPlayback();
        }
      } else {
        console.log('Reached end of all categories.');
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

        // 尋找 audio 元素个父層 tr 同 td
        const rowElement = currentAudio.closest('tr');
        const audioTd = currentAudio.closest('td'); // <--- 尋包含 audio 个 td

        if (rowElement) {
          addNowPlaying(rowElement); // 樣式還係加在 tr 項
        }

        if (audioTd) {
          // <--- 改成檢查 audioTd
          console.log('Scrolling to audio TD:', audioTd); // 加 log 方便除錯
          // 對尋到个 td 執行 scrollIntoView
          audioTd.scrollIntoView({
            behavior: 'smooth',
            block: 'center', // 試看啊用 'center' 或者 'nearest'
            inline: 'nearest', // 確保水平方向也盡量滾入畫面
          });
        } else if (rowElement) {
          // 萬一尋無 td (理論上毋會)，退回捲動 tr
          console.warn('Could not find audio TD, falling back to scroll TR.');
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
      const nowPlayingRow = document.getElementById('nowPlaying'); // <--- 取得目前播放列

      if (isPlaying) {
        if (isPaused) {
          currentAudio?.play().catch((e) => console.error('恢復播放失敗:', e));
          isPaused = false;
          this.innerHTML = '<i class="fas fa-pause"></i>';
          this.classList.add('ongoing');
          this.classList.remove('ended');
          if (nowPlayingRow) nowPlayingRow.classList.remove('paused-playback'); // <--- 拿掉暫停 class

          // **** ↓↓↓ 在這搭仔加入捲動程式碼 ↓↓↓ ****
          console.log(
            'Resuming playback, attempting to scroll to current audio TD.'
          );
          // 直接對 currentAudio 尋佢个 td
          const audioTd = currentAudio?.closest('td');
          if (audioTd) {
            console.log('Resuming playback, scrolling to current audio TD.');
            audioTd.scrollIntoView({
              behavior: 'smooth',
              block: 'center', // 或者 'nearest'
              inline: 'nearest',
            });
          } else {
            // 萬一尋無 audioTd，試看啊捲動 tr 做備用
            const nowPlayingElement = document.getElementById('nowPlaying');
            if (nowPlayingElement) {
              console.warn(
                'Resume scroll: Could not find audio TD, falling back to scroll TR (#nowPlaying).'
              );
              nowPlayingElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            } else {
              console.warn(
                'Resume scroll: Could not find parent TD for current audio or #nowPlaying TR.'
              );
            }
          }
          // **** ↑↑↑ 加入煞 ↑↑↑ ****
        } else {
          currentAudio?.pause();
          isPaused = true;
          this.innerHTML = '<i class="fas fa-play"></i>';
          this.classList.remove('ongoing');
          this.classList.add('ended'); // Or a specific paused style
          if (nowPlayingRow) nowPlayingRow.classList.add('paused-playback'); // <--- 加入暫停 class
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
        // --- 新增：手動停止時也清除書籤暫存 ---
        // --- 新增結束 ---
        // Roo: 拿掉這兩行，因為跨類別播放時，stopButton.click() 會意外清除掉要傳遞給下一個 buildTableAndSetupPlayback 的資訊。
        //      這些變數會在 buildTableAndSetupPlayback 內部使用後清除，或在 playEndOfPlayback/startPlayingFromRow 時清除。
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
    // --- 新增：手動開始播放時清除書籤暫存 ---
    finishedTableName = null;
    finishedCat = null;
    // --- 新增結束 ---
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
              ? `#${loadedBookmark.rowId} (${loadedBookmark.percentage}%)`
              : `#${autoPlayTargetRowId}`;

            // 建立連結元素
            const linkElement = document.createElement('a');
            linkElement.href = shareURL;
            linkElement.textContent = linkText;
            // linkElement.target = '_blank'; // 可選：在新分頁開啟
            // linkElement.rel = 'noopener noreferrer'; // 安全性考量
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
              ? `#${loadedBookmark.rowId} (${loadedBookmark.percentage}%)`
              : `#${autoPlayTargetRowId}`;
            progressDetailsSpan.textContent = textContent;
            console.error(
              '無法從 tableName 解析腔調和級別代碼:',
              dialectInfo.fullLvlName
            );
          }
        }
        // --- 修改結束 ---
        
        // --- *** iOS 自動播放處理修改 *** ---
        const isRunningOnIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (isRunningOnIOS && loadedViaUrlParams) { // 只在透過 URL 載入時才觸發 iOS 特殊處理
          console.log('iOS detected (via URL): Scrolling to target row and adding instruction, NO autoplay.');

          // 1. 捲動到目標行
          //   (可以考慮捲動到包含播放按鈕的 TD，讓按鈕更顯眼)
          const playButtonTd = targetRow.querySelector('td.no'); // 假設播放按鈕在第一格
          if (playButtonTd) {
              playButtonTd.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          } else {
              targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' }); // 備用
          }

          // 2. 插入提示訊息
          //    先檢查係無係既經有提示訊息在該列頭前，避免重複插入
          const existingInstruction = targetRow.previousElementSibling;
          if (!existingInstruction || !existingInstruction.classList.contains('ios-autoplay-instruction')) {
              const instructionRow = document.createElement('tr');
              instructionRow.className = 'ios-autoplay-instruction'; // 加 class 好用 CSS 控制樣式
              const instructionCell = document.createElement('td');
              instructionCell.colSpan = 3; // 跨越所有欄位
              instructionCell.style.textAlign = 'center';
              instructionCell.style.padding = '8px 0';
              // 改用客家話个提示
              instructionCell.innerHTML = '<strong style="color: #007bff;">👇 請點右片个 ▶️ 按鈕來開始播放。</strong>';
              instructionRow.appendChild(instructionCell);
              targetRow.parentNode.insertBefore(instructionRow, targetRow); // 插入在目標列頭前
          } else {
               console.log('Instruction message already exists for this row.');
          }

          // 3. **毋執行**自動播放个 click()

        } else {
          console.log('Not iOS or not loaded via URL: Proceeding with standard autoplay attempt.');
          // 非 iOS 或非 URL 載入：維持原本个邏輯，捲動並觸發播放
          // 捲動到目標行 (playAudio 內部會做，但係為著視覺效果，先捲一次)
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
        // --- *** iOS 處理修改結束 *** ---

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
    // --- *** 修改：只有在非跨類別播放時才清除詳情 *** ---
    if (!isCrossCategoryPlaying && progressDetailsSpan) {
      progressDetailsSpan.textContent = ''; // 清除文字
    }
    // --- *** 修改結束 *** ---

    // --- 新增：處理跨類別連續播放 ---
    if (isCrossCategoryPlaying) {
      console.log('Cross-category playback flag is true.');
      // --- 書籤替換邏輯 ---
      if (finishedTableName && finishedCat) {
        console.log(
          `Attempting to replace bookmark for finished category: ${finishedTableName} - ${finishedCat}`
        );
        let bookmarks =
          JSON.parse(localStorage.getItem('hakkaBookmarks')) || [];
        // --- Debugging Log Start (Moved Before findIndex) ---
        console.log('Bookmarks currently in localStorage:', JSON.stringify(bookmarks, null, 2)); // 印出所有書籤
        console.log(`Searching for: tableName=[${finishedTableName}], cat=[${finishedCat}]`); // 印出搜尋目標
        // --- Debugging Log End ---
        const previousBookmarkIndex = bookmarks.findIndex(
          (bm) => bm.tableName === finishedTableName && bm.cat === finishedCat
        );
        if (previousBookmarkIndex > -1) {
          console.log(
            `Found finished bookmark at index ${previousBookmarkIndex}. Removing it.`
          );
          bookmarks.splice(previousBookmarkIndex, 1);
          localStorage.setItem('hakkaBookmarks', JSON.stringify(bookmarks));
          // 更新下拉選單以反映移除 (雖然 saveBookmark 等下會再更新一次)
          updateProgressDropdown();
        } else {
          console.log(
            `Could not find bookmark for finished category: ${finishedTableName} - ${finishedCat}`
          );
        }
        // 清除暫存變數
        finishedTableName = null;
        finishedCat = null;
      } else {
        console.log(
          'No finished category info found for bookmark replacement.'
        );
      }
      // --- 書籤替換邏輯結束 ---

      console.log('Starting playback from beginning of the new category.');
      const firstPlayButton =
        contentContainer.querySelector('.playFromThisRow'); // 找新建立表格的第一個播放按鈕
      if (firstPlayButton) {
        // 使用 setTimeout 確保 DOM 更新完成
        setTimeout(() => {
          console.log(
            'Triggering playback for the first item of the new category.'
          );
          startPlayingFromRow(firstPlayButton); // 自動播放第一個
        }, 100); // 短暫延遲
      } else {
        console.warn(
          'Could not find the first play button for cross-category playback.'
        );
        // 如果找不到第一個按鈕（理論上不該發生，因為已檢查 filteredItems.length > 0），停止播放
        playEndOfPlayback();
      }
      // isCrossCategoryPlaying = false; // 不在這裡重設，在 playEndOfPlayback 或 startPlayingFromRow 重設
    }
    // --- 新增結束 ---

    // --- 新增：在 Firefox 中調整 Ruby 字體大小 ---
    adjustAllRubyFontSizes(contentContainer);
    // --- 新增結束 ---
  } // --- autoPlayTargetRowId 處理結束 ---

  // --- 在函式最尾項，確保 DOM 都更新後 ---
  setTimeout(adjustHeaderFontSizeOnOverflow, 0); // 使用 setTimeout
} // --- buildTableAndSetupPlayback 函式結束 ---

/* 最頂端一開始讀取進度 */
document.addEventListener('DOMContentLoaded', function () {
  // --- 檢查 URL 協定 ---
  let isFileProtocol = false;
  if (window.location.protocol === 'file:') {
    isFileProtocol = true;
    document.title = '💻 ' + document.title;
    console.log('偵測到 file:// 協定，已修改網頁標題。');
  }

  // --- 統一獲取常用元素 ---
  const progressDropdown = document.getElementById('progressDropdown');
  const progressDetailsSpan = document.getElementById('progressDetails');
  const contentContainer = document.getElementById('generated');
  const header = document.getElementById('header');
  const backToTopButton = document.getElementById('backToTopBtn');
  const autoplayModal = document.getElementById('autoplayModal');
  const modalContent = autoplayModal
    ? autoplayModal.querySelector('.modal-content')
    : null; // 處理 modal 可能不存在个情況
  const dialectLevelLinks = document.querySelectorAll('.dialect a');

  // --- 新增：在 #progressDropdown 頭前加入 emoji ---
  if (isFileProtocol && progressDropdown && progressDropdown.parentNode) {
    const emojiNode = document.createTextNode('💻 ');
    progressDropdown.parentNode.insertBefore(emojiNode, progressDropdown);
    console.log('既經在 #progressDropdown 頭前加入 emoji。');
  } else if (isFileProtocol && !progressDropdown) {
    console.warn('尋毋著 #progressDropdown 還係厥爸元素，無法度加入 emoji。');
  }

  // --- 新增：處理腔別級別連結點擊 ---
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

  // --- 新增：在解析 URL 參數或設定初始狀態後，呼叫一次調整函式 ---
  // (放在處理 URL 參數邏輯的最後面，或是在 if/else 區塊確保執行到)
  setTimeout(adjustHeaderFontSizeOnOverflow, 0); // 使用 setTimeout 確保在 DOM 繪製後執行

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
                linkElement.textContent = `#${selectedBookmark.rowId} (${selectedBookmark.percentage}%)`;
                // linkElement.target = '_blank';
                // linkElement.rel = 'noopener noreferrer';
                linkElement.style.marginLeft = '5px';

                progressDetailsSpan.innerHTML = '';
                progressDetailsSpan.appendChild(linkElement);
                console.log(
                  'Progress details updated with shareable link from dropdown.'
                );
              } else {
                progressDetailsSpan.textContent = `#${selectedBookmark.rowId} (${selectedBookmark.percentage}%)`; // Fallback text
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
  let successfullyLoadedFromUrl = false; // <--- 用這隻新變數來追蹤

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
      case '4':
        levelName = '高級';
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
            generate(dataObject, decodedCategory, rowParam); // generate 會處理內容顯示摎播放
            successfullyLoadedFromUrl = true; // <--- 在成功呼叫 generate 後設定

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
          successfullyLoadedFromUrl = true; // <--- 在成功呼叫 generate 後設定
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
          contentContainer.innerHTML = '<p>載入資料个時節搣毋著。</p>';
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
  }

  // --- 新增：使用 ResizeObserver 監聽表格容器大小變化 ---
  if (contentContainer && window.ResizeObserver) {
    console.log('Setting up ResizeObserver for #generated container.');

    // Debounced scroll function specifically for the observer
    const debouncedScrollOnResize = debounce(() => {
      console.log(
        'ResizeObserver triggered (debounced). Checking for #nowPlaying.'
      );
      const activeRow = document.getElementById('nowPlaying');
      if (activeRow) {
        console.log(
          'ResizeObserver: Found #nowPlaying, calling scrollToNowPlayingElement.'
        );
        scrollToNowPlayingElement();
      } else {
        console.log('ResizeObserver: #nowPlaying not found, skipping scroll.');
      }
    }, 250); // Use the same debounce delay as window resize

    const resizeObserver = new ResizeObserver((entries) => {
      // We don't need to inspect entries in detail, just trigger the debounced scroll
      debouncedScrollOnResize();
    });

    // Start observing the container
    resizeObserver.observe(contentContainer);

    // Optional: Consider disconnecting the observer if the app structure changes significantly
    // window.addEventListener('beforeunload', () => {
    //     resizeObserver.disconnect();
    // });
  } else if (!window.ResizeObserver) {
    console.warn(
      'ResizeObserver API not supported in this browser. Font size change scrolling might be less reliable.'
    );
  } else if (!contentContainer) {
    console.error('Could not find #generated container to observe.');
  }

  // --- 最後个清理邏輯 (根據 successfullyLoadedFromUrl 判斷) ---
  if (!successfullyLoadedFromUrl) {
    console.log(
      'Page was not successfully loaded via URL params, ensuring clean initial state.'
    );
    // 清除 active 狀態
    document
      .querySelectorAll('span[data-varname]')
      .forEach((span) => span.classList.remove('active-dialect-level'));
    document.querySelectorAll('.radioItem').forEach((label) => {
      label.classList.remove('active-category');
    });
    // 移除播放控制按鈕
    header?.querySelector('#audioControls')?.remove();
    // 清除進度詳情
    if (progressDetailsSpan) progressDetailsSpan.textContent = '';
    // 顯示預設提示 (如果內容為空)
    if (contentContainer && contentContainer.innerHTML.trim() === '') {
      contentContainer.innerHTML =
        '<p style="text-align: center; margin-top: 20px;">請點頂項連結擇腔調同級別。</p>';
    }
    // 確保下拉選單選在預設值
    if (progressDropdown) progressDropdown.selectedIndex = 0;
  }

  // --- 再加一次確保，特別是如果 URL 參數處理是異步的 ---
  // 或者直接放在最尾項
  setTimeout(adjustHeaderFontSizeOnOverflow, 50); // 稍微延遲
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
    } - #${bookmark.rowId} (${bookmark.percentage}%)`;
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
        progressDetailsSpan.textContent = `#${selectedBookmark.rowId} (${selectedBookmark.percentage}%)`;
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

  // --- 在所有 option 都加入，並且可能恢復選中狀態後 ---
  // 使用 setTimeout 確保 DOM 更新完成
  setTimeout(adjustHeaderFontSizeOnOverflow, 0);
}

/* --- 新增開始：將表格名稱映射回資料變數名稱 --- */
function mapTableNameToDataVar(tableName) {
  const mapping = {
    四縣基礎級: '四基',
    四縣初級: '四初',
    四縣中級: '四中',
    四縣中高級: '四中高',
    四縣高級: '四高',
    海陸基礎級: '海基',
    海陸初級: '海初',
    海陸中級: '海中',
    海陸中高級: '海中高',
    海陸高級: '海高',
    大埔基礎級: '大基',
    大埔初級: '大初',
    大埔中級: '大中',
    大埔中高級: '大中高',
    大埔高級: '大高',
    饒平基礎級: '平基',
    饒平初級: '平初',
    饒平中級: '平中',
    饒平中高級: '平中高',
    饒平高級: '平高',
    詔安基礎級: '安基',
    詔安初級: '安初',
    詔安中級: '安中',
    詔安中高級: '安中高',
    詔安高級: '安高',
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
    console.log(
      `紀錄超過 10 筆 (${bookmarks.length})，執行刪除邏輯。新紀錄: ${newBookmark.tableName} - ${newBookmark.cat}`
    );
    let indexToDelete = -1;
    let foundMatch = false; // 用一個 flag 追蹤是否找到匹配

    console.log('開始檢查索引從', bookmarks.length - 1, '到 1');
    // 修改迴圈條件，更簡潔，避免檢查索引 0
    for (let i = bookmarks.length - 1; i >= 1; i--) {
      const currentBookmark = bookmarks[i];
      console.log(
        `  檢查索引 ${i}: ${currentBookmark.tableName} - ${currentBookmark.cat}`
      );

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
        console.log(
          `  索引 ${i} 表格名稱相符，但類別相同 (${currentBookmark.cat})。跳過。`
        );
        // 理論上不該發生，但 log 有助於確認
      } else {
        console.log(
          `  索引 ${i} 表格名稱不符 (${currentBookmark.tableName})。跳過。`
        );
      }
    }

    // 根據 flag 判斷如何刪除
    if (foundMatch) {
      console.log(`執行刪除特定紀錄於索引 ${indexToDelete}`);
      bookmarks.splice(indexToDelete, 1);
    } else {
      console.log(
        '未找到符合條件的紀錄 (同表格，不同類別)。將刪除最舊的一筆 (索引 10)。'
      );
      // 確保索引 10 存在 (雖然 length > 10 應該保證了)
      if (bookmarks.length > 10) {
        bookmarks.splice(10, 1);
      } else {
        // 理論上不該發生
        console.warn('嘗試刪除索引 10，但書籤數量不足。');
      }
    }
  }

  // 4. 儲存更新後的紀錄 (最多 10 筆)
  localStorage.setItem('hakkaBookmarks', JSON.stringify(bookmarks));
  updateProgressDropdown(); // 更新下拉選單顯示

  // --- 新增：如果頁面是透過 URL 參數載入的，則在第一次儲存書籤後清除參數 ---
  if (loadedViaUrlParams) {
    console.log('首次儲存書籤 (來自 URL 參數載入)，清除 URL 參數...');
    // 取得目前的 URL 路徑部分 (不含查詢字串和 hash)
    const newUrl = window.location.pathname;
    try {
      // 使用 replaceState 修改 URL 而不重新載入頁面，也不會留下舊的 URL 在歷史紀錄中
      history.replaceState(null, '', newUrl);
      console.log('URL 參數已清除。');
      loadedViaUrlParams = false; // 將旗標設回 false，表示參數已處理完畢，避免後續重複清除
    } catch (e) {
      console.error('清除 URL 參數時發生錯誤:', e);
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
        linkElement.textContent = `#${newBookmark.rowId} (${newBookmark.percentage}%)`;
        // linkElement.target = '_blank'; // 可選：在新分頁開啟
        // linkElement.rel = 'noopener noreferrer'; // 安全性考量
        linkElement.style.marginLeft = '5px'; // 加點間距

        // 清空 span 並加入連結
        progressDetailsSpan.innerHTML = '';
        progressDetailsSpan.appendChild(linkElement);
        console.log('Progress details updated with shareable link.');
      } else {
        // 如果無法產生連結，只顯示文字
        progressDetailsSpan.textContent = `#${newBookmark.rowId} (${newBookmark.percentage}%)`;
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
 * 並在 Firefox 中重新調整 Ruby 字體大小。
 */
function handleResizeActions() {
  console.log(
    'Debounced resize event triggered. Calling scroll and font adjustment.'
  ); // 新增 log
  scrollToNowPlayingElement();
  // 取得表格容器，如果不存在就返回
  const contentContainer = document.getElementById('generated');
  if (contentContainer) {
    adjustAllRubyFontSizes(contentContainer);
  } else {
    console.warn(
      'Resize handler: Could not find #generated container for font adjustment.'
    );
  }

  // *** 在這裡加入呼叫 ***
  adjustHeaderFontSizeOnOverflow();

  // 淨在 #nowPlaying 存在个時節正捲動
  const activeRow = document.getElementById('nowPlaying');
  if (activeRow) {
    console.log(
      'Resize handler: Found #nowPlaying, calling scrollToNowPlayingElement.'
    );
    scrollToNowPlayingElement(); // 呼叫原本个捲動函式
  } else {
    // 係講尋毋著，就毋做捲動，單淨印 log
    console.log('Resize handler: #nowPlaying not found, skipping scroll.');
  }
}

/**
 * 捲動到目前具有 'nowPlaying' ID 的元素 (正在播放或暫停的列)
 */
/**
 * 捲動到目前具有 'nowPlaying' ID 的列中，包含 currentAudio 的 TD 元素。
 */
function scrollToNowPlayingElement() {
  // 先尋著有 'nowPlaying' ID 个 tr
  const activeRow = document.getElementById('nowPlaying');
  console.log(
    'scrollToNowPlayingElement called. Found #nowPlaying TR:',
    activeRow
  );

  // 確定 activeRow 同 currentAudio (目前播放或暫停个音檔) 都存在
  if (activeRow && currentAudio) {
    // 對 currentAudio 尋佢所在个 td
    const audioTd = currentAudio.closest('td');

    // 確定尋著 td，而且該 td 確實在 activeRow 裡肚
    if (audioTd && activeRow.contains(audioTd)) {
      console.log('Scrolling to audio TD within #nowPlaying TR:', audioTd);
      audioTd.scrollIntoView({
        behavior: 'smooth', // 在 resize 時節用 smooth 可能較好
        block: 'center', // 'nearest' 在 resize 時較毋會跳恁大力
        inline: 'nearest',
      });
    } else {
      console.warn(
        'scrollToNowPlayingElement: Could not find audio TD or it is not within #nowPlaying TR. Falling back to scroll TR.'
      );
      // 萬一尋無正確个 td，退回捲動歸列 tr
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } else {
    console.log(
      'scrollToNowPlayingElement: #nowPlaying TR or currentAudio reference not found. Skipping scroll.'
    );
  }
}

// 監聽 window 的 resize 事件，並使用 debounce 處理
// 這裡設定 250 毫秒，表示停止調整大小 250ms 後才執行捲動和字體調整
window.addEventListener('resize', debounce(handleResizeActions, 250)); // <-- 改為呼叫新的處理函式

/**
 * 檢查目前瀏覽器係無係 Firefox。
 * @returns {boolean} 如果係 Firefox 回傳 true，否則回傳 false。
 */
function isFirefox() {
  return navigator.userAgent.toLowerCase().includes('firefox');
}

/**
 * 調整單一 ruby 元素个字體大小，避免在 Firefox 中溢出。
 * @param {HTMLElement} rubyElement - 要調整个 ruby 元素。
 */
function adjustRubyFontSize(rubyElement) {
  if (!isFirefox()) return; // 只在 Firefox 執行

  const tdElement = rubyElement.closest('td');
  if (!tdElement) return;

  // 先重設字體大小，以便取得正確个 scrollWidth
  rubyElement.style.fontSize = ''; // 重設為 CSS 預設值
  // 需要強制瀏覽器重新計算樣式
  window.getComputedStyle(rubyElement).fontSize;

  // 用 setTimeout 確保樣式重設先生效
  setTimeout(() => {
    const currentFontSize = parseFloat(
      window.getComputedStyle(rubyElement).fontSize
    );
    const rubyWidth = rubyElement.scrollWidth;
    // const tdWidth = tdElement.clientWidth; // <-- 原本个方式

    // --- 新增：判斷模式並計算可用寬度 ---
    const computedTdStyle = window.getComputedStyle(tdElement);
    const isCardMode = computedTdStyle.display === 'block';
    let availableWidth;
    const buffer = 5; // 緩衝空間

    if (isCardMode) {
      // 卡片模式：clientWidth 減去 paddingLeft (像素) 再減 buffer
      const paddingLeftPx = parseFloat(computedTdStyle.paddingLeft);
      // 考慮到 ::before 佔用个空間，再減去 buffer
      availableWidth = tdElement.clientWidth - paddingLeftPx - buffer * 3; // 稍微多減一點 buffer
      // console.log(`Card Mode: clientW=${tdElement.clientWidth}, padL=${paddingLeftPx}, availW=${availableWidth}`);
    } else {
      // 寬螢幕模式：直接用 clientWidth 減 buffer
      availableWidth = tdElement.clientWidth - buffer;
      // console.log(`Wide Mode: clientW=${tdElement.clientWidth}, availW=${availableWidth}`);
    }
    // --- 新增結束 ---

    if (rubyWidth > availableWidth) {
      // <-- 用 availableWidth 比較
      // 按比例計算新字體大小，但設定下限
      let newSize = Math.floor((currentFontSize * availableWidth) / rubyWidth);
      const minSize = 10; // 最小字體大小 (px)
      newSize = Math.max(newSize, minSize);

      if (newSize < currentFontSize) {
        // 只有在需要縮小時才應用
        // console.log(`Firefox: Adjusting ruby font size: ${rubyElement.textContent.substring(0,10)}... from ${currentFontSize}px to ${newSize}px`);
        rubyElement.style.fontSize = `${newSize}px`;
      } else {
        // 如果計算出个 newSize 無比 currentFontSize 細，愛確定拿忒 style.fontSize
        if (rubyElement.style.fontSize) {
          // console.log(`Firefox: Ruby fits or newSize >= currentSize, removing inline style.`);
          rubyElement.style.fontSize = '';
        }
      }
    } else {
      // 如果 ruby 元素闊度細過可用闊度，愛確定拿忒 style.fontSize
      if (rubyElement.style.fontSize) {
        // console.log(`Firefox: Ruby fits, removing inline style.`);
        rubyElement.style.fontSize = '';
      }
    }
  }, 0); // Timeout 0 通常會延遲到目前腳本執行完畢後
}

/**
 * 調整指定容器內所有相關 ruby 元素个字體大小。
 * @param {HTMLElement} containerElement - 包含表格个容器元素。
 */
function adjustAllRubyFontSizes(containerElement) {
  if (!isFirefox()) return;
  console.log('Firefox: Adjusting ruby font sizes...');
  // 只針對包含客家語个 td 裡背个 ruby 做調整
  const rubyElements = containerElement.querySelectorAll(
    'td[data-label="詞彙"] ruby'
  );
  rubyElements.forEach((rubyElement) => {
    // 在調整前先重設，確保 resize 時能從原始大小開始計算
    rubyElement.style.fontSize = '';
    adjustRubyFontSize(rubyElement);
  });
}

/**
 * 動態調整 #header 內主要元素 (#progressDropdown, #progressDetails) 的字體大小，
 * 檢查 #header 是否發生橫向溢出 (overflow)，如果是，則縮小字體。
 */
function adjustHeaderFontSizeOnOverflow() { // <--- 改名仔
    console.log('--- adjustHeaderFontSizeOnOverflow function CALLED ---');
    const header = document.getElementById('header');
    const dropdown = document.getElementById('progressDropdown');
    const detailsContainer = document.getElementById('progressDetails'); // <span>
    // 注意：linkElement 還是需要，因為 detailsContainer 本身可能沒有文字
    const linkElement = detailsContainer?.querySelector('a'); // <a>

    // 確保主要元素都存在
    if (!header || !dropdown || !detailsContainer || !linkElement) {
        console.warn('adjustHeaderFontSizeOnOverflow: Missing required elements (header, dropdown, detailsContainer, or linkElement).');
        // 如果缺少元素，嘗試重設可能存在的行內樣式
        [dropdown, linkElement].forEach(el => {
            if (el && el.style.fontSize !== '') {
                el.style.fontSize = '';
            }
        });
        return;
    }

    // --- 記錄目標元素的初始字體大小 ---
    const elementsToResize = [
        { element: dropdown, minSize: 10 }, // 下拉選單最小字體 (可調整)
        { element: linkElement, minSize: 8 }   // 連結最小字體 (可調整)
    ];
    const initialStyles = elementsToResize.map(item => ({
        element: item.element,
        initialSize: parseFloat(window.getComputedStyle(item.element).fontSize),
        minSize: item.minSize
    }));

    // --- 重設行內樣式，以便計算自然寬度 ---
    initialStyles.forEach(item => {
        item.element.style.fontSize = '';
    });
    // 強制瀏覽器重繪
    header.offsetHeight;

    // --- 計算 Header 可用寬度與初始需求寬度 ---
    const headerWidth = header.clientWidth;
    let totalRequiredWidth = calculateTotalRequiredWidth(header); // 使用輔助函式
    const gapValue = parseFloat(window.getComputedStyle(header).gap) || 0; // 讀取 gap

    console.log(`Header Width: ${headerWidth}, Initial Required Width: ${totalRequiredWidth}, Gap: ${gapValue}`);

    // --- 檢查是否溢出 ---
    const isOverflowing = totalRequiredWidth > headerWidth;
    const buffer = 1; // 允許一點點誤差

    if (isOverflowing && totalRequiredWidth - headerWidth > buffer) {
        console.log(`#header is overflowing by ${totalRequiredWidth - headerWidth}px. Shrinking fonts.`);
        // --- 已溢出，執行縮小字體邏輯 ---

        // 確保連結文字不換行 (CSS 應該已處理，但 JS 加強)
        linkElement.style.whiteSpace = 'nowrap';

        // --- 逐步縮小字體 ---
        let canShrinkMore = true; // 標記是否還能繼續縮小
        for (let i = 0; i < 50 && totalRequiredWidth > headerWidth && canShrinkMore; i++) {
            canShrinkMore = false; // 假設這次不能再縮了
            let currentTotalWidthBeforeShrink = totalRequiredWidth; // 記錄縮小前的寬度

            // 對每個目標元素縮小 1px (如果還沒到最小值)
            initialStyles.forEach(item => {
                let currentElementSize = parseFloat(item.element.style.fontSize || item.initialSize);
                if (currentElementSize > item.minSize) {
                    currentElementSize -= 1;
                    item.element.style.fontSize = `${currentElementSize}px`;
                    canShrinkMore = true; // 只要有一個能縮，就標記為 true
                } else {
                    // 確保最小值被應用
                    item.element.style.fontSize = `${item.minSize}px`;
                }
            });

            // 如果沒有任何元素可以再縮小了，就跳出循環
            if (!canShrinkMore) {
                 console.log('All elements reached minimum font size.');
                 break;
            }

            // 強制重繪
            header.offsetHeight;

            // *** 重新計算 totalRequiredWidth ***
            totalRequiredWidth = calculateTotalRequiredWidth(header);
            console.log(`  Shrunk step ${i+1}, new required width: ${totalRequiredWidth}`);

            // *** 增加檢查：如果寬度沒有變小，可能卡住了，跳出 ***
            if (totalRequiredWidth >= currentTotalWidthBeforeShrink && canShrinkMore) {
                console.warn('  Width did not decrease after shrinking, breaking loop to prevent infinite loop.');
                break;
            }
        } // --- 縮小循環結束 ---

        // 循環結束後最後檢查
        if (totalRequiredWidth > headerWidth) {
             console.warn(`Fonts shrunk to minimum, but header might still overflow by ${totalRequiredWidth - headerWidth}px.`);
        } else {
             console.log(`Font sizes adjusted. Final required width: ${totalRequiredWidth}`);
        }

    } else {
        // --- 未溢出或溢出在 buffer 內 ---
        // console.log('#header is not overflowing significantly. Resetting fonts if needed.');
        let stylesReset = false;
        initialStyles.forEach(item => {
            if (item.element.style.fontSize !== '') {
                item.element.style.fontSize = '';
                stylesReset = true;
            }
        });
         // 恢復連結的 white-space (如果之前被 JS 修改過)
        if (linkElement.style.whiteSpace !== '') {
             linkElement.style.whiteSpace = '';
             stylesReset = true;
        }
        if (stylesReset) {
            console.log('Reset font sizes to default.');
        }
    }
}

/**
 * 輔助函式：計算 Header 內部可見子元素的總需求寬度 (包含 gap)
 * @param {HTMLElement} headerElement - #header 元素
 * @returns {number} 總需求寬度 (px)
 */
function calculateTotalRequiredWidth(headerElement) {
    const children = headerElement.children;
    let totalWidth = 0;
    const computedHeaderStyle = window.getComputedStyle(headerElement);
    const gapValue = parseFloat(computedHeaderStyle.gap) || 0;
    let visibleChildrenCount = 0;

    for (const child of children) {
        // 確保只計算實際顯示的元素
        if (child.offsetParent !== null && window.getComputedStyle(child).display !== 'none') {
            totalWidth += child.scrollWidth;
            visibleChildrenCount++;
        }
    }

    // 只有在超過一個可見元素時才加上 gap
    if (visibleChildrenCount > 1) {
        totalWidth += (visibleChildrenCount - 1) * gapValue;
    }
    return totalWidth;
}
