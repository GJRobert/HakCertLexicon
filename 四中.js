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
}