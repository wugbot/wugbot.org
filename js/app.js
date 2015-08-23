// APP

// Controls general app functionality
var app = {
  // Change this function to use popups.blank instead
  alert: function(text) {
    alert(text);
  },
  
  initialize: function() {
    var initSequence = function() {
      // Load the preferences
      if (localStorage.wugbotPreferences != 'undefined') { app.preferences = JSON.parse(localStorage.wugbotPreferences); }
      
      // Initialize app views
      appView = new AppView;
      appView.mainNav = new AppView.MainNav;
      appView.appNav = new AppView.AppNav;
      appView.navIcons = new AppView.NavIcons; // Needs to be ordered after mainNav and appNav
      appView.corpusSelector = new AppView.CorpusSelector;
      
      // Initialize popups
      popups.blank = new popups.Blank;
      popups.fileUpload = new popups.FileUpload;
      popups.manageCorpora = new popups.ManageCorpora;
      popups.settings = new popups.Settings;
      popups.tag = new popups.Tag;
      popups.user = new popups.User;
      
      // Set the current workview
      var setWorkview = function() {
        if (app.preferences.currentWorkview) {
          appView.setWorkview(app.preferences.currentWorkview);
        } else {
          appView.setWorkview();
        }
      };
      
      // Render the corpus selector and prompt for a new corpus if needed
      idb.getAll('corpora', function(corpora) {
        if (corpora.length == 0) {
          popups.manageCorpora.render();
        
        // Set preferences
        } else {
          if (app.preferences.currentCorpus) {
            app.preferences.currentCorpus = hydrate(app.preferences.currentCorpus);
            appView.corpusSelector.render(app.preferences.currentCorpus.id, setWorkview);
          } else {
            appView.corpusSelector.render();
          }
        }
        
        if (app.preferences.currentText) { app.preferences.currentText = hydrate(app.preferences.currentText); }
        
        if (app.preferences.display) {
          if (app.preferences.display) {
            if (app.preferences.display.overviewPane == 'closed') { appView.toggleOverviewPane(); }
            if (app.preferences.display.toolbar == 'closed') { appView.toggleToolbar(); }
          }
        } else {
          app.preferences.display = {
            overviewPane: 'open',
            toolbar: 'open'
          };
        }
        
        if (!app.preferences.currentPhrase) { app.preferences.currentPhrase = null; }
        
        // Key bindings (using Mousetrap)
        Mousetrap.bindGlobal(['alt+right', 'alt+down'], function() {
          if (app.preferences.currentPhrase && app.preferences.currentWorkview == 'texts') {
            appView.notify('nextPhrase');
          }
          return false;
        });

        Mousetrap.bindGlobal(['alt+left', 'alt+up'], function() {
          if (app.preferences.currentPhrase && app.preferences.currentWorkview == 'texts') {
            appView.notify('prevPhrase');
          }
          return false;
        });
        
        // Init observer system and add listeners
        Events.call(this);
        
        this.observers.add('setWorkview', appView);
      }.bind(this));
    };
    
    idb.open('WugbotDev', initSequence);
  },
  
  lastTagSearch: {},
  
  lastTextSearch: {},
  
  save: function() {
    localStorage.wugbotPreferences = JSON.stringify(app.preferences, null, 2);
  },
  
  setCorpus: function(corpusID) {
    idb.get(corpusID, 'corpora', function(results) {
      var corpus = results[0];
      this.preferences.currentText.store();
      this.preferences.currentText = null;
      this.preferences.currentCorpus.store();
      corpus.setAsCurrent();
      this.notify('setWorkview');
    }.bind(this))
  }.bind(this),
  
  tagSearch: function(tags, callback) {
    this.lastTagSearch = tags;
    app.preferences.currentCorpus.tagSearch(tags, function(results, tags) {
      if (typeof callback == 'function') { callback(results, tags); }
    });
  }.bind(this),
  
  textSearch: function(attribute, searchExpr, callback) {
    this.lastTextSearch = { attribute: attribute, searchExpr: searchExpr };
    searchExpr = new RegExp(searchExpr, 'g');
    app.searchResults = [];
    app.preferences.currentCorpus.textSearch(attribute, searchExpr, callback);
  }.bind(this),
  
  update: function(action, data) {
    if (action == 'newCorpus') {
      this.setCorpus(data);
    }
  }.bind(this),
  
  searchResults: [],
  
  preferences: {}
};


