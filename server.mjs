import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import ejs from 'ejs'
import fs from 'fs'
import { Gpio } from 'onoff'
import {createServer} from 'node:http'
import {Server} from 'socket.io'

const app = express(); //the server uses the express node.js framework
const server = createServer(app); //creates the server
const io = new Server(server) //initialises server for socket.io

/*
The GPIO interfaces for the buttons are stored in an array for easy reference
*/
let locationButton = [] 

locationButton[0] = new Gpio(520, 'in', 'both', {debounceTimeout : 50}) //debounceTimeout prevents 1 button press from registering multiple times
locationButton[1] = new Gpio(519, 'in', 'both', {debounceTimeout : 50})
locationButton[2] = new Gpio(521, 'in', 'both', {debounceTimeout : 50})



var today = undefined
setDate() //today's date and time must be initially set 



var dateInterval = setInterval(setDate, 60000) //the date and time are rechecked every minute

function setDate(){
  today = new Date()
  
        var year    = today.getFullYear(); //values from year to second are fetched 
        var month   = today.getMonth(); 
        var day     = today.getDate();
        var hour    = today.getHours();
        var minute  = today.getMinutes();
        var second  = today.getSeconds(); 
        if(month.toString().length == 1) { //values that aren't double digit are padded with 0 for correct formatting
             month = '0'+month;
        }
        if(day.toString().length == 1) {
             day = '0'+day;
        }   
        if(hour.toString().length == 1) {
             hour = '0'+hour;
        }
        if(minute.toString().length == 1) {
             minute = '0'+minute;
        }
        if(second.toString().length == 1) {
             second = '0'+second;
        }   
        
        today = new Date(year, month, day, hour, minute, second) //the date is reassembled using these values
        
}   


let fileString = "[" //the start of the json written to events.json

let dateparts  = [] //the date is temporarily stored in an array of it's parts i.e. year, month, day

/*
The GPIO interfaces for the LEDs are stored in an array for easy reference, and 0 (off) is written to each
*/

let locationled = []

locationled[0] = new Gpio(514, 'out')
locationled[1] = new Gpio(515, 'out')
locationled[2] = new Gpio(516, 'out')

locationled.forEach((led) => led.writeSync(0))

const currentFolder = path.dirname(fileURLToPath(import.meta.url)) //the currentfolder is declared to reference other files

var events = []; //events are stored as an array
var newevents = [] //newevents is used to compare with events where if events have changed then the page is refreshed. 
var location1events = [] //events are also stored in an array corresponding to their location, to be sent via socketio to events.ejs so that html elements can be referred to through their event name
var location2events = [] 
var location3events = []

let locations = [false, false, false] //whether a location has an upcoming event or not is stored as a boolean

var eventdates = []; //the dates of all events are stored in a separate array to check which events are within next 48 hours for changing LEDs
var i = 0; //referred to when iterating through events

var eventsfromfile = fs.readFileSync('events.json', 'utf-8') //the events.json file is read

let eventsfromfilearray = eventsfromfile.split(',,,, ') //'//// ' is the separator for items in the json

eventsfromfilearray[0] = eventsfromfilearray[0].slice(1) //removes the '[' from the first element in the events read from the file
eventsfromfilearray[eventsfromfilearray.length-1] = eventsfromfilearray[eventsfromfilearray.length-1].slice(0, eventsfromfilearray[eventsfromfilearray.length-1].length-1) //removes the "]" from the last element in the events read from the file


if (eventsfromfilearray[0] != ""){
  eventsfromfilearray.forEach(pusheventsfromfile) //if the file isn't empty then the events from the file are pushed to events.
}

checkEvents() //an initial check of the event read from the file, including setting eventdates, location, location123events, and lED.

var eventInterval = setInterval(checkEvents, 60000) //this is repeated every minute to dynamically update

function pusheventsfromfile(file){ 
    
    events.push(JSON.parse(file)) //JSON.parse automatically parses the text content in a JSON format to a JSON object
    
}

function setlocationsActive(event){ //sets the locations to true and LEDs to active if they are within the next 48 hours and not in the past

  if(((eventdates[i] - today) < 172800000) && ((eventdates[i] - today) > 0)){
    
    locations[Number(event.location.split('_')[1]) - 1] = true
    locationled[Number(event.location.split('_')[1]) - 1].writeSync(1) //writes to LED
   
  }
  
  i += 1

}

function checkEvents(){

  i = 0 //ensures iteration is restarted 

  events.forEach(setDateTimes) //updates dates array

  i = 0
    
  newevents = [] //newevents is emptied
  events.forEach(setlocationsActive) //sets location array and leds
    
  if(events != newevents){ //refreshes the page if the events have changed
    refreshPage()
  }
    
  i = 0 //clears iterator

  location1events = [] //clears events array for each location.
  location2events = []
  location3events = []

  events.forEach(setLocationsArray) //sets events array for each location
}

