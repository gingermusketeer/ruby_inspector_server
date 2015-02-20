var express = require("express")
var WebSocketServer = require("ws").Server
var morgan = require("morgan")
var querystring = require("querystring")
var url = require("url")

var apps = []

function App(socket, params){
  this.appSocket = socket

  this.responseBodyCache = {}
  this.uid = querystring.escape(params.name)

  this.name = params.name
  this.type = params.type
  this.description = params.description
}

App.findOrCreate = function findOrCreate(socket, params){
  var existingApp = apps.filter(function(app){
    return app.name === params.name
  })[0]
  if(existingApp){
    return existingApp
  } else {
    var app = new App(socket, params)
    apps.push(app)
    return app
  }
}

App.prototype.cacheRequestBody = function cacheRequestBody(requestId, result){
  this.responseBodyCache[requestId] = result
}

App.prototype.bodyForRequest = function bodyForRequest(requestId){
  var result = this.responseBodyCache[requestId]
  this.responseBodyCache[requestId] = undefined
  return result
}

var net = require('net');

var requestResponseBodyCache = null
var server = net.createServer(function(c) {
  var app

  console.log('app connected');
  c.on('end', function() {
    console.log('app disconnected');
    // close websocket Connections
  });

  c.on('data', function(buf){
    console.log(buf.toString())
      try {
        data = JSON.parse(buf.toString())
        if(data.method === "RubyInspector.network.cacheBody"){
          app.cacheRequestBody(
            data.params.requestId,
            data.result
          )
        } else if(data.method === "RubyInspector.initialize"){
          app = App.findOrCreate(c, data.params)
        } else {
          app.clientSocket.send(buf.toString())
        }
      } catch(e){
        console.log(e)
      }
  })

  c.on("error", function(){
    console.log("app error")
  })
});

server.listen(8124, function() {
  console.log('server bound');
});

var eApp = express()
var eAppBaseHttpUrl = null
var eAppBaseWsUrl = null
eApp.use(morgan('combined'))

eApp.get("/json", function(req, res){
  var data = apps.map(function(app){
    return {
      type: "app",
      description: app.description,
      devtoolsFrontendUrl: "/devtools/inspector.html?ws=localhost:9222/devtools/app/" +app.uid,
      id: app.uid,
      faviconUrl: "https://www.ruby-lang.org/favicon.ico",
      title: app.name,
      url: (eAppBaseHttpUrl + "/json"),
      webSocketDebuggerUrl: "ws://localhost:9222/devtools/app/" + app.uid
    }
  })
  res.json(data)
})

var server = eApp.listen(9222)

var wss = new WebSocketServer({server: server});
wss.on('connection', function(ws) {
  console.log("devtools client connected")
  var matches = ws.upgradeReq.url.match(/^\/devtools\/app\/([^\/]+)$/)
  if(matches) {
    var id = matches[1]
    var appToConnect = apps.filter(function(app){
      return app.uid === id
    })[0]
    if(appToConnect){
      appToConnect.clientSocket = ws

      ws.on('message', function(rawMsg) {
          var msg = JSON.parse(rawMsg)
          var response = {"id":msg.id,"result":{"result":false}}
          if(msg.method === "Network.enable"){
            response.result = {}
          } else if(msg.method === "Network.getResponseBody"){
            response.result = appToConnect.bodyForRequest(msg.params.requestId)
          }
          console.log(msg);
          console.log(response);
          ws.send(JSON.stringify(response))
        });
    } else {
      console.log("devtools: no app to connect")
    }

  } else {
    console.log("unknown websocket url: ", ws.upgradeReq.url)
  }
  ws.on('close', function() {
    console.log('devtools client disconnected');
  });
});

eAppBaseHttpUrl = url.format({
  hostname: server.address().address,
  port: server.address().port,
  protocol: "http"
}).replace("[::]", "localhost")
eAppBaseWsUrl = url.format({
  hostname: server.address().address,
  port: server.address().port,
  protocol: "ws://"
})

console.log(eAppBaseHttpUrl)
console.log(eAppBaseWsUrl)