// APP VIEW
var AppView = function() {
  View.call(this);
  
  this.newModule = function(moduleType, data, options) {
    switch (moduleType) {
      case 'documentsOverview':
        modules.documentsOverview = new modules.DocumentsOverview(data);
        modules.documentsOverview.render();
        break;
      case 'lexiconOverview':
        modules.lexiconOverview = new modules.LexiconOverview(data);
        modules.lexiconOverview.render();
        break;
      case 'mediaOverview':
        modules.mediaOverview = new modules.MediaOverview(data);
        modules.mediaOverview.render();
        break;
      case 'orthographiesOverview':
        modules.orthographiesOverview = new modules.OrthographiesOverview(data);
        modules.orthographiesOverview.render();
        break;
      case 'tagsOverview':
        if (modules.tagsOverview) {
          modules.tagsOverview.tagsList.removeEventListener('click', modules.tagsOverview.listen);
        }
        modules.tagsOverview = new modules.TagsOverview(data);
        modules.tagsOverview.render();
        break;
      case 'tagger':
        if (modules.tagger) {
          modules.tagger.selectAllButton.removeEventListener('click', modules.tagger.selectAll);
          modules.tagger.bulkTagButton.removeEventListener('click', modules.tagger.bulkTag);
          modules.tagger.bulkUntagButton.removeEventListener('click', modules.tagger.bulkUntag);
          modules.tagger.searchBar.removeEventListener('submit', modules.tagger.runSearch);
          modules.tagger.taggingList.removeEventListener('click', modules.tagger.newTag);
        }
        modules.tagger = new modules.Tagger(data, options);
        modules.tagger.render();
        break;
      case 'textsOverview':
        app.preferences.currentCorpus.get('texts', function(texts) {
          if (modules.textsOverview) {
            modules.textsOverview.addExistingButton.removeEventListener('click', modules.textsOverview.addExisting);
            modules.textsOverview.importButton.removeEventListener('click', modules.textsOverview.importText);
            modules.textsOverview.removeSelectedButton.removeEventListener('click', modules.textsOverview.removeSelected);
            modules.textsOverview.textsList.removeEventListener('click', modules.textsOverview.renderText);
          }
          modules.textsOverview = new modules.TextsOverview(texts);
          modules.textsOverview.render();
        });
        break;
      default:
    }
  };
  
  this.selectedTags = [];
  
  this.setWorkview = function(workview) {
    if (!workview) { workview = 'texts'; }

    this.appNav.setButton(workview);
    
    this.notify('setWorkview', workview);
    
    switch (workview) {
      case 'documents':
        app.preferences.currentCorpus.get('documents', function(docs) {
          this.newModule('documentsOverview', docs);
        }.bind(this));
        break;
      case 'lexicon':
        this.newModule('lexiconOverview', null);
        break;
      case 'media':
        app.preferences.currentCorpus.get('media', function(media) {
          this.newModule('mediaOverview', media);
        }.bind(this));
        break;
      case 'orthographies':
        this.newModule('orthographiesOverview', null);
        break;
      case 'tags':
        this.newModule('tagsOverview', app.preferences.currentCorpus.tags);
        this.newModule('tagger');
        break;
      case 'texts':
        this.newModule('textsOverview');
        break;
      default:
    }
    
    app.preferences.currentWorkview = workview;
  }.bind(this);
  
  this.toggleOverviewPane = function() {
    if ($('#overviewPane').classList.contains('open')) {
      $('#collapseLeft').src = 'img/collapseRight.svg';
      app.preferences.display.overviewPane = 'closed';
    } else {
      $('#collapseLeft').src = 'img/collapseLeft.svg';
      app.preferences.display.overviewPane = 'open';
    }
    
    $('#overviewPane').classList.toggle('closed');
    $('#overviewPane').classList.toggle('open');
    $('#sideNav li:not(:first-child)').forEach(function(navButton) { navButton.classList.toggle('hideonDesktop'); });
  };
  
  this.toggleToolbar = function() {
    if ($('#toolbar').classList.contains('open')) {
      $('#collapseRight').src = 'img/collapseLeft.svg';
      app.preferences.display.toolbar = 'closed';
    } else {
      $('#collapseRight').src = 'img/collapseRight.svg';
      app.preferences.display.toolbar = 'open';
    }
    
    $('#toolbar').classList.toggle('closed');
    $('#toolbar').classList.toggle('open');
    $('#toolbarNav li:not(:first-child)').classList.toggle('hideonDesktop');
  };
  
  this.update = function(action, data) {
    if (action == 'appNavClick') { this.setWorkview(data); }
    if (action == 'newTagger') {
      this.newModule('tagsOverview', app.preferences.currentCorpus.tags);
      
      if (data) {
        this.newModule('tagger', data.results, data.options);
      } else {
        this.newModule('tagger');
      }
    }
    if (action == 'newTag') { this.newModule('tagsOverview', app.preferences.currentCorpus.tags); }
    if (action == 'textsListChange') { this.newModule('textsOverview'); }
  }.bind(this);
  
  $('#collapseLeft').addEventListener('click', this.toggleOverviewPane);
  $('#collapseRight').addEventListener('click', this.toggleToolbar);
};


