// CORE
// - Base functions & objects
// - Event system
// - Base model
// - Base view & collection


// HELPER FUNCTIONS
// Adds all the enumerable keys of one object (the source) to another (the destination)
function augment(destination, source) {
  Object.keys(source).forEach(function(key) {
    destination[key] = source[key];
  });
  
  return destination;
};

function checkAgainst(a, b) {
  return Object.keys(a).every(function(key) {
    if (typeof a[key] == 'string' || typeof a[key] == 'number') {
      return a[key] == b[key];
      
    } else if (a[key].length) {
      var c = a[key];
      var d = b[key];
      return c.every(function(obj, i) {
        return checkAgainst(c[i], d[i]);
      });
      
    } else if (typeof a[key] == 'object') {
      var c = a[key];
      var d = b[key];
      return checkAgainst(c, d);
    }
  });
};

function createElement(tagName, attributes) {
  var el = document.createElement(tagName);
  for (var attribute in attributes) {
    el[attribute] = attributes[attribute];
  }
  return el;
};

function createList(wrapper, list, populateListItem) {
  wrapper.innerHTML = '';
  list.forEach(function(item) {
    var li = createElement('li');
    populateListItem(item, li);
    wrapper.appendChild(li);
  });
};

function display(el, media) {
  if (media != 'mobile') { el.classList.remove('hideonDesktop'); }
  if (media != 'desktop') { el.classList.remove('hideonMobile'); }
};

// Gets a list of unique values for a given attribute from an array of objects
function getUnique(attribute, array) {
  var values = [];
  
  array.forEach(function(obj) {
    var matches = values.filter(function(value) {
      return obj[attribute] == value;
    });
    
    if (matches.length == 0) { values.push(obj[attribute]); }
  });
  
  return values;
};

function hasID(arr, idToMatch) {
  return arr.some(function(id) { return id == idToMatch });
};

function hide(el, media) {
  if (media != 'mobile') { el.classList.add('hideonDesktop'); }
  if (media != 'desktop') { el.classList.add('hideonMobile'); }
};

function hydrate(obj) {
  var newObj = new models[obj.model](obj);
  if (newObj.id) {
    delete newObj.id;
    Object.defineProperty(newObj, 'id', {
      enumerable: true,
      value: obj.id
    });
  }
  return newObj;
};

var removeids = function(idsToRemove, array) {
  if (!idsToRemove.length) { idsToRemove = toArray(idsToRemove); }
  
  array.forEach(function(id, i) {
    if (hasID(idsToRemove, id)) { array.splice(i, 1); }
  });
};

function renderTextContent(textHash, wrapper) {
  Object.keys(textHash).forEach(function(ortho) {
    var p = createElement(p, { textContent: textHash[ortho] });
    p.classList.add('unicode');
    wrapper.appendChild(p);
  });
};

function toArray(primitive) {
  return [primitive];
};

function toggleDisplay(el) {
  el.classList.toggle('hideonMobile');
  el.classList.toggle('hideonDesktop');    
};

// A global Breadcrumb object that handles functions relating to breadcrumbs
// Change this into a constructor, whose prototypes have the methods (like you did for the Tag constructor)
Breadcrumb = {
  // Finds the given breadcrumb in a given text, and applies the given function to it
  // Action can take optional second and third arguments, which are the index of the object in the array, and the array that the object is in
  applyTo: function(breadcrumb, text, action) {
    if (breadcrumb.length == 1) {
      action(text);
      return text;
    } else if (breadcrumb.length == 2) {
      action(text.phrases[breadcrumb[1]], breadcrumb[1], text.phrases);
      return text;
    } else if (breadcrumb.length == 3) {
      action(text.phrases[breadcrumb[1]].words[breadcrumb[2]], breadcrumb[2], text.phrases[breadcrumb[1]].words);
      return text;
    } else if (breadcrumb.length == 4) {
      action(text.phrases[breadcrumb[1]].words[breadcrumb[2]].morphemes[breadcrumb[3]], breadcrumb[3], text.phrases[breadcrumb[1]].words[breadcrumb[2]].morphemes);
      return text;
    }
  },
  
  parse: function(breadcrumb) {
    return breadcrumb.split('_').map(Number);
  },
  
  // Resets the breadcrumbs on every item within an item
  reset: function(item) {
    var resetWord = function(word) {
      word.morphemes.forEach(function(morpheme, m) {
        morpheme.breadcrumb = word.breadcrumb.concat(m);
      });
    };
    
    var resetPhrase = function(phrase) {
      phrase.words.forEach(function(word, w) {
        word.breadcrumb = phrase.breadcrumb.concat(w);
        if (word.morphemes) { resetWord(word); }
      });
    };
    
    var resetText = function(text) {
      text.breadcrumb = [text.id];
      
      if (text.phrases) {
        text.phrases.forEach(function(phrase, p) {
          phrase.breadcrumb = text.breadcrumb.concat(p);
            if (phrase.words) { resetPhrase(phrase); }
        });
      }
    };
    
    if (item.model == 'Word') {
      resetWord(item);
    }
    
    if (item.model == 'Phrase') {
      resetPhrase(item);
    }
    
    if (item.model == 'Text') {
      resetText(item);
    }
  },
  
  stringify: function(breadcrumb) {
    var crumb = breadcrumb.join('_');
    return crumb;
  }
};

