// VIEWS


// APP COMPONENT VIEWS
var Nav = function() {
  View.call(this, null);  
  delete this.model;
};

var Module = function(collection, options) {
  CollectionView.call(this, collection, null, options);
  
  if (!this.render) {
    this.render = function() { this.display(); };
  }
  
  if (!this.update) {
    this.update = function(action, data) {
      if (action == 'setWorkview' && data != this.workview) { this.hide(); }
    };
  }
  
  appView.observers.add('setWorkview', this);
};

var Popup = function() {
  View.call(this, null);
  delete this.model;
};


// ITEM VIEWS
var TextView = function(model, template, options) {
  View.call(this, model, template, options);
  
  workview = 'texts';
  
  // Moves to the next phrase in the text
  this.nextPhrase = function() {
    // Finds how many phrases are in the current text
    var numPhrases = app.preferences.currentText.phrases.length;
    
    // Gets the currently selected phrase
    var selected = $('.selected');
    
    // Removes the selection highlight from the currently selected phrase
    if (selected) {
      selected.classList.remove('selected');
    }
    
    // Increments the current phrase number, or resets to the start if you're already at the last phrase
    if (app.preferences.currentPhrase[1] == numPhrases-1) {
      app.preferences.currentPhrase[1] = 0;
    } else {
      app.preferences.currentPhrase[1] += 1;
    }
    
    // Adds the selection highlight to the newly selected phrase, then focuses on that phrase
    var newSelected = $('.phrase').filter(function(phrase) {
      return checkAgainst(app.preferences.currentPhrase, Breadcrumb.parse(phrase.dataset.breadcrumb))
    })[0];
    
    newSelected.classList.add('selected');
    var textItem = newSelected.querySelector('.content p:first-of-type');
    textItem.focus();
    range = new Range;
    range.selectNodeContents(textItem);
    range.collapse(false);
    selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  },
  
  // Moves to the previous phrase in the text
  this.prevPhrase = function() {
  },
  
  this.render = function(wrapper) {
    this.wrapper = wrapper;
    wrapper.innerHTML = '';
    
    var tv = this.template.content.querySelector('.text').cloneNode(true);
    
    // Render text abbreviation
    tv.querySelector('#abbrBox').value = this.model.abbreviation;
    
    // Render titles
    Object.keys(this.model.titles).forEach(function(key) {
      var li = createElement('li', { id: key });
      var label = createElement('label', { htmlFor: key });
      var p = createElement('p', { textContent: key });
      var input = createElement('input', { value: this.model.titles[key] || '', id: key, type: 'text' });
      input.classList.add('title');
      input.classList.add('unicode');
      
      label.appendChild(p);
      label.appendChild(input);
      li.appendChild(label);
      tv.querySelector('.titles').appendChild(li);
      
      input.addEventListener('blur', this.model.store);
    }, this);
    
    wrapper.appendChild(tv);
    
    this.el = tv;
    
    // Render phrases
    phrasesWrapper = this.el.querySelector('.phrases');
    phraseTemplate = $('#phraseTemplate');
    options.textAbbr = this.model.abbreviation;
    options.playable = true;
    
    var pv = new PhrasesView(this.model.phrases, phraseTemplate, options);
    pv.render(phrasesWrapper);
    
    // Load media
    var setMedia = function(media) {
      media.forEach(function(mediaObj) {
        var li = createElement('li');
        
        var audio = createElement('audio', {
          controls: true,
          src: URL.createObjectURL(mediaObj.file)
        });
        
        li.appendChild(audio);
        
        var img = createElement('img', { src: 'img/delete.svg', alt: 'delete this media from this text', id: mediaObj.id });
        img.classList.add('icon');
        
        li.appendChild(img);
        
        this.el.querySelector('.media').appendChild(li);
        
        img.addEventListener('click', function(ev) {
          this.model.media.forEach(function(mediaID, i) {
            if (mediaID = ev.target.id) { this.model.media.splice(i, 1); }
            this.model.store(function() { this.render(this.wrapper); }.bind(this));
          }, this);
        }.bind(this));
      }, this);
    }.bind(this);
    
    this.model.get('media', setMedia);
    
    // Add event listeners
    this.el.querySelector('#addMediaToTextButton').addEventListener('click', function() {
      var goButtonCallback = function(file) {
        var data = {
          file: file,
          textStart: null,
          textEnd: null
        };
        
        var media = new models.MediaFile(data);
        
        var addRender = function(mediaIDs) {
          media.addToCorpus();
          this.model.media.push(mediaIDs[0]);
          this.model.store();
          this.render(this.wrapper);
        }.bind(this);
        
        media.store(addRender);
      }.bind(this);
      
      popups.fileUpload.render(goButtonCallback);
    }.bind(this));
    
    this.el.querySelector('#deleteTextButton').addEventListener('click', function(ev) {
      this.hide();
      this.model.removeFromCorpus();
      appView.setWorkview('texts');
      this.notify('deleteText');
    }.bind(this));
      
    this.el.querySelector('.phrases').addEventListener('input', function(ev) {
      if (ev.target.classList.contains('phraseData')) {
        var crumb = Breadcrumb.parse(ev.target.parentNode.parentNode.dataset.breadcrumb);
        app.preferences.currentText.phrases[crumb[1]][ev.target.dataset.type][ev.target.dataset.ortho] = ev.target.textContent;
      }
    });
    
    this.el.querySelector('.text header').addEventListener('input', function(ev) {
      if (ev.target.classList.contains('title')) { this.model.titles[ev.target.id] = ev.target.value; }
      if (ev.target.id == 'abbrBox') { this.model.abbreviation = ev.target.value; }
    }.bind(this));
    
    this.el.querySelector('.text header').addEventListener('keyup', function(ev) {
      if (ev.keyCode == 13 || ev.keyCode == 27) {
        ev.target.blur();
        this.model.store();
        this.notify('headerChange');
      }
    }.bind(this));
    
    this.display();
  };
  
  this.update = function(action, data) {
    if (action == 'setWorkview' && data != this.workview) { this.hide(); }
    if (action == 'nextPhrase') { this.nextPhrase(); }
    if (action == 'prevPhrase') { this.prevPhrase(); }
  };
  
  // Event subscriptions
  appView.observers.add('nextPhrase', this);
  appView.observers.add('prevPhrase', this);
  appView.observers.add('setWorkview', this);
};

