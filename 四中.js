function csvToArray(str, delimiter = ",") { // https://github.com/codewithnathan97/javascript-csv-array-example/blob/master/index.html

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
  return arr;
}

function generate() {
  var contentContainer = document.getElementById("generated");
  const n = 85;
  for (let i = 1; i < n+1; i++) {
    if (i <= 9) {i = "0"+i;}
    if (i <= 99) {i = "0"+i;}
    var p = document.createElement("p");
    p.innerHTML = i + " 詞&nbsp;<audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/110/2/si/w/1si-01-" + i + ".mp3' type='audio/mpeg'></audio>" + " 句&nbsp;<audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/110/2/si/s/1si-01-" + i + "s.mp3' type='audio/mpeg'></audio>";
    contentContainer.appendChild(p);
  }
  
  document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        // document.getElementById('output').innerText = content;
        const data = csvToArray(content);
        // var raw = document.createElement("p");
        // raw.innerHTML = JSON.stringify(data); // 測試 okay 了
        // contentContainer.appendChild(raw);

        var table = document.createElement("table");
        for (i=0; i<=data.length; i++) {
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
          var no = data[i].編號.split("-");
          if (no[0] <= 9) {no[0] = "0"+no[0];}
          if (no[1] <= 9) {no[1] = "0"+no[1];}
          if (no[1] <= 99) {no[1] = "0"+no[1];}
          var item = document.createElement("tr");
          item.innerHTML = "<td>" + data[i].編號 + "</td><td>" + data[i].四縣例句.replace(/"/g, '').replace(/\\n/g, '<br>') + "</td><td>" + data[i].四縣翻譯.replace(/"/g, '').replace(/\\n/g, '<br>') + "</td><td><audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/110/2/si/w/1si-" + no[0]+"-"+no[1] + ".mp3' type='audio/mpeg'></audio>" + " 句&nbsp;<audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/110/2/si/s/1si-" + no[0]+"-"+no[1] +"s.mp3' type='audio/mpeg'></audio></td>";
          contentContainer.appendChild(item);
        }
        contentContainer.appendChild(table);
      };
      reader.readAsText(file);
    }
  });
}