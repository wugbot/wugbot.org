// MODELS

models = {};

// ITEM MODELS (SINGULAR)
models.Document = function(data) {
  Model.call(this, data);
  // Maybe some methods to read the file to an array buffer, etc.
};

models.MediaFile = function MediaFile(data) {
  Model.call(this, data);
  
  Object.defineProperties(this, {
    'addToCorpus': {
      value: function() {
        app.preferences.currentCorpus.add(this.id, 'media');
      }.bind(this)
    },
    
    'removeFromCorpus': {
      value: function() {
        app.preferences.currentCorpus.remove(this.id, 'media');
      }.bind(this)
    }
  });
};

models.Corpus = function Corpus(data) {
  Model.call(this, data);
  
  if (!this.documents) { this.documents = []; }
  if (!this.languages) { this.languages = []; }
  if (!this.lexicons) { this.lexicons = []; }
  if (!this.media) { this.media = []; }
  if (!this.texts) { this.texts = []; }
  if (!this.tags) { this.tags = []; }
  
  this.tags = new models.Tags(this.tags);
  
  Object.defineProperties(this, {
    // Use this rather than .push() when you don't want to accidentally duplicate IDs
    'add': {
      value: function(idsToAdd, type) {
        if (!idsToAdd.length) { idsToAdd = toArray(idsToAdd); }
        
        idsToAdd.forEach(function(id) {
          if (hasID(this[type], id)) { this[type].push(id); }
        }, this);
        
        this.store();
      }.bind(this)
    },
    
    // Removes any unused tags from the corpus' tags array
    // Then finds all tags in the corpus, and makes sure they're in the corpus tags array
    'cleanupTags': {
      value: function(callback) {
        var addMissingTags = function() {
          this.pullTags(function(tags) {
            tags.forEach(function(tag, i) {
              tag.tag(this);
            }, this);
          }.bind(this));
        }.bind(this);
        
        var checkToRemove = function(results, tags) {
          if (results.length == 0) { tags[0].untag(this); }
        }.bind(this);
        
        var removeUnusedTags = function() {
          this.tags.forEach(function(tag, i, arr) {
            this.tagSearch(tag, checkToRemove);
          }, this);
        }.bind(this);
        
        addMissingTags();
        removeUnusedTags();
        if (typeof callback == 'function') { callback(); }
      }.bind(this)
    },

    'deleteTag': {
      value: function(tag) {
        tag.untag(this);
        
        this.store();
        
        var removeTags = function(texts) {
          texts.forEach(function(text) {
            tag.untag(text);
            
            text.phrases.forEach(function(phrase) {
              tag.untag(phrase);
              phrase.words.forEach(function(word) {
                tag.untag(word);
                word.morphemes.forEach(function(morpheme) {
                  tag.untag(morpheme);
                });
              });
            });
            
            text.store();
          });
        };
        
        this.get('texts', removeTags);
      }.bind(this)
    },

    // Retrieves all the specified type of object in this corpus from IndexedDB
    'get': {
      value: function(type, callback) {
        idb.get(this[type], type, callback);
      }.bind(this)
    },
    
    'getAbbrevs': {
      value: function(callback) {
        var extractAbbrevs = function(texts) {
          var abbrevs = [];
          
          texts.forEach(function(text) {
            abbrevs[text.id] = text.abbreviation;
          });
          
          if (typeof callback == 'function') { callback(abbrevs); }
        };
        
        this.get('texts', extractAbbrevs);
      }.bind(this)
    },
    
    'getStatistics': {
      value: function(callback) {
        var getStats = function(texts) {
          var delimiters = new RegExp('[,.!?“” ˊˋ]+', 'g');
          
          var types = [];
          
          var stats = {
            tokens: 0,
            phrases: 0
          };
          
          var countTokens = function(phrase) {
            var tokens = phrase.transcripts['Swadesh-Phonemic'].split(delimiters);
            stats.tokens += tokens.length;
            countTypes(tokens);
          };
          
          var countTypes = function(tokens) {
            tokens.forEach(function(token) {
              var exists = types.some(function(type) {
                return type == token;
              });
              
              if (!exists) { types.push(token); }
            });
          };
          
          texts.forEach(function(text, i, arr) {
            stats.phrases += arr.length;
            text.phrases.forEach(countTokens);
          });
          
          stats.types = types.length;
          
          if (typeof callback == 'function') { callback(stats); }
        };
        
        this.get('texts', getStats);
      }.bind(this)
    },

    'pullTags': {
      value: function(callback) {
        var tagsHolder = { tags: [] };
        
        var getTags = function(texts) {
          texts.forEach(transferTags);
          texts.forEach(function(text) {
            text.phrases.forEach(transferTags);
            text.phrases.forEach(function(phrase) {
              phrase.words.forEach(transferTags);
              phrase.words.forEach(function(word) {
                word.morphemes.forEach(transferTags);
              });
            });
          });
          
          if (typeof callback == 'function') { callback(tagsHolder.tags); }
        };

        var tagHolder = function(tag) {
          tag.tag(tagsHolder);
        };

        var transferTags = function(result) {
          result.tags.forEach(tagHolder);
        };
        
        this.get('texts', getTags);

      }.bind(this)
    },
    
    'remove': {
      value: function(idsToRemove, type, callback) {
        removeids(idsToRemove, this[type]);
        this.store(callback);
      }.bind(this)
    },
    
    'removeAllTags': {
      value: function() {
        app.preferences.currentCorpus.tags = [];
        
        var remove = function(texts) {
          texts.forEach(function(text) {
            text.tags = [];
            
            text.phrases.forEach(function(phrase) {
              phrase.tags = [];
            });
            
            text.store();
          });
        };
        
        this.get('texts', remove);
      }.bind(this)
    },
    
    // Removes a tag from the corpus and any of its linguistic objects
    'removeTag': {
      value: function(tag, callback) {
        var removeTags = function(results, tags) {
          tags[0].untag(this);
          
          results.forEach(function(result, i, arr) {
            tags[0].untag(result);
            result.store();
            
            if (i == arr.length-1) {
              if (typeof callback == 'function') { callback(); }
            }
          });
        }.bind(this);
        
        this.tagSearch(tag, removeTags);
      }.bind(this)
    },
    
    // Callback arguments: results, tag
    'tagSearch': {
      value: function(tags, callback) {
        var results = [];
        if (!tags.length) { tags = toArray(tags); }
        
        if (tags[0].lingType == 'corpus') {
          if (this.hasTags(tags)) { results.push(this); }
          
          if (typeof callback == 'function') { callback(results, tags); }
        
        } else {
          var search = function(texts) {
            texts.forEach(function(text) {
              results = results.concat(text.tagSearch(tags));
            });
            
            if (typeof callback == 'function') { callback(results, tags); }
          };
          
          this.get('texts', search);
        }
        
      }.bind(this)
    },
    
    'textSearch': {
      value: function(attribute, searchExpr, callback) {
        var search = function(texts) {
          texts.forEach(function(text) {
            text.textSearch(attribute, searchExpr);
          });
          
          if (typeof callback == 'function') { callback(app.searchResults, 'phrase'); }
        };
        
        this.get('texts', search);
      }.bind(this)
    },
    
    'setAsCurrent': {
      value: function() {
        app.preferences.currentCorpus = this;
      }.bind(this)
    }
  });
};