// NAV VIEWS
AppView.AppNav = function() {
  Nav.call(this);
  
  this.el = $('#appNav');
  this.buttons = $('#appNav a');
  
  this.observers = [{ action: 'appNavClick', observer: appView }];
  
  this.setButton = function(workview) {
    this.buttons.forEach(function(button) {
      button.classList.remove('underline');
      if (button.textContent.toLowerCase() == workview) { button.classList.add('underline'); }
    }, this);
  };
  
  this.update = function(action, data) {
    if (data == 'boxIcon') {
      this.toggleDisplay();
      appView.mainNav.hide();
    }
  }.bind(this);
  
  this.el.addEventListener('click', function(ev) {
    appView.appNav.notify('appNavClick', ev.target.textContent.toLowerCase());
  });
};

AppView.CorpusSelector = function() {
  Nav.call(this);
  
  this.el = $('#corpusSelector');
  
  this.render = function(corpusID, callback) {
    idb.getAll('corpora', function(corpora) {
      this.el.innerHTML = '';
      
      var option = createElement('option', { textContent: 'Select a corpus', value: 'select' });
      this.el.appendChild(option);
      option.classList.add('unicode');
      
      corpora.forEach(function(corpus) {
        var option = createElement('option', { textContent: corpus.name, value: corpus.id });
        this.el.appendChild(option);
        option.classList.add('unicode');
      }, this);
      
      var option = createElement('option', { textContent: 'Manage corpora', value: 'manage' });
      this.el.appendChild(option);
      option.classList.add('unicode');

      if (corpusID) {
        this.el.value = corpusID;
      }
      
      if (typeof callback == 'function') { callback(); }
    }.bind(this));
  }.bind(this);
  
  this.el.addEventListener('change', function(ev) {
    if (ev.target.value == 'manage') {
      popups.manageCorpora.render();
      this.el.value = app.preferences.currentCorpus.id;
    } else if (ev.target.value != 'select') {
      var setCorpus = function(results) {
        app.preferences.currentCorpus = results[0];
        appView.setWorkview(app.preferences.currentWorkview);
      }.bind(this);
      
      idb.get(+ev.target.value, 'corpora', setCorpus);
    }
  }.bind(this));
};

AppView.MainNav = function() {
  Nav.call(this);
  
  this.el = $('#mainNav');
  
  this.update = function(action, data) {
    if (data == 'menuIcon') {
      this.toggleDisplay();
      appView.appNav.hide();
    }
  };
};

AppView.NavIcons = function() {
  Nav.call(this);
  
  this.el = $('#navIcons');
  
  this.observers = [
    { action: 'navIconClick', observer: appView.appNav },
    { action: 'navIconClick', observer: appView.mainNav }
  ];
  
  this.el.addEventListener('click', function(ev) { this.notify('navIconClick', ev.target.id); }.bind(this));
};


// MODULE VIEWS
var modules = {};

modules.DocumentsOverview = function(collection) {
  Module.call(this, collection);
  
  this.workview = 'documents';
  
  this.el = $('#documentsOverview');
};

modules.LexiconOverview = function(collection) {
  Module.call(this, collection);
  
  this.workview = 'lexicon';
  
  this.el = $('#lexiconOverview');
};

