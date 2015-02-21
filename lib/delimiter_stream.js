var through = require("through")

module.exports = function(delimiter){
  var msgBuffer = ''
  return through(function(buf){
    msgBuffer += buf.toString()
    var delimiterIndex = msgBuffer.indexOf(delimiter)
    while(delimiterIndex > -1){
      var data = msgBuffer.substr(0, delimiterIndex)
      msgBuffer = msgBuffer.substr(delimiterIndex + 1)
      this.queue(data)
      delimiterIndex = msgBuffer.indexOf(delimiter)
    }
  })
}