// Abbr: lang
models.Language = function Language(data) {
  Model.call(this, data);
};

// Abbr: t
models.Text = function Text(data) {
  Model.call(this, data);
  
  if (!this.phrases) { this.phrases = [];}
  
  this.phrases = new models.Phrases(this.phrases);
  
  this.abbreviation = this.abbreviation || '';
  this.type = this.type || '';
  this.genre = this.genre || '';
  this.analyses = this.analyses || [];
  this.media = this.media || [];
  this.persons = this.persons || [];
  this.tags = this.tags || [];
  this.titles = this.titles || { Eng: '' };
  this.custom = this.custom || {};
  
  Object.defineProperties(this, {
    'addToCorpus': {
      value: function() {
        app.preferences.currentCorpus.add(this.id, 'texts');
      }.bind(this)
    },

    // Retrieves all the specified type of object in this text from IndexedDB
    // - (only works on attributes that are arrays of IDs, e.g. Persons or Media)
    'get': {
      value: function(type, callback) {
        idb.get(this[type], type, callback);
      }.bind(this)
    },

    // Pass this a function that has the text as its argument - this keeps app-specific rendering methods in the app
    'render': {
      value: function(renderFunction) {
        renderFunction(this);
      }.bind(this)
    },
    
    'removeFromCorpus': {
      value: function() {
        app.preferences.currentCorpus.remove(this.id, 'texts');
      }.bind(this)
    },
    
    'tagSearch': {
      value: function(tags) {
        var results = [];
        if (!tags.length) { tags = toArray(tags); }
        
        if (tags[0].lingType == 'text') {
          if (this.hasTags(tags)) { results.push(this); }
        } else {
          this.phrases.forEach(function(phrase) {
            results = results.concat(phrase.tagSearch(tags));
          }, this);
        }
        
        return results;
      }.bind(this)
    },
    
    'textSearch': {
      value: function(attribute, searchExpr) {
        this.phrases.forEach(function(phrase) {
          phrase.textSearch(attribute, searchExpr);
        });
      }.bind(this)
    },
    
    'setAsCurrent': {
      value: function() {
        app.preferences.currentText = this;
      }.bind(this)
    }
  });
};