modules.MediaOverview = function(collection) {
  Module.call(this, collection);
  
  this.workview = 'media';
  
  this.el = $('#mediaOverview');
  this.mediaList = $('#mediaList');
  
  var populateListItem = function(media, li) {
    li.dataset.id = media.id;
    var p = createElement('p', { textContent: media.file.name });
    var img = createElement('img', { src: 'img/delete.svg', alt: 'remove this media file from this corpus'});
    img.classList.add('icon');
    li.appendChild(p);
    li.appendChild(img);
  };
  
  this.render = function() {
    createList(this.mediaList, this.collection, populateListItem);
    this.display();
  };
};

modules.OrthographiesOverview = function(collection) {
  Module.call(this, collection);
  
  this.workview = 'orthographies';
  
  this.el = $('#orthographiesOverview');
};

modules.Tagger = function(searchResults, options) {
  Module.call(this, searchResults, options);
  
  this.workview = 'tags';
  
  this.bulkTagButton = $('#bulkTagButton');
  this.bulkUntagButton = $('#bulkUntagButton');
  this.el = $('#tagger');
  this.resultsCounter = $('#resultsCounter');
  this.searchBar = $('#searchBar');
  this.searchBox = $('#tagSearchBox');
  this.selectAllButton = $('#taggerSelectAllButton');
  this.taggingList = $('#taggingList');

  this.bulkTag = function() {
    var getCrumbs = function(tag) {
      tag.tag(app.preferences.currentCorpus);
      
      var crumbs = this.getSelected();
      
      crumbs.forEach(function(crumb, i, arr) {
        var resultsToTag = this.collection.filter(function(result) {
          return Breadcrumb.stringify(result.breadcrumb) == Breadcrumb.stringify(crumb);
        });
        
        resultsToTag.forEach(function(resultToTag) {
          tag.tag(resultToTag);
          resultToTag.store();
        });
        
        if (i == arr.length-1) {
          var notify = function(results, tags) {
            this.notify('newTagger', { results: results, options: { lingType: tags[0].lingType }})
          }.bind(this);

          app.tagSearch(tag, notify);
        }
      }, this);
    }.bind(this);

    popups.tag.getTag(getCrumbs);
  }.bind(this);
  
  this.bulkUntag = function() {
    var tag;
    
    var getCrumbs = function(returnedTag) {
      tag = returnedTag;
      var response = confirm('Are you sure you want to delete this tag from these items? This cannot be undone.');
      
      if (response) {
        var crumbs = this.getSelected();
        idb.getBreadcrumb(crumbs, removeTag);
      }
    }.bind(this);
    
    var onLastResult = function() {
      app.preferences.currentCorpus.store();
      app.preferences.currentCorpus.cleanupTags(function() {
        var notify = function(results, tag) {
          this.notify('newTagger', { data: results, options: { lingType: tag.lingType } });
        }.bind(this);
        
        app.tagSearch(app.lastTagSearch, notify);
      }.bind(this));
    }.bind(this);

    var removeTag = function(results) {
      results.forEach(function(result, i) {
        tag.untag(result);
        result.store();
        if (i == results.length-1) { onLastResult(); }
      });
    };
    
    popups.tag.getTag(getCrumbs);
  }.bind(this);
  
  // Returns the BREADCRUMBS of the selected phrases
  this.getSelected = function() {
    var checkboxes = $('input[name=phraseCheckbox]');
    if (!checkboxes.length) { checkboxes = toArray(checkboxes); }
    
    var selected = checkboxes.filter(function(checkbox) { return checkbox.checked == true; });
    var crumbs = selected.map(function(checkbox) { return Breadcrumb.parse(checkbox.value); });
    return crumbs;
  };

  this.listResults = function() {
    if (this.collection) {
      this.resultsCounter.innerHTML = 'Results found: ' + this.collection.length;
    }
    
    var renderResults = function() {
      this.taggingList.innerHTML = '';

      switch (this.lingType) {
        case 'text':
          console.log('Rendering tags by text!');
          break;
        case 'phrase':
          this.collection = new models.Phrases(this.collection);
          
          var pv = new PhrasesView(this.collection, $('#phraseTemplate'), {
            checkable: true,
            playable: true,
            taggable: true
          });
          
          pv.render(this.taggingList);
          
          pv.observers.add('newTag', appView);
          
          break;
        default:
      }
    }.bind(this);
    
    app.preferences.currentCorpus.getAbbrevs(renderResults);
  };

  this.render = function() {
    this.listResults();
    this.display();
  };

  this.runSearch = function(ev) {
    ev.preventDefault();
    var options = Array.prototype.slice.call(document.getElementsByName('field'));
    var selected = options.filter(function(option) { return option.checked; });
    
    this.textSearch(selected[0].value, this.searchBox.value);
  }.bind(this);

  this.tagSearch = function(tags) {
    var notify = function(results, tags) {
      app.lastTagSearch = tags;
      this.notify('newTagger', { results: results, options: { lingType: tags[0].lingType } });
    }.bind(this);

    app.tagSearch(tags, notify);
  }.bind(this);
  
  this.textSearch = function(attribute, searchExpr) {
    var notify = function(results, lingType) {
      app.lastTextSearch = { attribute: attribute, searchExpr: searchExpr };
      this.notify('newTagger', { results: results, options: { lingType: lingType } });
    }.bind(this);
    
    app.textSearch(attribute, searchExpr, notify);
  };
  
  this.selectAll = function() {
    var checkboxes = $('#taggingList input');
    if (!checkboxes.length) { checkboxes = toArray(checkboxes); }
    
    if (checkboxes.some(function(checkbox) { return checkbox.checked == true; })) {
      var response = confirm('You already have some items selected. Are you sure you want to select all items instead?');
    } else { var response = true; }

    if (response) {
      checkboxes.forEach(function(checkbox) { checkbox.checked = true; });
    }
  };
  
  this.observers.add('newTagger', appView);
  
  this.bulkTagButton.addEventListener('click', this.bulkTag);
  this.bulkUntagButton.addEventListener('click', this.bulkUntag);
  this.searchBar.addEventListener('submit', this.runSearch);
  this.selectAllButton.addEventListener('click', this.selectAll);
};

