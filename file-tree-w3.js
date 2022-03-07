const chokidar = require('chokidar')
const fs = require('fs')
const http = require('http')
const WebSocketServer = require('websocket').server
const express = require('express')
const server = http.createServer()
const port = 3333
const wsport = 9898
const app = express()

app.use(express.static(__dirname))
app.listen(port)

console.log("Welcome to the fileTreeW3!")

process.argv.splice(0, 2)

function checkExist(item, index){
	if (!fs.existsSync(item)) {
		console.error('Directory ' + item + ' not found.!')
		process.exit()
	}
}

if (process.argv.length >= 1){
	process.argv.forEach(checkExist)
	console.log("You chose to view " + process.argv.length + " folder(s)")
	console.log("Please open a browser to http://localhost:" + port)
}else{
	console.error("No folder was specified as argument.")
	process.exit()
}

let watchedFiles = []
let watcher = chokidar.watch(process.argv, {ignored: /^\./, persistent: true})
watcher
  .on('all', (event, path) => {
	  let element = {}
	  element.event = event
	  element.path = path
	watchedFiles.push(element)
})

server.listen(wsport)
const wsServer = new WebSocketServer({
    httpServer: server
})
wsServer.on('request', function(request) {
    const connection = request.accept(null, request.origin)
	watchedFiles.forEach(sendEvent);
	
    connection.on('message', function(message) {
        let file = message.utf8Data
        if (fs.statSync(file).isFile()){
            if (file.endsWith(".jpg") || file.endsWith(".gif") || file.endsWith(".png")){
                connection.sendUTF("imgs" + "data:image/gif;base64,"+fs.readFileSync(file, 'base64'))
            }else if (file.endsWith(".txt") || file.endsWith(".js") || file.endsWith(".json") || file.endsWith(".css")){
                connection.sendUTF("data" + fs.readFileSync(file, 'utf8').toString().slice(0,1000))
            }
        }
    })
    connection.on('close', function(reasonCode, description) {
        console.log('Client has disconnected.')
    })
	function sendEvent(element){
		if (connection.connected) {
            element.path = element.path.replace(/\\/g, "/")
			connection.sendUTF("tree" + JSON.stringify({event:element.event, path:element.path}))
		}
	}
})