// Abbr: p
models.Phrase = function Phrase(data) {
  Model.call(this, data);

  if (!this.notes) { this.notes = {}; }
  if (!this.tags) {this.tags = []; }
  if (!this.transcriptions) { this.transcriptions = {}; }
  if (!this.transcripts) { this.transcripts = {}; }
  if (!this.translations) { this.translations = {}; }
  if (!this.words) { this.words = [];}
  
  this.words = new models.Words(this.words);

  Object.defineProperties(this, {
    'play': {
      value: function() {
        var text;
        
        if (app.preferences.currentText.id == this.breadcrumb[0]) {
          text = app.preferences.currentText;
        } else {
          var setText = function(t) {
            text = t[0];
          }.bind(this);
          idb.getBreadcrumb(this.breadcrumb[0], setText);
        }
        
        var playMedia = function(media) {
          if (media.length != 0) {
            var url = URL.createObjectURL(media[0].file);
            var a = new Audio(url + '#t=' + this.startTime + ',' + this.endTime);
            a.play();
          }
        }.bind(this);
        
        text.get('media', playMedia);
      }.bind(this)
    },
    
    'tagSearch': {
      value: function(tags) {
        var results = [];
        if (!tags.length) { tags = toArray(tags); }
        
        if (tags[0].lingType == 'phrase') {
          if (this.hasTags(tags)) { results.push(this); }
        } else {
          this.words.forEach(function(word) {
            results = results.concat(word.tagSearch(tags));
          }, this);
        }
        
        return results;
      }.bind(this)
    },
    
    'textSearch': {
      value: function(attribute, searchExpr) {
        var checkHash = function(hash, searchExpr) {
          var some = Object.keys(hash).some(function(ortho) {
            if (hash[ortho]) {
              return hash[ortho].search(searchExpr) != -1;
            } else {
              return false;
            }
          }, this);
          
          return some;
        };
        
        if (attribute == 'all') {
          var attributes = ['transcripts', 'transcriptions', 'translations', 'notes'];
          
          var some = attributes.some(function(attribute) {
            return checkHash(this[attribute], searchExpr);
          }, this);
          
          
          if (some) { app.searchResults.push(this); }
        } else {
          if (checkHash(this[attribute], searchExpr)) {
            app.searchResults.push(this);
          }
        }
      }.bind(this)
    }
  });
};

// Abbr: w
models.Word = function Word(data) {
  Model.call(this, data);
  
  if (!this.glosses) { this.glosses = {}; }
  if (!this.morphemes) { this.morphemes = []; }
  if (!this.transcriptions) { this.transcriptions = {}; }
  
  this.morphemes = new models.Morphemes(this.morphemes);
  
  Object.defineProperties(this, {
    'tagSearch': {
      value: function(tags) {
        var results = [];
        if (!tags.length) { tags = toArray(tags);}
        
        if (tags[0].lingType == 'word') {
          if (this.hasTags(tags)) { results.push(this); }
        } else {
          this.morphemes.forEach(function(morpheme) {
            if (morpheme.hasTags(tags)) { results.push(this); }
          }, this);
        }
        
        return results;
      }.bind(this)
    }
  });
};