modules.TagsOverview = function(collection) {
  Module.call(this, collection);
  
  if (!collection) { this.collection = app.preferences.currentCorpus.tags; }
  
  this.collection.sort(function(a, b) {
    if (a.lingType > b.lingType) {return 1; }
    if (a.lingType < b.lingType) { return -1; } else {
      if (a.category > b.category) { return 1; }
      if (a.category < b.category) { return -1; } else {
        if (a.value > b.value) { return 1; }
        if (a.valueu < b.value) { return -1; } else {
          return 0;
        }
      }
    }
  });
  
  this.workview = 'tags';
  
  this.el = $('#tagsOverview');
  this.tagsList = $('#tagsList');
  
  this.listTags = function() {
    this.tagsList.innerHTML = '';
    
    var lingTypes = getUnique('lingType', this.collection);
    
    if (lingTypes.length == 0) {
      var message = createElement('h3', { textContent: 'There are no tags in this corpus! Start adding some tags to your data and the tags will show up here.' });
      message.classList.add('tagGroup');
      this.tagsList.appendChild(message);
    }
    
    lingTypes.forEach(function(lingType) {
      var lingTypeli = createElement('li');
        var h2 = createElement('h2', { textContent: lingType });
        h2.dataset.tag = lingType;
        lingTypeli.appendChild(h2);
        var catwrapper = createElement('ul');
        lingTypeli.appendChild(catwrapper);
        
        var oflingType = this.collection.filter(function(tag) { return tag.lingType == lingType; });
        var categories = getUnique('category', oflingType);
        
        categories.forEach(function(category) {
          var catli = createElement('li');
          catli.classList.add('tagGroup');
            var h3 = createElement('h3', { textContent: category });
            h3.classList.add('tagCategory');
            h3.dataset.tag = lingType + ':' + category;
            catli.appendChild(h3);
            var valwrapper = createElement('ul');
            catli.appendChild(valwrapper);
            
            var oflingTypeCat = oflingType.filter(function(tag) { return tag.category == category; });
            var values = getUnique('value', oflingTypeCat);
            values.forEach(function(value) {
              if (value) {
                var valueli = createElement('li', { textContent: value });
                valueli.dataset.tag = lingType + ':' + category + ':' + value;
                valueli.classList.add('tagValue');
                valwrapper.appendChild(valueli);
              }
            });
          catwrapper.appendChild(catli);
        }, this);
      this.tagsList.appendChild(lingTypeli);
    }, this);
  }.bind(this);
  
  this.tagMenu = function(ev) {
    ev.preventDefault();
    if (ev.target.classList.contains('tagCategory') || ev.target.classList.contains('tagValue')) {
      new popups.Menu(ev, [
        {
          text: 'Edit tag',
          callback: function() {
            console.log('Editing tag!');
          }
        },
        {
          text: 'Delete tag',
          callback: function() {
            app.preferences.currentCorpus.removeTag(models.Tag.parse(ev.target.dataset.tag), function() {
              modules.tagsOverview.notify('newTagger');
            }.bind(this));
          }.bind(this)
        }
      ]);
    }
  };
  
  this.render = function() {
    this.listTags();
    this.display();
  };
  
  this.observers.add('newTagger', appView);
  
  this.listen = function(ev) {
    if (ev.target.dataset.tag) {
      var tag = models.Tag.parse(ev.target.dataset.tag);
      
      if (ev.ctrlKey) {
        appView.selectedTags.push(tag);
      } else {
        appView.selectedTags = [tag];
      }
      
      var notify = function(results, tags) {
        this.notify('newTagger', { results: results, options: { lingType: tags[0].lingType } });
      }.bind(this);
      
      app.tagSearch(appView.selectedTags, notify);
    }
  }.bind(this);
  
  this.tagsList.addEventListener('click', this.listen);
  this.tagsList.addEventListener('contextmenu', this.tagMenu)
};

