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

function csvToArray(str, delimiter = ",") { // https://github.com/codewithnathan97/javascript-csv-array-example/blob/master/index.html

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
  const headers = rows[0].split(',');
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

function generate(content) {
  console.log(content.name); // 依 Gemini 說的，把 content 改為物件，就可以取得名稱了
  //console.log(content.content);

  var mediaKey;
  switch (content.name) {
    case "四基":
      mediaKey = "5/si/si";
      break;
    case "四初":
      mediaKey = "1/si/si";
      break;
    case "四中":
      mediaKey = "2/si/1si";
      break;
    case "四中高":
      mediaKey = "3/si/2si";
      break;
  }

  var contentContainer = document.getElementById("generated");
  contentContainer.innerHTML = "";

  var title = document.createElement("h1");
  title.innerHTML = "現在學習的是" + content.name;
  contentContainer.appendChild(title);
  
  // var cat = "人體與醫療";
  
  var arr = csvToArray(content.content);
  //console.log(arr);
  //arr = arr.replace(/\r/g,"");
  
  // Select all inputs with name="category"
  var radios = document.querySelectorAll("input[name=\"category\"]");
  
  // Use Array.forEach to add an event listener to each radio element.
  radios.forEach(function(radio) {
    radio.addEventListener('change', function() {
      cat = document.querySelector('input[name="category"]:checked').value;
      console.log(cat);
      contentContainer.innerHTML = "";
      
      var title = document.createElement("h1");
      title.innerHTML = "現在學習的是"+content.name+"的"+cat;
      contentContainer.appendChild(title);
      title.setAttribute("id","title");

      var audioElements = "" // 要在這邊把先前 generate 的 audio 都洗掉

      var table = document.createElement("table");
      table.innerHTML = "";
      for (const line of arr) {
//        if (line.分類 === cat) {
        if (line.分類.includes(cat) == true) { // 因為基初和中高的類別順序不同，所以 radio button 不再加編號，改為用 includes 來比對
    
          //var 句 = data[i].四縣例句.replace(/"/g,'').replace(/\\n/g,'<br>');
          //var 譯 = data[i].四縣翻譯.replace(/"/g,'').replace(/\\n/g,'<br>');
          /* var item = document.createElement("tr");
          var no = document.createElement("td");
          var 句 = document.createElement("td");
          var 譯 = document.createElement("td");
          no.innerHTML = data[i].編號;
          句.innerHTML = data[i].四縣例句.replace(/"/g,'').replace(/\\n/g,'<br>');
          譯.innerHTML = data[i].四縣翻譯.replace(/"/g,'').replace(/\\n/g,'<br>');
          item.appendChild(no);
          item.appendChild(句);
          item.appendChild(譯);
    
          table.appendChild(item);*/
          //var no = data[i].編號.split("-");
          var no = line.編號.split("-");
          if (no[0] <= 9) {no[0] = "0"+no[0];}
          if (content.name.includes("初") == true) {no[0] = "0"+no[0];} // 初很煩檔名的類別號碼前面還要再加 0，神經喔
          if (no[1] <= 9) {no[1] = "0"+no[1];}
          if (no[1] <= 99) {no[1] = "0"+no[1];}
          let audioIndex = (no[1].replace(/^0+/,'') - 1) * 2;
          var item = document.createElement("tr");
          //item.innerHTML = "<td>"+no[0]+"-"+no[1]+line.分類+"</td>";
          //item.innerHTML = "<a name=\""+no[1]+"\"></a><td class='no'>" + line.編號 + "&nbsp;<button class=\"bookmarkBtn\" data-row-id=\""+no[1]+"\"><i class=\"fas fa-bookmark\"></i></button> <button class=\"playFromThisRow\" data-index=\""+audioIndex+"\" title=\"從此列播放\"><i class=\"fas fa-play\"></i></button></td><td><ruby>"+line.四縣客家語+"<rt>"+line.四縣客語標音+"</rt></ruby><br><audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/112/" + mediaKey + "-" + no[0]+"-"+no[1] + ".mp3' type='audio/mpeg'></audio><br>"+line.四縣華語詞義+"</td><td><span class='sentence'>" + line.四縣例句.replace(/"/g, '').replace(/\\n/g, '<br>') + "</span><br><audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/112/" + mediaKey + "-" + no[0]+"-"+no[1] +"s.mp3' type='audio/mpeg'></audio><br>" + line.四縣翻譯.replace(/"/g, '').replace(/\\n/g, '<br>') + "</td>";

          item.innerHTML = "<a name=\"" + no[1] + "\"></a><td class='no'>" + line.編號 + "&nbsp;<button class=\"bookmarkBtn\" data-row-id=\"" + no[1] + "\"><i class=\"fas fa-bookmark\"></i></button> <button class=\"playFromThisRow\" data-index=\"" + audioIndex + "\" title=\"從此列播放\"><i class=\"fas fa-play\"></i></button></td><td><ruby>" + line.四縣客家語 + "<rt>" + line.四縣客語標音 + "</rt></ruby><br><audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/112/" + mediaKey + "-" + no[0] + "-" + no[1] + ".mp3' type='audio/mpeg'></audio><br>" + line.四縣華語詞義 + "</td>";
          
          if (line.四縣例句 && line.四縣例句.trim() !== "") {
            item.innerHTML += "<td><span class='sentence'>" + line.四縣例句.replace(/"/g, '').replace(/\\n/g, '<br>') + "</span><br><audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/112/" + mediaKey + "-" + no[0] + "-" + no[1] + "s.mp3' type='audio/mpeg'></audio><br>" + line.四縣翻譯.replace(/"/g, '').replace(/\\n/g, '<br>') + "</td>";
          } else {
            //item.innerHTML += "<td></td>"; // 如果 line.四縣例句 為空，則產生一個空的 td
            item.innerHTML += "<td><audio class='media' data-skip='true' controls='controls' preload='none' > <source src='invalid-audio.mp3' type='audio/mpeg'></audio></td>"; // 產生無效的 audio 元素
          }

          table.appendChild(item);
        } else {continue;}
      }
      table.setAttribute("width","100%");
      contentContainer.appendChild(table);

      
      // 嘗試寫入學習進度，Gemini 教的
      //document.addEventListener('DOMContentLoaded', function() {
        var progress = document.createElement("span");
        const bookmarkData = JSON.parse(localStorage.getItem('bookmark'));
        if (bookmarkData && bookmarkData.cat == cat) {
          progress.innerHTML = "，可跳到已存進度第 <a href=\"#" + bookmarkData.rowId + "\">" + bookmarkData.rowId + "</a> 行（" + bookmarkData.percentage + "%）";
        }
        title.appendChild(progress);
        const bookmarkButtons = document.querySelectorAll('.bookmarkBtn');
        const a = content.name; // 變數 a 的值
        const b = cat;
        
        bookmarkButtons.forEach(button => {
          button.addEventListener('click', function() {
            const rowId = this.dataset.rowId; // Gemini 說：存取 dataset 屬性的方式是透過駝峰式命名法，例如 data-row-id 對應到 dataset.rowId，data-variable-value 對應到 dataset.variableValue。因此，this.dataset.rowId 可以正確抓取 data-row-id 屬性的值。
            let rowNum = rowId.replace(/^0+/, '');
            let percentage = rowNum / (bookmarkButtons.length) * 100;
            let percentageFixed = percentage.toFixed(2);
            
            // 寫入 localStorage
            localStorage.setItem("bookmark", JSON.stringify({
              rowId: rowId,
              percentage: percentageFixed,
              cat: b,
              tableName: a
            }));
            
            console.log(`書籤 ${rowId} 已儲存，表格名稱：${a}，類別：${cat}`);
            //progress.innerHTML = "";
            progress.innerHTML = `，儲存書籤進度到 <a href="#${rowId}">${rowId}</a> (${percentageFixed}%)`;
            // 可選：提供使用者回饋，例如改變按鈕樣式或顯示訊息
          });
        });
        

        audioElements = document.querySelectorAll('#generated audio');
      
        /* 點每個 audio 都會記錄播放進度 */
        audioElements.forEach(audio => {
          audio.addEventListener('play', function() {
            const rowButton = this.closest('tr').querySelector('button');
            const rowId = rowButton.dataset.rowId;
            //const rowId = this.closest('button').dataset.rowId;
            let rowNum = rowId.replace(/^0+/,'');
            let percentage = rowNum / (bookmarkButtons.length) * 100;
            let percentageFixed = percentage.toFixed(2);

            localStorage.setItem("bookmark", JSON.stringify({
              rowId: rowId,
              percentage: percentageFixed,
              cat: b,
              tableName: a
            }));
      
            console.log(`書籤 ${rowId} 已儲存，表格名稱：${a}，類別：${cat}`);
            //progress.innerHTML = "";
            progress.innerHTML = `，剛播放進度到 <a href="#${rowId}">${rowId}</a> (${percentageFixed}%)`;
          });
        });

        /* 播放全部！ */
        /* 嘗試每次重新產生按鈕 */
        // 建立 audioControls div
        const audioControlsDiv = document.createElement('span'); /* 本來是 div */
        audioControlsDiv.id = 'audioControls';
      
        // 建立 playAllBtn button
        const buttonPlayAll = document.createElement('button');
        buttonPlayAll.id = 'playAllBtn';
        buttonPlayAll.title = '依序播放';
        buttonPlayAll.innerHTML = '<i class="fas fa-play"></i>';
      
        // 建立 pauseResumeBtn button
        const buttonPauseResume = document.createElement('button');
        buttonPauseResume.id = 'pauseResumeBtn';
        buttonPauseResume.title = '暫停/繼續';
        buttonPauseResume.innerHTML = '<i class="fas fa-pause"></i>';
      
        // 建立 stopBtn button
        const buttonStop = document.createElement('button');
        buttonStop.id = 'stopBtn';
        buttonStop.title = '停止';
        buttonStop.innerHTML = '<i class="fas fa-stop"></i>';
      
        // 將按鈕新增到 audioControls div
        audioControlsDiv.appendChild(buttonPlayAll);
        audioControlsDiv.appendChild(buttonPauseResume);
        audioControlsDiv.appendChild(buttonStop);
      
        // 將 audioControls div 新增到 generated div
        // 再改為放到 title 裡
        title.appendChild(audioControlsDiv);



        const playAllButton = document.getElementById('playAllBtn');
        const pauseResumeButton = document.getElementById('pauseResumeBtn');
        const stopButton = document.getElementById('stopBtn');
        const playFromRowButtons = document.querySelectorAll('.playFromThisRow');

        
        let currentAudioIndex = 0;
        let isPlaying = false;
        let isPaused = false;
        let currentAudio = null;
      
        function playAudio(index) {
          if (index >= audioElements.length) {
            
            // 播放結束語音
            const endAudio = new Audio('endOfPlay.mp3'); // 替換成您要使用的自由語音 URL
            endAudio.play();

            currentAudioIndex = 0;
            isPlaying = false;
            isPaused = false;
            currentAudio = null;
            pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
            return;
          }
      
          currentAudio = audioElements[index];

          if (currentAudio.dataset.skip === 'true') { // 檢查 data-skip 屬性
            //console.warn(`音訊 ${currentAudio.src} 無效，跳過。`);
            currentAudioIndex++;
            playAudio(currentAudioIndex);
            return;
          }
          
          //currentAudio.addEventListener('error', handleAudioError, { once: true }); // 新增錯誤監聽器，發現無法克服 CORS 問題
          //currentAudio.addEventListener('play', handleAudioPlay); // 新增 play 事件監聽器，功成身退


          currentAudio.play();
          /*checkAudioStatus(currentAudio.src).then(canPlay => {
            if (canPlay) {
              currentAudio.play();
            } else {
              console.error(`音訊 ${currentAudio.src} 無法存取，跳過。`);
              currentAudioIndex++;
              playAudio(currentAudioIndex);
            }
          });*/
          
          currentAudio.addEventListener('ended', handleAudioEnded, { once: true });
          currentAudio.parentElement.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      
        function handleAudioEnded() {
          currentAudioIndex++; // 更新索引
          playAudio(currentAudioIndex);
        }

        function handleAudioError() {
          //console.error(`音訊 ${currentAudio.src} 載入失敗，跳過。`);
          console.log('錯誤事件：', event);
          console.log('錯誤碼：', currentAudio.error.code);
          console.log('錯誤訊息：', currentAudio.error.message);
          currentAudioIndex++;
          playAudio(currentAudioIndex);
        }
        
        function handleAudioPlay(event) {
          //console.log(`音訊 ${currentAudio.src} 開始播放。`);
          console.log('播放事件：', event);
        }
      
        playAllButton.addEventListener('click', function() {
          if (!isPlaying) {
            isPlaying = true;
            isPaused = false;
            currentAudioIndex = 0;
            playAudio(currentAudioIndex);
            pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
          }
        });
      
        pauseResumeButton.addEventListener('click', function() {
          if (isPlaying) {
            if (isPaused) {
              currentAudio.play();
              isPaused = false;
              pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
              currentAudio.pause();
              isPaused = true;
              pauseResumeButton.innerHTML = '<i class="fas fa-play"></i>';
            }
          }
        });
      
        stopButton.addEventListener('click', function() {
          if (isPlaying) {
            if (currentAudio) {
              currentAudio.pause();
              currentAudio.currentTime = 0;
              currentAudio.removeEventListener('ended', handleAudioEnded);
              //currentAudio.removeEventListener('error', handleAudioError); // 移除錯誤監聽器
              //currentAudio.removeEventListener('play', handleAudioPlay); // 移除 play 事件監聽器
            }
            currentAudioIndex = 0;
            isPlaying = false;
            isPaused = false;
            currentAudio = null;
            pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
          }
        });

        playFromRowButtons.forEach(button => {
          button.addEventListener('click', function() {
            if (!isPlaying) {
              currentAudioIndex = parseInt(this.dataset.index);
              isPlaying = true;
              isPaused = false;
              playAudio(currentAudioIndex);
              pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
            }
          });
        });
      //});
    })
    //table.innerHTML = "";
  });

  
  
  // var cat = document.querySelector('input[name="category"]:checked');
        //for (i=0; i<=data.length; i++) {
/*      };
/*      reader.readAsText(file);
    }
  });*/
  //contentContainer.innerHTML = arr[3].四縣翻譯;
}

/* 最頂端一開始讀取進度 */
document.addEventListener('DOMContentLoaded', function() {
  const bookmarkData = JSON.parse(localStorage.getItem('bookmark'));
  var showProgress = document.getElementById("progress");
  if (bookmarkData) {
    showProgress.innerHTML = "進度到<span class='progressLvl'>" + bookmarkData.tableName +"</span><span class='progressCat'>"+ bookmarkData.cat + "</span>，第 <a href=\"#"+bookmarkData.rowId+"\">" + bookmarkData.rowId + "</a> 行（該類別 " + bookmarkData.percentage +"%）。";
  }
});

/* 回到頁頂的按鈕 */
document.addEventListener('DOMContentLoaded', function() {
  const backToTopButton = document.getElementById('backToTopBtn');

  // 當捲動超過一定距離時顯示按鈕
  window.onscroll = function() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
      backToTopButton.style.display = 'block';
    } else {
      backToTopButton.style.display = 'none';
    }
  };

  // 點擊按鈕時回到頂部
  backToTopButton.addEventListener('click', function() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
  });
});