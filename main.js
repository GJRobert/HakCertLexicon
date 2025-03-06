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
  var contentContainer = document.getElementById("generated");
  contentContainer.innerHTML = "";
  var cat = "1人體與醫療";
  const arr = csvToArray(content);
  var table = document.createElement("table");

  // Select all inputs with name="category"
  var radios = document.querySelectorAll("input[name=\"category\"]");

  // Use Array.forEach to add an event listener to each radio element.
  radios.forEach(function(radio) {
    radio.addEventListener('change', function() {
      cat = document.querySelector('input[name="category"]:checked').value;
      console.log(cat);
      console.log("content");
      table.innerHTML = "";
      for (const line of arr) {
        if (line.分類 === cat) {
    
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
          if (no[1] <= 9) {no[1] = "0"+no[1];}
          if (no[1] <= 99) {no[1] = "0"+no[1];}
          var item = document.createElement("tr");
          //item.innerHTML = "<td>"+no[0]+"-"+no[1]+line.分類+"</td>";
          item.innerHTML = "<td class='no'>" + line.編號 + "</td><td><ruby>"+line.四縣客家語+"<rt>"+line.四縣客語標音+"</rt></ruby><br>112 <audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/112/5/si/si-" + no[0]+"-"+no[1] + ".mp3' type='audio/mpeg'></audio><br>"+line.四縣華語詞義+"</td><td><span class='sentence'>" + line.四縣例句.replace(/"/g, '').replace(/\\n/g, '<br>') + "</span><br>112 <audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/112/5/si/si-" + no[0]+"-"+no[1] +"s.mp3' type='audio/mpeg'></audio><br>" + line.四縣翻譯.replace(/"/g, '').replace(/\\n/g, '<br>') + "</td>";
          table.appendChild(item);
        } else {continue;}
      }
      table.setAttribute("width","100%");
      contentContainer.appendChild(table);
    })
  });


  


        // var cat = document.querySelector('input[name="category"]:checked');
        //for (i=0; i<=data.length; i++) {
/*      };
/*      reader.readAsText(file);
    }
  });*/
  //contentContainer.innerHTML = arr[3].四縣翻譯;
}