// Available options:
// checkable: Boolean - whether to include a checkbox with the phrase (default = false)
// - will wrap the phrase content (not the buttons or tags) in an <input>,
// - so clicking anywhere in the phrase checks the checkbox
// displayWords: Boolean - whether to render the phrase with words, or just phrase-level data (default = false)
// editable: Boolean - whether the phrase should be editable (default = false)
// playable: Boolean - whether to include a play button on the phrase (default = false)
// replaceNode: a DOM node that you want to replace with this new phrase view (default = null)
// - still requires you to specify the wrapper where the phrase is being inserted; replaceNode should always be a child of that wrapper
// taggable: Boolean - whether to display tags for this phrase (default = false)
// textAbbr: the text abbreviation to display with each phrase (usually taken from the text.abbreviation property) (default = null)
var PhraseView = function(model, template, options) {
  View.call(this, model, template, options);
  
  this.render = function(wrapper) {
    var pv = this.template.content.querySelector('.phrase').cloneNode(true);
    var contentWrapper = pv.querySelector('.content');
    
    if (!this.checkable) {
      pv.removeChild(pv.querySelector('input'));
    } else {
      pv.querySelector('input').id = 'phrase_' + this.model.breadcrumb[1];
      pv.querySelector('input').value = Breadcrumb.stringify(this.model.breadcrumb);
      pv.querySelector('label').htmlFor = 'phrase_' + this.model.breadcrumb[1];
    }
    
    if (!this.playable) { pv.removeChild(pv.querySelector('play')); }
    
    if (!this.taggable) { pv.removeChild(pv.querySelector('tag')); }
    
    pv.dataset.breadcrumb = Breadcrumb.stringify(model.breadcrumb);
    
    // Renders the human-readable key for each phrase for easy reference (the text abbreviation, if present, and the phrase number)
    var keyText = model.breadcrumb[1] + 1;
    if (options.textAbbr) { keyText = options.textAbbr + ': ' + keyText }
    var key = createElement('abbr', { textContent: keyText });
    contentWrapper.appendChild(key);
    
    // Renders each of the text items in the phrase
    var renderText = function(textHash, type) {
      Object.keys(textHash).forEach(function(ortho) {
        var p = createElement('p', { textContent: textHash[ortho], spellcheck: false });
        if (options.editable == true) {
          p.contentEditable = true;
        }
        p.dataset.type = type;
        p.dataset.ortho = ortho;
        p.classList.add('phraseData');
        p.classList.add('unicode');
        contentWrapper.appendChild(p);
      }, this);
    }.bind(this);
    
    renderText(this.model.transcripts, 'transcripts');
    renderText(this.model.transcriptions, 'transcriptions');
    if (this.displayWords) { console.log('No function written to display words yet.'); }
    renderText(this.model.translations, 'translations');
    renderText(this.model.notes, 'notes');
    
    // Renders the tags for the phrase
    if (this.taggable) {
      this.model.tags.forEach(function(tag) {
        tag.render(pv.querySelector('.tags'));
      });
    }
    
    if (this.replaceNode) {
      wrapper.insertBefore(pv, this.replaceNode);
      wrapper.removeChild(this.replaceNode);
    } else {
      wrapper.appendChild(pv);
    }
    
    this.el = pv;
  }.bind(this);
};

