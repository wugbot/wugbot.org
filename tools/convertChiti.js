var convertChiti = function() {
var everything = function() {
  
  var createTexts = function() {
    chitiTexts = [];
    
    chiti.texts.forEach(function(chitiText) {
      var text = new models.Text(chitiText);
      delete text.GISLocationID;
      delete text.access;
      delete text.activityID;
      delete text.cityID;
      delete text.countryID;
      delete text.dateCreated;
      delete text.dateModified;
      delete text.dateRecorded;
      delete text.genreID;
      delete text.localeID;
      delete text.regionID;
      text.titles.Eng = text.title;
      delete text.title;
      
      text.phrases.forEach(function(phrase) {
        phrase.custom.paragraphNum = phrase.paragraphNum;
        delete phrase.paragraphNum;
        phrase.transcripts['Swadesh-Phonemic'] = phrase.transcription;
        delete phrase.transcription;
        phrase.translations['Swadesh-Free'] = phrase.translation;
        delete phrase.translation;
        phrase.words = [];
      });
      
      chitiTexts.push(text);
    });
  };
  
  createTexts();
  
};
idb.export(everything);
};