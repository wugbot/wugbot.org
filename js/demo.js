// Intro Demo

var nodes = {
  charCount: document.querySelector('#charCount'),
  entries: document.querySelector('#entries'),
  transcriptionBox: document.querySelector('#transcriptionBox'),
  translationBox: document.querySelector('#translationBox'),
  wordsArea: document.querySelector('#inputArea .words')
};

var delimiters = [' ', '.', ',', '!', '?', ':', ';', '/', '\\', '[', '\\]', '{', '}', '<', '>', '-', '\u3000', '\u00A1', '\u00BF', '\u0022', '\u0027', '\u00AB', '\u00BB', '\u2018', '\u2019', '\u201A', '\u201B', '\u201C', '\u201D', '\u201E', '\u201F', '\u2039', '\u203A', '\u300C', '\u300D', '\u300E', '\u300F', '\u301D', '\u301E', '\u301F', '\uFE41', '\uFE42', '\uFE43', '\uFE44', '\uFF02', '\uFF07', '\uFF62', '\uFF63'];

var phrase = {
  transcription: '',
  translation: '',
  words: []
};

function Word(token) {
  this.token = token;
  this.gloss = '';
  this.partOfSpeech = '';
};

// Functions
function displayDict() {
  entries.innerHTML = '';
  
  phrase.words.forEach(function(word) {
    var entry = document.querySelector('#entry').content.cloneNode(true);
    entry.querySelector('.headword').textContent = word.token;
    entry.querySelector('.wordPOS').textContent = word.partOfSpeech;
    entry.querySelector('.definition').textContent = word.gloss;
    entries.appendChild(entry);
  });
};

function displayIL() {
  document.querySelector('.transcription').textContent = phrase.transcription;
  
  document.querySelector('#interlinearGloss .words').innerHTML = '';
  
  phrase.words.forEach(function(word) {
    var wordView = document.querySelector('#wordTemplate').content.cloneNode(true);
    wordView.querySelector('.wordToken').textContent = word.token;
    wordView.querySelector('.wordGloss').textContent = word.gloss;
    wordView.querySelector('.wordPOS').textContent = word.partOfSpeech;
    document.querySelector('#interlinearGloss .words').appendChild(wordView);
  });
  
  document.querySelector('.translation').textContent = phrase.translation;
};

function displayJSON() {
  document.querySelector('#jsonArea').textContent = JSON.stringify(phrase, null, 2);
  
  displayViz();
};

/*function displayStats() {
  nodes.charCount.innerHTML = '';
  var uniqueChars = [];
  var rawChars = phrase.transcription.split('');
  
  rawChars.forEach(function(chr) {
    var some = uniqueChars.some(function(c) { return c == chr; });
    if (!some) { uniqueChars.push(chr); }
  });
  
  uniqueChars.forEach(function(chr) {
    var count = rawChars.filter(function(c) { return c == chr; }).length;
    var li = document.createElement('li');
    li.textContent = chr + ' : ' + count;
    charCount.appendChild(li);
  });
};*/

function displayWords() {
  nodes.wordsArea.innerHTML = '';
  
  phrase.words.forEach(function(word, i) {
    var wordView = document.querySelector('#wordInputTemplate').content.cloneNode(true);
    wordView.querySelector('.wordToken').textContent = word.token;
    wordView.querySelector('.wordGloss').dataset.index = i;
    nodes.wordsArea.appendChild(wordView);
  });
};

function displayViz() {
  displayIL();
  //displayStats();
  displayDict();
};

function download() {
  var file = new Blob([JSON.stringify(phrase, null, 2)], { type: 'application.json' })
  var a = document.createElement('a');
  var url = URL.createObjectURL(file);
  a.download = 'myData.json';
  a.href = url;
  document.body.appendChild(a);
  a.click();
};

function tokenize() {
  var regExp = new RegExp('[(' + delimiters.join(')(') + ')]+', 'g');
  return phrase.transcription.split(regExp).filter(Boolean);
};

function updatePhrase() {
  phrase.transcription = nodes.transcriptionBox.value;
  phrase.translation = nodes.translationBox.value;
  phrase.words = tokenize().map(function(token) { return new Word(token); });
  
  updateWords();
  displayJSON();
};