function setLocationsArray(event){ //pushes the respective events to the array for each locaion
  if (event.location == "Location_1"){
    location1events.push(event)
  }
  if (event.location == "Location_2"){
    location2events.push(event)
  }
  if (event.location == "Location_3"){
    location3events.push(event)
  }
}

function setDateTimes(){  //the dates array is set to contain he date of each event

    dateparts = events[i].date.split("-") //the main part of the date is split by '-'
    var tempstarttime = events[i].starttime.split(":") //a local array is used to store the minutes and seconds components of the start time
    eventdates[i] = new Date(dateparts[0], dateparts[1] - 1, dateparts[2], tempstarttime[0], tempstarttime[1], "00") //a new date is added to the array which is made up of the year, month, day, minutes and seconds. (and 00 for ms)
   
    if (eventdates[i] < today){ //if the new date is before today, then the location is written as false, and the led turned off
    
      locations[Number(events[i].location.split('_')[1]) - 1] = false
      locationled[Number(events[i].location.split('_')[1]) - 1].writeSync(0)
    
      events.splice(i, 1) //the event is removed from the array

    } else {

      newevents.push(events[i]) //the event is pushed to newevents if it is still valid. If this equals events then nothing has changed and the page doesn't need to be refreshed.

    }
    
    i+=1 
     
}

function formatDesc(string){ //this formats event descripions so that long descriptions have newlines instead of stretching out of the unscrolled browser

  let noOfChars = 0 //counts characters in the description
  let newDesc = "" //an empty new description
  for (let c = 0; c < string.length; c++) { //iterates through each character in the description
    if ((noOfChars % 140) != 0 ){//checks if 140th char in string
      newDesc += string.charAt(c) //prints 139 characters normally
    } else {
      newDesc += string.charAt(c) //then prints the 140th charater with a /n
      newDesc += "\n"
    }
  noOfChars +=1 //adds to number of characters
  }

  return string
}


app.use(express.urlencoded({ extended: true })) //this allows for posted forms to be accessed through req.body
app.engine('ejs', ejs.renderFile) //tells express to use ejs.renderFile to render .ejs files lke the form and events

app.get('/form', (req,res) => { //this sets up a route for a http get request to /form
  res.render('form.ejs') //express renders form.ejs
})

app.post('/form', (req, res) => {//this sets up a route for a http post request to /form
  events.push({ //the event booked is pushed to the events array
    name: req.body.event_name,
    location: req.body.location,
    date: req.body.date,
    starttime: req.body.time,
    description: formatDesc(req.body.description) //with a formatted desc
  })

  checkEvents() //ensures dynamic updating of events on form submission from another client

  events.forEach(makeString) //the new event, and others, are written to the json file

  fileString = fileString.slice(0,-5) //removes ',,,, ' from end of filestring
  fileString += "]" //closes filestring with ']' to ensure array
  
  
  fs.writeFileSync("events.json", fileString) //writes filestring to file
  
  res.redirect('/booked') //redirects to booked page

  refreshPage() //refreshes page to ensure correct behaviour
  
})

function makeString(event){
  fileString += JSON.stringify(event) //converts each event into a string and adds to filestring to be written to file
  fileString += ",,,, " //adds separator
}

app.get('/events', (req,res) => { //route for /events
  res.render('events.ejs', {events: events}) //passes events to the .ejs file to be used for dynamically naming elements for reference
}) 

app.get('/booked', (req,res) => {  //route for /booked
  res.render('booked.ejs')
})

app.use('/', express.static(path.join(currentFolder, 'public'))) //static files from the /public directory can be accessed

function refreshPage(){ //this function uses socketio to tell the .ejs file to refresh itself
  io.emit('refresh', true)
}

io.on('connection', (socket) => { //the following deals with socketio client-server interactions

  locationButton[0].watch((err, value) => { //when the value of the GPIO voltage at this button changes the function executes
    if (value == 0){ //if the button is pressed 
    
      socket.emit('serverbutton1pressed', location1events) //socketio tells the clientside .ejs file that the button has been pressed
      
    }
  })    

  locationButton[1].watch((err, value) => { //same for the 2nd button
    if (value == 0){
    
      socket.emit('serverbutton2pressed', location2events)
      
    }
  })    

  locationButton[2].watch((err, value) => { //same for the third button
    if (value == 0){
     
      socket.emit('serverbutton3pressed', location3events)
      
    }
    
  })    

});


server.listen(3000, () => {
  console.log('server running at http://localhost:3000')
})



