var querystring = require("querystring")

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

App.all = function all(){
  return apps
}

App.findByUid = function findByUid(id){
  return apps.filter(function(app){
    return app.uid === id
  })[0]
}

App.prototype.cacheRequestBody = function cacheRequestBody(requestId, result){
  this.responseBodyCache[requestId] = result
}

App.prototype.bodyForRequest = function bodyForRequest(requestId){
  var result = this.responseBodyCache[requestId]
  this.responseBodyCache[requestId] = undefined
  return result
}


module.exports = App