modules.TextsOverview = function(collection) {
  Module.call(this, collection);
  
  this.workview = 'texts';
  
  this.el = $('#textsOverview');
  this.addExistingButton = $('#addExistingTextButton');
  this.importButton = $('#importTextButton');
  this.removeSelectedButton = $('#removeSelectedTextsButton');
  this.textsList = $('#textsList');
  
  this.resetAddExistingButton = function() {
    if (this.addExistingButton != 'Add existing text') {
      this.addExistingButton.textContent = 'Add existing text';
      this.textsList.addEventListener('click', this.renderText);
      display(this.removeSelectedButton);
    }
  }.bind(this);
  
  this.addExisting = function() {
    if (this.addExistingButton.textContent == 'Add existing text') {
      this.textsList.removeEventListener('click', this.renderText);
      this.listExisting();
      this.addExistingButton.textContent = 'Add selected texts to corpus';
      hide(this.removeSelectedButton);
    } else {
      this.resetAddExistingButton();
      var selected = $('input[name=textCheckbox]:checked');
      if (!selected.length) { selected = toArray(selected); }
      this.textsList.innerHTML = '';
      selected.forEach(function(checkbox) { app.preferences.currentCorpus.texts.push(+checkbox.value); });
      app.preferences.currentCorpus.store(this.notify('textsListChange'));
    }
  }.bind(this);
  
  this.importText = function() {    
    popups.fileUpload.render(function(file) {
      var importText = function(text) {
        var incorporate = function(textIDs) {
          text.id = textIDs[0];
          Breadcrumb.reset(text);
          text.addToCorpus();

          var setView = function() { appView.setWorkview('texts'); };
          
          text.store(setView);
        };
        
        text.store(incorporate);
      };
      
      tools.elan2json(file, ekegusiiColumns, importText);
    });
  };
  
  this.listExisting = function() {
    var render = function(texts) {
      var tl = new TextsListView(texts);
      tl.render(this.textsList);
    }.bind(this);
    
    idb.getAll('texts', render);
  };
  
  this.removeSelected = function() {
    var selected = $('#textsList input:checked');
    if (!selected.length) { selected = toArray(selected); }
    var ids = selected.map(function(input) { return +input.value; });
    app.preferences.currentCorpus.remove(ids, 'texts');
    this.notify('textsListChange');
  }.bind(this);
  
  this.render = function() {
    var tl = new TextsListView(this.collection);
    tl.render(this.textsList);
    this.display();
  }.bind(this);

  this.renderText = function renderText(ev) {
    if (ev.target.tagName == 'P') {
      var text = this.collection.filter(function(text) {
        return text.id == +ev.target.parentNode.dataset.id;
      })[0];
      
      var renderFunction = function(text) {
        var tv = new TextView(text, $('#textTemplate'), {
          editable: true,
          playable: true,
          taggable: true
        });
        tv.render($('#detailsPane .displayArea'));
        tv.observers.add('headerChange', this);
        tv.observers.add('deleteText', this);
        text.setAsCurrent();
      }.bind(this);

      text.render(renderFunction);
    }
  }.bind(this);
  
  this.update = function(action, data) {
    if (action == 'setWorkview') {
      this.textsList.removeEventListener('click', this.renderText);
      if (data != this.workview) { this.hide(); }
    } else if (action == 'deleteText' || action == 'headerChange') {
      var tl = new TextsListView(this.collection);
      tl.render(this.textsList);
    }
  }.bind(this);
  
  // Observers
  this.observers.add('textsListChange', appView);
  
  // Event listeners
  this.addExistingButton.addEventListener('click', this.addExisting);
  this.importButton.addEventListener('click', this.importText);
  this.removeSelectedButton.addEventListener('click', this.removeSelected);
  this.textsList.addEventListener('click', this.renderText);
};