function updateWords() {
  var glossBoxes = Array.prototype.slice.call(document.querySelectorAll('#inputArea .wordGloss')).forEach(function(glossBox, i) {
    if (glossBox.textContent != 'gloss') { phrase.words[i].gloss = glossBox.textContent; }
  });
  
  var posBoxes = Array.prototype.slice.call(document.querySelectorAll('#inputArea .wordPOS')).forEach(function(posBox, i) {
    if (posBox.value != 'select') { phrase.words[i].partOfSpeech = posBox.value; }
  });
  
  displayJSON();
};

function update() {
  updatePhrase();
  updateWords();
  displayWords();
};

function runDemo() {
  var introDemo = introJs();
  var secondTimeOnInput = false;
  introDemo.setOptions({
    steps: demoSteps,
    showStepNumbers: false,
    showButtons: false,
    showProgress: true
  }).onbeforechange(function(targetElement){
      if (targetElement.id=="inputArea"){
        
        if (secondTimeOnInput){
          document.querySelector('#transcriptionBox').value="Esta frase es un ejemplo.";
          document.querySelector('#translationBox').value="This sentence is an example.";
          update();
          
          var exampleGlosses=['This','sentence','is','an','example'];
          var examplePosIndeces=[3,1,2,3,1];
    Array.prototype.slice.call(document.querySelectorAll('#inputArea .wordGloss')).forEach(function(glossBox, i) {
            glossBox.textContent=exampleGlosses[i];
          }); 
    Array.prototype.slice.call(document.querySelectorAll('#inputArea .wordPOS')).forEach(function(posBox, i) {
            posBox.selectedIndex=examplePosIndeces[i];
          });
          
          updatePhrase();
          updateWords();
          updateBarchart();
        }
        secondTimeOnInput=true;
      }
  }).oncomplete(function(){
    localStorage.setItem('introFinished',true);
  }).start();
}

//stats!!


var Barchart = function(data, el){
   var self = this;

   this.el = el;
   this.data = data;
   this.keys = Object.keys(this.data);
   this.values = this.keys.map(function(d){ return data[d] });
   this.max = Math.max.apply(Math, this.values);
   this.bars = Object.keys(this.data).length;

}

Barchart.prototype.render = function(){
   var self = this;
   self.el.innerHTML = '';
   Object.keys(self.data).forEach(function(letter){
     var bar = self.drawBar(self.data[letter]);
     bar.textContent = letter ;
     self.el.appendChild(bar)
   })
}

Barchart.prototype.drawBar = function(value){
  var bar = document.createElement('div');
  bar.classList.add('bar');
  var percentage = (value / (this.max + 10)) * 100;
  bar.style.height = percentage + '%'  ; 
  return bar;
}


function phonemize(string) {
//Gets rid of non-word characters, makes everything lower case, and outputs phonemes (letters)
  var text2 = string.replace(/\W+/g,"");
  var text3 = text2.replace(/\d+/g, '');
  var text4 = text3.toLowerCase();
  var phonemes = text4.split('');
  return phonemes;
};

var count = function (sequence) {
  return sequence.reduce(function (tally, item) {
    if (!(item in tally)) {
      tally[item] = 0
    }
    tally[item] += 1;
    return tally 
  }, {})
}



function updateBarchart(){
    var tally = count(phonemize(nodes.transcriptionBox.value));
    var barchart = new Barchart(tally, document.querySelector('#chart'));
    barchart.render();
};


// Event listeners
document.querySelector('#downloadButton').addEventListener('click', download);
document.querySelector('#demoRestartButton').addEventListener('click', runDemo);
nodes.transcriptionBox.addEventListener('input', update);
nodes.transcriptionBox.addEventListener('input', updateBarchart);
nodes.translationBox.addEventListener('input', updatePhrase);
nodes.wordsArea.addEventListener('change', updateWords);
nodes.wordsArea.addEventListener('focus', function(ev) {
  if (ev.target.classList.contains('wordGloss')) { ev.target.textContent = ''; }
}, true);
nodes.wordsArea.addEventListener('input', updateWords);
window.addEventListener('load', displayJSON);
window.addEventListener('load', runDemo);