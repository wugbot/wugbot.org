// Contains the script for things in the tools folder
tools = {};

// Columns is an array of objects with 5 possible attributes:
// - import: a Boolean indicating whether this column should be imported (defaults to true)
//   - if false, json may be left blank
// - elan: name of the ELAN column (required)
// - json: name of the phrase attribute where this data will live (required if being imported)
//   - e.g. transcriptions, translations, etc.
// - orthography: name of the orthography for this column (required for columns containing textual data)
// - type: the content type (defaults to null)
// - format: set to 'number' if you the string should be converted to a number

var ekegusiiColumns = [
  {
    elan: 'Begin Time - ss.msec',
    json: 'startTime',
    format: 'number'
  },
  {
    elan: 'End Time - ss.msec',
    json: 'endTime',
    format: 'number'
  },
  {
    elan: 'Duration - ss.msec',
    import: false
  },
  {
    elan: 'Transcript',
    json: 'transcripts',
    orthography: 'DT2Phonemic'
  },
  {
    elan: 'Phonemic',
    json: 'transcriptions',
    orthography: 'Phonemic'
  },
  {
    elan: 'Phonetic',
    json: 'transcriptions',
    orthography: 'Phonetic'
  },
  {
    elan: 'Translations',
    json: 'translations',
    orthography: 'English'
  },
  {
    elan: 'Translation',
    json: 'translations',
    orthography: 'English'
  },
  {
    elan: 'Notes',
    json: 'notes',
    orthography: 'English'
  }
];

function elan2json(file, columns, callback) {
  var phrases = [];
  var fileReader = new FileReader();
  fileReader.onload = function(ev) {
    var text = ev.target.result;
    text = text.trim();
    var lines = text.split(/\n/g);
    var header = lines[0].trim();
    var columnNames = header.split(/\t/g);
    
    var labelLine = function(line) {
      var values = line.trim().split(/\t/g);
      var p = {};
      
      values.forEach(function(value) {
        value = value ? value.trim() : null;
      });
      
      columnNames.forEach(function(columnName, i) {
        var column = columns.filter(function(column) {
          return column.elan == columnName;
        })[0];
        
        // Error handling
        if (!column) {
          alert('Error: Import settings for column "' + columnName + '" not specified. Please specify import settings for this column and try again.');
        }
        
        if (!column.import || column.import == true) {
          if (column.format == 'number') { values[i] = Number(values[i]); }
          
          if (column.orthography) {
            p[column.json] = {};
            p[column.json][column.orthography] = values[i];
          } else {
            p[column.json] = values[i];
          }
        }
      });
      
      phrases.push(p);
    };
    
    lines.slice(1).forEach(labelLine);
    
    phrases.forEach(function(p) {
      p = new models.Phrase(p);
    });
    
    var t = { phrases: phrases };
    var text = new models.Text(t);
    
    if (typeof callback == 'function') { callback(text); }
  };
  
  fileReader.readAsText(file);
};