// POPUP VIEWS
var popups = {};

popups.Blank = function() {
  Popup.call(this);
  
  this.displayArea = $('#blankPopup .displayArea');
  this.el = $('#blankPopup');
  
  this.render = function(renderFunction) {
    this.displayArea.innerHTML = '';
    if (typeof renderFunction == 'function') { renderFunction(this.displayArea); }
    this.display();
  }.bind(this);
};

popups.FileUpload = function() {
  Popup.call(this);
  
  this.button = $('#fileUploadButton');
  this.el = $('#fileUploadPopup');
  this.input = $('#fileUpload');

  // Applies the callback function to the uploaded file when the 'Go' button is clicked
  this.render = function(goButtonCallback) {
    var processFile = function() {
      if (typeof goButtonCallback != 'function') {
        console.log('Define a function to run when the Go button is clicked.');
      } else {
        goButtonCallback(this.input.files[0]);
      }
      
      this.hide();
      
      this.button.removeEventListener('click', processFile);
    }.bind(this);
    
    this.button.addEventListener('click', processFile);
    
    this.display();
  };
};

popups.ManageCorpora = function() {
  Popup.call(this);
  
  this.form = $('#newCorpusForm');
  this.corpusList = $('#corpusList');
  this.el = $('#manageCorporaPopup');
  this.input = $('#corpusNameBox');
  
  this.render = function() {
    var populateListItem = function(corpus, li) {
      var input = createElement('input', { value: corpus.name, lingType: 'text' });
      input.id = corpus.id;
      li.appendChild(input);
      input.addEventListener('input', function(ev) {
        corpus.name = ev.target.value;
        corpus.store(appView.corpusSelector.render);
      });
    };
    
    var renderList = function(corpora) {
      createList(this.corpusList, corpora, populateListItem);
      this.display();
    }.bind(this);
    
    idb.getAll('corpora', renderList);
  }.bind(this);
  
  this.observers.add('newCorpus', app);
  
  this.form.addEventListener('submit', function(ev) {
    ev.preventDefault();

    var corpus = new models.Corpus({ name: this.input.value });
        
    corpus.store(function(corpusIDs) {
      this.notify('newCorpus', corpusIDs[0]);
    }.bind(this));
    
    this.hide();
  }.bind(this));
};

// ev is the click event that should trigger the menu popup
// - this function grabs the XY coordinates from that event to know where to render the popup
// menuItems is an array of hashes, one for each list item to be displayed in the menu
// Each menuItem hash has two attributes:
// - text: the text content to display for that item in the menu
// - callback: the function to be run when that menu item is clicked
// The menu renders automatically when called - no need to call a .render() method
popups.Menu = function(ev, menuItems) {
  Popup.call(this);
  
  this.el = $('#menu');
  this.el.innerHTML = '';
  
  this.el.style.top = ev.clientY + 'px';
  this.el.style.left = ev.clientX + 'px';
  
  menuItems.forEach(function(menuItem) {
    var li = createElement('li', { textContent: menuItem.text });
    this.el.appendChild(li);
    li.addEventListener('click', menuItem.callback);
  }, this);
  
  this.display();
};

