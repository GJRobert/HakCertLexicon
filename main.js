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
  console.log(content.content);

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
  console.log(arr);
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
          var item = document.createElement("tr");
          //item.innerHTML = "<td>"+no[0]+"-"+no[1]+line.分類+"</td>";
          item.innerHTML = "<a name=\""+no[1]+"\"></a><td class='no'>" + line.編號 + "&nbsp;<button class=\"bookmarkBtn\" data-row-id=\""+no[1]+"\"><i class=\"fas fa-bookmark\"></i></button></td><td><ruby>"+line.四縣客家語+"<rt>"+line.四縣客語標音+"</rt></ruby><br><audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/112/" + mediaKey + "-" + no[0]+"-"+no[1] + ".mp3' type='audio/mpeg'></audio><br>"+line.四縣華語詞義+"</td><td><span class='sentence'>" + line.四縣例句.replace(/"/g, '').replace(/\\n/g, '<br>') + "</span><br><audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/112/" + mediaKey + "-" + no[0]+"-"+no[1] +"s.mp3' type='audio/mpeg'></audio><br>" + line.四縣翻譯.replace(/"/g, '').replace(/\\n/g, '<br>') + "</td>";
          table.appendChild(item);
        } else {continue;}
      }
      table.setAttribute("width","100%");
      contentContainer.appendChild(table);
      // 嘗試寫入學習進度，Gemini 教的
      //document.addEventListener('DOMContentLoaded', function() {
        var progress = document.createElement("span");
        title.appendChild(progress);
        const bookmarkButtons = document.querySelectorAll('.bookmarkBtn');
        const a = content.name; // 變數 a 的值
        const b = cat;
      
        bookmarkButtons.forEach(button => {
          button.addEventListener('click', function() {
            const rowId = this.dataset.rowId; // Gemini 說：存取 dataset 屬性的方式是透過駝峰式命名法，例如 data-row-id 對應到 dataset.rowId，data-variable-value 對應到 dataset.variableValue。因此，this.dataset.rowId 可以正確抓取 data-row-id 屬性的值。
      
            // 寫入 localStorage
            localStorage.setItem("bookmark", JSON.stringify({
              rowId: rowId,
              cat: b,
              tableName: a
            }));
      
            console.log(`書籤 ${rowId} 已儲存，表格名稱：${a}，類別：${cat}`);
            //progress.innerHTML = "";
            progress.innerHTML = `，儲存書籤進度到 ${rowId}`;
            // 可選：提供使用者回饋，例如改變按鈕樣式或顯示訊息
          });
        });

        const audioElements = document.querySelectorAll('audio');
      
        audioElements.forEach(audio => {
          audio.addEventListener('play', function() {
            const rowButton = this.closest('tr').querySelector('button');
            const rowId = rowButton.dataset.rowId;
//            const rowId = this.closest('button').dataset.rowId;

            localStorage.setItem("bookmark", JSON.stringify({
              rowId: rowId,
              cat: b,
              tableName: a
            }));
      
            console.log(`書籤 ${rowId} 已儲存，表格名稱：${a}，類別：${cat}`);
            //progress.innerHTML = "";
            progress.innerHTML = `，剛播放進度到 <a href="#${rowId}">${rowId}</a>`;
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
    showProgress.innerHTML = "進度到" + bookmarkData.tableName + bookmarkData.cat + "，第 <a href=\"#"+bookmarkData.rowId+"\">" + bookmarkData.rowId + "</a> 行。";
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