// IDB MIX-Infinity
function IDBObj() {
  Object.defineProperties(this, {
    // Deletes the object from IndexedDB
    // Accepts an optional callback function that fires when the database transaction is complete
    'delete': {
      value: function(callback) {
        if (this.id) {
          var tableName = idb.tableList.filter(function(table) {
            return table.model == this.model;
          }, this)[0].name;
          
          idb.remove(this.id, tableName, callback);
        }
      }.bind(this)
    },

    // Stores the object in IndexedDB
    // Optional callback function has an array of a single index (the index of the stored object) as its argument
    'store': {
      value: function(callback) {
        idb.store(this, callback);
      }.bind(this)
    }
  });
};


// EVENT SYSTEM
// Handlers is an array of settings for event handlers that will be added to the object
// - Each handler has 3 attributes: el (what the listener attaches to; this is a string representing the attribute of the object the Events mixin is being called on), evType (e.g. 'click', 'onload'), and functionCall (the function to execute when the event fires)
function Events() {
  if (!this.observers) {
    Object.defineProperty(this, 'observers', {
      value: [],
      writable: true
    });
  }
  
  Object.defineProperty(this, 'notify', {
    value: function(action, data) {
      var subs = this.observers.filter(function(sub) {
        return sub.action == action;
      });
      
      subs.forEach(function(sub) {
        sub.observer.update(sub.action, data);
      });
    }.bind(this)
  });
    
  Object.defineProperties(this.observers, {
    'add': {
      value: function(action, observer) {
        var sub = {
          action: action,
          observer: observer
        };
        
        this.observers.push(sub);
      }.bind(this)
    },
    
    'remove': {
      value: function(action, observer) {
        this.observers.forEach(function(sub, i, arr) {
          if (sub.observer == observer && sub.action == action) {
            arr.splice(i, 1);
          }
        });
      }.bind(this)
    }
  });
};


// BASE MODEL
function Model(data) {
  IDBObj.call(this);
  Events.call(this);
  
  if (data) {
    augment(this, data);
  }
  
  if (!this.custom) { this.custom = {}; }
  if (!this.tags) { this.tags = []; }
  
  this.tags = this.tags.map(function(tag) {
    return new models.Tag(tag);
  });
  
  delete this.model;
  
  Object.defineProperties(this, {
    'hasTag': {
      value: function(tag) {
        var some = this.tags.some(function(t) {
          if (t.lingType == tag.lingType && t.category == tag.category && t.value == tag.value) {
            return true;
          };
        });
        
        return some;
      }.bind(this)
    },
    
    'hasTags': {
      value: function(tags) {
        if (!tags.length) { tags = toArray(tags); }
        
        var every = tags.every(function(t) {
          return this.hasTag(t);
        }, this);
        
        return every;
      }.bind(this)
    },
    
    'json': {
      get: function() {
        return JSON.stringify(this, null, 2);
      }.bind(this)
    },
    
    'model': {
      enumerable: true,
      value: this.constructor.name
    }
  });
};


// BASE COLLECTION
function Collection(data) {
  Events.call(data);
  
  Object.defineProperties(data, {
    'json': {
      get: function() {
        return JSON.stringify(this, null, 2);
      }
    },
    
    'model': {
      enumerable: true,
      value: this.constructor.name
    },
    
    'hasTag': {
      value: function(tag) {
        return data.some(function(item) {
          return item.hasTag(tag);
        });
      }
    }
  });
  
  return data;
};


// BASE VIEW
function View(model, template, options) {
  if (model) {
    this.model = model;
  }
  
  if (template) {
    this.template = template;
  }
  
  if (options) {
    augment(this, options);
  }
  
  // The optional media elements specifies whether you would only like to display the element on one media type (desktop/mobile)
  this.display = function(media) {
    display(this.el, media);
  }.bind(this);
  
  this.hide = function(media) {
    hide(this.el, media);
  }.bind(this);
  
  this.toggleDisplay = function() {
    toggleDisplay(this.el);
  }.bind(this);
  
  Events.call(this);
};

function CollectionView(collection, template, options) {
  View.call(this, collection, template, options);
  
  if (options) {
    augment(this, options);
  }
  
  if (template) {
    this.template = template;
  }
  
  this.collection = this.model;
  
  delete this.model;
};