popups.Settings = function() {
  Popup.call(this);
  
  this.el = $('#settingsPopup');
  this.icon = $('#settingsIcon');
  
  this.icon.addEventListener('click', this.toggleDisplay);
};

popups.Tag = function() {
  Popup.call(this);
  
  this.getTag = function(callback) {
    var makeTag = function(category, value) {
      var tag = new models.Tag({ lingType: 'phrase', category: category, value: value });
      if (typeof callback == 'function') { callback(tag); }
    }.bind(this);
    
    popups.tag.render(makeTag);
  }.bind(this);

  this.el = $('#tagPopup');
  this.form = $('#tagPopup form');
  this.categoryInput = $('#categoryInput');
  this.valueInput = $('#valueInput');
  
  this.render = function(callback) {
    this.callback = callback;
    this.display();
    this.categoryInput.focus();
  }.bind(this);
  
  this.submit = function(ev) {
    ev.preventDefault();
    if (typeof this.callback == 'function') { this.callback(this.categoryInput.value, this.valueInput.value); }
    this.hide();
  }.bind(this);
  
  this.form.addEventListener('submit', this.submit);
};

popups.User = function() {
  Popup.call(this);
  
  this.icon = $('#userIcon');
  
  var renderFunction = function(displayArea) {
    var exportButton = createElement('button', { textContent: 'Export entire database', value: 'Export entire database', type: 'button' });
    displayArea.appendChild(exportButton);
    var header = createElement('h1', { textContent: 'Texts I’ve Created' });
    displayArea.appendChild(header);
    var deleteButton = createElement('button', { textContent: 'Permanently delete selected texts', value: 'Permanently delete selected texts', type: 'button' });
    displayArea.appendChild(deleteButton);
    var textsList = createElement('ul');
    displayArea.appendChild(textsList);
    
    var renderTextsList = function(texts) {
      var tl = new TextsListView(texts);
      tl.render(textsList);
    };
    
    idb.getAll('texts', renderTextsList);
    
    deleteButton.addEventListener('click', function() {
      var choice = confirm('Are you sure you want to permanently delete these texts?');
      if (choice == true) {
        popups.blank.hide();
        var selected = $('#blankPopup input:checked');
        if (!selected.length) { selected = toArray(selected); }
        var ids = selected.map(function(input) { return +input.value; });
        
        var remove = function(corpora) {
          app.preferences.currentCorpus.remove(ids, 'texts');
          
          corpora.forEach(function(corpus, i) {
            if (i == corpora.length-1) {
              var removeFromIDB = function() {
                idb.remove(ids, 'texts', appView.setWorkview);
              };
              
              corpus.remove(ids, 'texts', removeFromIDB);
            } else {
              corpus.remove(ids, 'texts');
            }
          });
          
        };
        
        idb.getAll('corpora', remove);
      }
    });
    
    exportButton.addEventListener('click', function() {
      var download = function(exported) {
        var file = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(file);
        var a = createElement('a', { download: idb.database.name + '.json', href: url, textContent: 'link' });
        a.click();
      };
      
      idb.export(download);
    });
  };
  
  this.render = function() {
    popups.blank.render(renderFunction);
  };
  
  this.icon.addEventListener('click', this.render);
};


// EVENT LISTENERS
$('#popups').addEventListener('click', function(ev) {
  if (ev.target.classList.contains('icon')) { popups[ev.target.parentNode.id.replace('Popup', '')].hide(); }
});

window.addEventListener('keydown', function(ev) {
  if (ev.keyCode == 9 && app.preferences.currentPhrase && app.preferences.currentWorkview == 'texts') {
    ev.preventDefault();

    if (app.preferences.currentPhrase[0] == app.preferences.currentText.id) {
      app.preferences.currentText.phrases[app.preferences.currentPhrase[1]].play();
      
    } else {
      var playAudio = function(results) {
        results[0].phrases[app.preferences.currentPhrase[1]].play();
      };
      
      idb.get(app.preferences.currentPhrase[0], 'texts', playAudio);
    }
  }
});

window.addEventListener('click', function() {
  hide($('#menu'));
});
window.addEventListener('load', app.initialize);
window.addEventListener('unload', app.save);