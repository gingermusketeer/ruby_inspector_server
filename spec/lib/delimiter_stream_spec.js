var delimiterStream = require("../../lib/delimiter_stream")

var expect = require("chai").expect

describe("delimiterStream", function(){
  it("breaks input data on the delimiter", function(done){
    var subject = delimiterStream(' ')
    var result = []

    subject.on("data", function(data){
      result.push(data.toString())
    })

    subject.write("hello wo")

    process.nextTick(function(){
      subject.write("rld ")
      subject.end()
    })

    subject.on("end", function(){
      expect(result).to.deep.eql(["hello", "world"])
      done()
    })
  })
})