// Abbr: map
models.Morpheme = function(data) {
  Model.call(this, data);
};

// Abbr: lex
models.Lexeme = function Lexeme(data) {
  Model.call(this, data);
};

// Abbr: cxn
models.Construction = function Construction(data) {};

// The tag model also has a render function for now, because it seems unnecssary to have views for every tag
models.Tag = function Tag(data) {
  if (data) { augment(this, data); }
  
  if (this.type) {
    this.lingType = this.type;
    delete this.type;
  }
  this.lingType = this.lingType || '';
  this.category = this.category || '';
  this.value = this.value || '';
  
  Object.defineProperties(this, {
    'model': {
      enumerable: true,
      value: 'Tag'
    },
    
    'render': {
      value: function(wrapper) {
        var text = this.value ? this.category + ' : ' + this.value : this.category;
        var p = createElement('p', { textContent: text });
        p.classList.add('tagLabel');
        wrapper.appendChild(p);
      }
    },
    
    'tag': {
      value: function(obj) {
        var matches = obj.tags.filter(function(t) {
          return (t.lingType == this.lingType && t.category == this.category && t.value == this.value);
        }.bind(this));
        
        if (matches.length == 0) {
          obj.tags.push(this);
        }
      }.bind(this)
    },
    
    'untag': {
      value: function(obj) {
        var filtered = obj.tags.filter(function(tag) {
          if (tag.lingType == this.lingType && tag.category == this.category && tag.value == this.value) {
            return false;
          } else { return true; }
        }, this)
        
        obj.tags = new models.Tags(filtered);
      }.bind(this)
    }
  });
};

Object.defineProperties(models.Tag.constructor.prototype, {
  'parse': {
    value: function(tagString) {
      var tagParts = tagString.split(':');
      var tag = new models.Tag({
        lingType: tagParts[0],
        category: tagParts[1],
        value: tagParts[2] || null
      });
      return tag;
    }
  }
});


// COLLECTIONS MODELS (PLURAL)
models.Documents = function Documents(data) {
  var coll = data.map(function(documentData) {
    return new models.Document(documentData);
  });
  
  var documents = new Collection(coll);
  
  return documents;
};

models.MediaFiles = function MediaFiles(data) {
  var coll = data.map(function(mediaData) {
    return new models.MediaFile(mediaData);
  });
  
  var media = new Collection(coll);
  
  return media;
};

models.Corpora = function(data) {
  var coll = data.map(function(corpusData) {
    return new models.Corpus(corpusData);
  });
  
  var corpora = new Collection(coll);
  
  return corpora;
};

models.Languages = function Languages(data) {
  var coll = data.map(function(languageData) {
    return new models.Language(languageData);
  });
  
  var languages = new Collection(coll);
  
  return languages;
};

models.Texts = function Texts(data) {
  var coll = data.map(function(textData) {
    return new models.Text(textData);
  });
  
  var texts = new Collection(coll);
  
  return texts;
};

models.Phrases = function Phrases(data) {
  var coll = data.map(function(phraseData) {
    return new models.Phrase(phraseData);
  });

  var phrases = new Collection(coll);
  
  return phrases;
};

models.Words = function Words(data) {
  var coll = data.map(function(wordData) {
    return new models.Word(wordData);
  });
  
  var words = new Collection(coll);
  
  return words;
};

models.Morphemes = function Morphemes(data) {
  var coll = data.map(function(morphemeData) {
    return new models.morpheme(morphemeData);
  });
  
  var morphemes = new Collection(coll);
  
  return morphemes;
};

models.Lexicon = function Lexicon(data) {
  var coll = data.map(function(lexemeData) {
    return new models.Lexeme(lexemeData);
  });
  
  var lexicon = new Collection(coll);
  
  return lexicon;
};

models.Tags = function(data) {
  var coll = data.map(function(tagData) {
    return new models.Tag(tagData);
  });
  
  var tags = new Collection(coll);
  
  return tags;
};