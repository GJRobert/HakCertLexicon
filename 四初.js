function generate() {
  var contentContainer = document.getElementById("generated");
  const n = 53;
  for (let i = 1; i < n+1; i++) {
    if (i <= 9) {i = "0"+i;}
    var p = document.createElement("p");
    p.innerHTML = i + " 詞&nbsp;<audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/110/1/si/w/si-01-0" + i + ".mp3' type='audio/mpeg'></audio>" + " 句&nbsp;<audio class='media' controls='controls' preload='none' > <source src='https://elearning.hakka.gov.tw/hakka/files/cert/vocabulary/110/1/si/s/si-01-0" + i + "s.mp3' type='audio/mpeg'></audio>";
    contentContainer.appendChild(p);
  }
}