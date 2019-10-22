// Require and call Express
var express = require('express');
var bodyParser = require('body-parser');
const fs = require('fs');
var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// use css
app.use(express.static("public"));

// placeholder tasks
var task = [];
var complete = [];
var allCompleted = [];

// add a task
app.post("/addtask", function (req, res) {
  var newTask = req.body.newtask;
  task.push(newTask);
  res.redirect("/");
});

// remove a task
app.post("/removetask", function (req, res) {
  var completeTask = req.body.check;
  if (typeof completeTask === "string") {
    complete.push(completeTask);
    task.splice(task.indexOf(completeTask), 1);
    addNote(completeTask)
  }
  else if (typeof completeTask === "object") {
    for (var i = 0; i < completeTask.length; i++) {
      complete.push(completeTask[i]);
      task.splice(task.indexOf(completeTask[i]), 1);
      addNote(completeTask[i])
    }
  }
  res.redirect("/");
});

// get website files
app.get("/", function (req, res) {
  res.render("index", { task: task, complete: complete });
});

var fetchNotes = () => {
  try {
    var noteString = fs.readFileSync('data/note-data.json');
    console.log(JSON.parse(noteString))
    return JSON.parse(noteString);
  } catch (e) {
    return [];
  }
}
var getAllNotes = () => {
  return fetchNotes();
}

app.get("/list", function (req, res) {
  allCompleted = [];
  var allNotes = getAllNotes();
  allNotes.forEach(note => {
    allCompleted.push(note.body);
  });
  res.render("list", { allCompleted: allCompleted });
});


//save note in data
var addNote = (body) => {
  var notes = fetchNotes();;
  var note = {
    body
  }
  notes.push(note);
  saveNotes(notes);
  return note;
};
var saveNotes = (notes) => {
  fs.writeFileSync('data/note-data.json', JSON.stringify(notes));
}


// listen for connections
app.listen(4040, function () {
  console.log('Testing app listening on port 4040')
});
