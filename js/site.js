// SITE
// - Polyfills
// - Generally useful functions (e.g. DOM selector)
// - General site-wide Javascript

//POLYFILLS
// Polyfill for the String.prototype.startsWith() method
// MDN says it's supported in Chrome and Firefox, but it doesn't seem to be working in Chrome
if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function(searchString, position) {
      position = position || 0;
      return this.lastIndexOf(searchString, position) === position;
    }
  });
}

// Polyfill for the String.prototype.includes() method
if (!String.prototype.includes) {
  String.prototype.includes = function() {'use strict';
    return String.prototype.indexOf.apply(this, arguments) !== -1;
  };
}

// GENERAL FUNCTIONS
// DOM selector - returns a single node or an array of nodes (not a node list)
var $ = function(selector) {
  var
    nodeList = document.querySelectorAll(selector),
    nodes = Array.prototype.slice.call(nodeList);
    
  var selected = nodes.length == 1 ? nodes[0] : nodes;
  return selected;
}.bind(document);

function tryDemo() {
  if (!localStorage.getItem('introFinished')){
    var homePageIntro=introJs();
    if (localStorage.getItem('introStarted')){
      homePageIntro.setOptions({
        steps: homePageRevisitSteps
      }).start();
    }
    else{
      localStorage.setItem('introStarted', true);
      homePageIntro.setOptions({
        steps: homePageSteps,
        showStepNumbers: false,
        showButtons: false
      }).start();
    } 
  }
}

window.addEventListener('load', tryDemo);