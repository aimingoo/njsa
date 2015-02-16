/*
 * json viewer for RESTApi result
 *
 * Usage:
 *	- curl 'http://.../../get/1' | node viewer.js
**/
var stringBuff = []

process.stdin.on('readable', function (buf) {
    (buf = process.stdin.read()) && stringBuff.push(buf.toString())
});

process.stdin.on('end', function() {
    console.log(require('util').inspect(JSON.parse(stringBuff.join('')), {showHidden: false, depth: null}));
})