var TextsListView = function(texts) {
  CollectionView.call(this, texts);
  
  this.populateListItem = function(text, li) {
    li.dataset.id = text.id;
    li.classList.add('textsListItem');
    var checkbox = createElement('input', { type: 'checkbox', name: 'textCheckbox', value: text.id });
    li.appendChild(checkbox);
    var abbr = createElement('abbr', { textContent: text.abbreviation });
    li.appendChild(abbr);
    var title = createElement('p', { textContent: text.titles.Eng || '[click to display this text]' });
    title.classList.add('unicode');
    li.appendChild(title);
  };
  
  this.render = function(wrapper) {
    wrapper.innerHTML = '';
    createList(wrapper, this.collection, this.populateListItem);
  }.bind(this);
};

var PhrasesView = function(phrases, template, options) {
  CollectionView.call(this, phrases, template, options);
  
  this.render = function(wrapper) {
    this.el = wrapper;
    this.el.innerHTML = '';
    
    phrases.forEach(function(phrase) {
      var pv = new PhraseView(phrase, template, options);
      pv.render(this.el);
    }, this);
    
    this.addListeners();
  }.bind(this);
  
  // Phrase = the new phrase you want to render, phraseNode = the old node to replace
  this.rerenderPhrase = function(phrase, phraseNode) {
    options.replaceNode = phraseNode;
    var pv = new PhraseView(phrase, $('#phraseTemplate'), options);
    pv.render(this.el);
  }.bind(this);
  
  this.tagPhrase = function(phrase, phraseNode, callback) {
    popups.tag.getTag(function(tag) {
      tag.tag(phrase);
      phrase.store(function() {
        tag.tag(app.preferences.currentCorpus);
        if (typeof callback == 'function') { callback(); }
      });
    });
  };
  
  // Add event listeners
  this.addListeners = function() {
    this.el.addEventListener('click', function(ev) {
      if (ev.target.classList.contains('phrase')) {
        $('.phrase').forEach(function(phraseEl) { phraseEl.classList.remove('selected'); });
        ev.target.classList.add('selected');
        app.preferences.currentPhrase = Breadcrumb.parse(ev.target.dataset.breadcrumb);
      }

      if (ev.target.classList.contains('phraseData')) {
        var selected = $('.selected');
        if (selected.length > 0) { selected[0].classList.remove('selected'); }
        ev.target.parentNode.parentNode.parentNode.classList.add('selected');
        app.preferences.currentPhrase = Breadcrumb.parse(ev.target.parentNode.parentNode.parentNode.dataset.breadcrumb);
      }
      
      if (this.playable) {
        if (ev.target.classList.contains('play')) {
          var crumb = Breadcrumb.parse(ev.target.parentNode.dataset.breadcrumb);
          var phrase = this.collection.filter(function(phrase) {
            return Breadcrumb.stringify(phrase.breadcrumb) == ev.target.parentNode.dataset.breadcrumb;
          })[0];
          phrase.play();          
        }
      }
      
      if (this.taggable) {
        if (ev.target.classList.contains('tag')) {
          var phraseNode = ev.target.parentNode;
          var crumb = Breadcrumb.parse(phraseNode.dataset.breadcrumb);
          
          var phrase = this.collection.filter(function(phrase) {
            return Breadcrumb.stringify(phrase.breadcrumb) == phraseNode.dataset.breadcrumb;
          })[0];
          
          this.tagPhrase(phrase, phraseNode, function() {
            this.rerenderPhrase(phrase, phraseNode);
            this.notify('newTag');
          }.bind(this));
        }
      }
    }.bind(this));
    
    if (this.editable) {
      this.el.addEventListener('blur', function(ev) { app.preferences.currentText.store(); }, true);
      
      this.el.addEventListener('keydown', function(ev) {
        if (ev.keyCode == 13 || ev.keyCode == 27) {
          ev.preventDefault();
          ev.target.blur();
          app.preferences.currentText.store();
        }
      });
    }
  }.bind(this);
};