import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import ejs from 'ejs'
import fs from 'fs'
import { Gpio } from 'onoff'
import {createServer} from 'node:http'
import {Server} from 'socket.io'
// import pm2 from 'pm2'

const app = express();
const server = createServer(app);
const io = new Server(server)


let locationButton = []

locationButton[0] = new Gpio(520, 'in', 'both', {debounceTimeout : 50})
locationButton[1] = new Gpio(519, 'in', 'both', {debounceTimeout : 50})
locationButton[2] = new Gpio(521, 'in', 'both', {debounceTimeout : 50})



var today = undefined
setDate()



var dateInterval = setInterval(setDate, 60000)

function setDate(){
  today = new Date()
  //console.log("setdate")
  //console.log(today.getHours())
        var year    = today.getFullYear();
        var month   = today.getMonth(); 
        var day     = today.getDate();
        var hour    = today.getHours();
        var minute  = today.getMinutes();
        var second  = today.getSeconds(); 
        if(month.toString().length == 1) {
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
        //console.log(hour)
        today = new Date(year, month, day, hour, minute, second) 
        //console.log(today)
}   


let fileString = "["

let dateparts  = []
// let testdate = new Date(parts[2], parts[1] - 1, parts[0])
// console.log(testdate)

let locationled = []

locationled[0] = new Gpio(514, 'out')
locationled[1] = new Gpio(515, 'out')
locationled[2] = new Gpio(516, 'out')

locationled[0].writeSync(0)
locationled[1].writeSync(0)
locationled[2].writeSync(0)

const currentFolder = path.dirname(fileURLToPath(import.meta.url))

const noOfEvents = 0
var events = [];
var newevents = []
var location1events = []
var location2events = []
var location3events = []

let locations = [false, false, false]

var eventdates = [];
var i = 0;

var eventsfromfile = fs.readFileSync('events.json', 'utf-8')

let eventsfromfilearray = eventsfromfile.split(',,,, ')

eventsfromfilearray[0] = eventsfromfilearray[0].slice(1)
eventsfromfilearray[eventsfromfilearray.length-1] = eventsfromfilearray[eventsfromfilearray.length-1].slice(0, eventsfromfilearray[eventsfromfilearray.length-1].length-1)

//console.log(eventsfromfilearray[0])
if (eventsfromfilearray[0] != ""){
  eventsfromfilearray.forEach(pusheventsfromfile)

  
}

checkEvents()

var eventInterval = setInterval(checkEvents, 60000)

function pusheventsfromfile(file){
    
    events.push(JSON.parse(file))

    // if (events.pop().location == "Location_1"){
    //   location1events.push()
    // }
    
}

function setlocationsActive(event){
 
 

  //console.log(typeof(eventdates[i]))
  //console.log(typeof(today))
  
  //console.log(eventdates[i])
  //console.log(today)

  //console.log(eventdates[i] - today)

  if(((eventdates[i] - today) < 172800000) && ((eventdates[i] - today) > 0)){
    locations[Number(event.location.split('_')[1]) - 1] = true
    locationled[Number(event.location.split('_')[1]) - 1].writeSync(1)
    //console.log("ledon")
  }
  


  
  i += 1

}



function checkEvents(){
  //console.log(events)
  //console.log("checking events")
  i = 0
  events.forEach(setDateTimes)

  


    //eventdates[i] = dateparts[0] + '-' + (dateparts[1]) + '-' + dateparts[2] + " " + events[events.length - 1].starttime + ":" + "00"

    i = 0
    

    //console.log(eventdates[i])
    newevents = []
    events.forEach(setlocationsActive)
    
    if(events != newevents){
      refreshPage()
    }
    
    i = 0

    location1events = []
    location2events = []
    location3events = []

    events.forEach(setLocationsArray)
    //console.log(location1events)
}

function setLocationsArray(event){
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

function setDateTimes(){
  
    //console.log(i)
    console.log(events[i])
    dateparts = events[i].date.split("-")
    var tempstarttime = events[i].starttime.split(":")
    eventdates[i] = new Date(dateparts[0], dateparts[1] - 1, dateparts[2], tempstarttime[0], tempstarttime[1], "00")
    //console.log(eventdates[i])

    // console.log(eventdates[i])
    // console.log(today)
    if (eventdates[i] < today){
      // console.log(events[i])
      // console.log("event removed")
      locations[Number(events[i].location.split('_')[1]) - 1] = false
      locationled[Number(events[i].location.split('_')[1]) - 1].writeSync(0)
      //console.log("ledoff")

      // delete events[i]
      // console.log(events[i].date)
      events.splice(i, 1)
    } else {
      newevents.push(events[i])
      //events = newevents
      //refreshPage()
    }

      //console.log("popped")check
    
    i+=1

   
    
}


app.use(express.urlencoded({ extended: true }))
app.engine('ejs', ejs.renderFile)

app.get('/form', (req,res) => {
  res.render('form.ejs')
})

function formatDesc(string){

  let noOfChars = 0
  let newDesc = ""
  for (let c = 0; c < string.length; c++) {
    if ((noOfChars % 140) != 0 ){
      newDesc += string.charAt(c)
    } else {
      newDesc += string.charAt(c)
      newDesc += "\n"
    }
  noOfChars +=1
  }

  return string
}

app.post('/form', (req, res) => {
  events.push({
    name: req.body.event_name,
    location: req.body.location,
    date: req.body.date,
    starttime: req.body.time,
    description: formatDesc(req.body.description)
  })

  checkEvents()

  events.forEach(makeString)
  fileString = fileString.slice(0,-5)
  fileString += "]"
  
  
  fs.writeFileSync("events.json", fileString)
  
  res.redirect('/booked')

  refreshPage()
  
})

function makeString(event){
  fileString += JSON.stringify(event)
  fileString += ",,,, "
}

app.get('/events', (req,res) => {
  res.render('events.ejs', {events: events, locationButton1: locationButton[0], locationButton2: locationButton[1], locationButton3: locationButton[2]})
})

app.get('/booked', (req,res) => {
  res.render('booked.ejs')
})

app.use('/', express.static(path.join(currentFolder, 'public')))

function refreshPage(){
  io.emit('refresh', true)
}

io.on('connection', (socket) => {
  
  //console.log ('a client connected');

  //socket.emit('hello', 'world');

  locationButton[0].watch((err, value) => {
    if (value == 0){
      console.log("serverbutton1pressed")
      //console.log(location1events[0])
      socket.emit('serverbutton1pressed', location1events)
      
      
      
    }

  })    

  locationButton[1].watch((err, value) => {
    if (value == 0){
      console.log("serverbutton2pressed")
      //console.log(location2events)
      socket.emit('serverbutton2pressed', location2events)
      
    }
    
  })    

  locationButton[2].watch((err, value) => {
    if (value == 0){
      console.log("serverbutton3pressed")
      socket.emit('serverbutton3pressed', location3events)
    }
    
  })    

  

  socket.on('disconnect', () => {

    //console.log("a client disconnected");
  })

});


server.listen(3000, () => {
  console.log('server running at http://localhost:3000')
})



