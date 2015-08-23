var demoSteps = [
      {
        element: '.header',
        intro: "Welcome to Digital Linguistics! Here's a little demo to show you what we're all about!<br><br>Use the arrow keys for navigation or hit ESC to exit the tour immediately.<br><br>If you accidentally exit at any time, simply refresh the page to restart the demo.",
        position: 'bottom'
      },
      {
        element: '#data',
        intro: "We want to make it easy for linguistic researchers to encode their collected data into a smart, digital form that can be effectively managed and analyzed using a computer.<br><br>Our website will do all of the legwork getting the user's data into this form. Click to right arrow key to see how.",
        position: 'right'
      },
      {
        element: '#inputArea',
        intro: "All you need to do is enter your data here. Don't try it yet, we'll give you an example in a moment.",
        position: 'right'
      },
      {
        element: '#transcriptionLabel',
        intro: "The transcription of the foreign phrase goes here.<br><br>When you have entered a phrase, more boxes will appear below for you to provide the English glosses and Parts of Speech of the individual words. This data will be recorded along with the phrase as a whole, as you will see below.",
        position: 'right'
      },
      {
        element: '#translationLabel',
        intro: "The English translation of the entire phrase goes here.<br><br>We'll add an example in for you for now.",
        position: 'right'
      },
      {
        element: '#inputArea',
        intro: "Here we have put in an example sentence in Spanish, the gloss and part of speech of each word in that sentence, and an English translation of the sentence.<br><br>Notice that after putting in nothing but this data, all the fields below and to the right are automatically populated by our program; this will happen with any data you input as well.",
        position: 'right'
      },
      {
        element: '#jsonArea',
        intro: "In this black space, we will show how the computer can store and manage the data you provided in JSON (Javascript Object Notation).<br><br>The entire box contains one 'object', which is denoted by the first and last curly braces { } in the file. This object represents the whole phrase in JSON.<br>The phrase object contains a field for the transcription, which represents the phrase you put in the first box; a translation, which contains the translation you provided in the second box; and a list of words.<br>This list of words also contains several 'objects', each of which represents one word of your transcription.<br>Each of these 'word' objects contains a 'token', which is the word itself taken from the phrase in the original language; a 'gloss', which is the English gloss of that individual word that you provided; and that word's part of speech.",
        position: 'right',
        tooltipClass: 'oversize'
      },
      {
        element: '#visualizations',
        intro: "On the right half of the screen, we show merely a few different ways that the computer can visualize and manipulate this well-organized data!",
        position: 'left'
      },
      {
        element: '#interlinearGloss',
        intro: "This visualization is called an interlinear gloss. The first line is the phrase in the original language. The second line displays each of the words of this phrase, with its individual gloss and POS directly below it in the third and fourth lines, respectively. The fifth and final line gives the English translation of the full phrase.",
        position: 'left'
      },
      {
        element: '#stats',
        intro: "This section displays some stats that the computer calculated from our data; namely, the amount of appearances of each letter that appears in the phrase.<br><br>Though this is a very simple statistic, it serves as an example here to show that functions could be written to perform any sort of analysis on this data.",
        position: 'left'
      },
      {
        element: '#dictionary',
        intro: "This section displays each word from the phrase in the rough fashion of a typical bilingual dictionary.",
        position: 'left'
      },
      {
        element: '#downloadButton',
        intro: "Click this button to download the data in the form shown below (.json). You can open and edit it with a text editor.",
        position: 'right'
      },
      {
        element: '#homepageButton',
        intro: "Now try it yourself! Click anywhere or hit esc to exit our demo, then change the input fields to watch our website manipulate your data in real time. Hit this link when you're done to return to the homepage.",
        position: 'left'
      }
    ]

var homePageSteps = [
  {
    element: 'button',
    intro: '<p>See how Digital Linguistics works!</p><a href=introdemo.html><button type=button>Go!</button></a>',
    position: 'top',
    tooltipClass: 'header'
  }
] 

var homePageRevisitSteps = [
  {
    element: 'button',
    intro: '<p>Welcome back! Finish your walkthrough!</p><a href=introdemo.html><button type=button>Go!</button></a>',
    position: 'top',
    tooltipClass: 'header'
  }
]
