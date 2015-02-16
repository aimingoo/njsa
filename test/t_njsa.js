/* ======================== astore core information model ======================
server_info_keys = {
	'__1__' : {
		server_info: {
			start_info: <start_time_or_other_information>
		}
	},
	...
}
*/

var astore_options = {addr: {uri: 'http://localhost:8080'}};
var astore = require("../njsa.js")(astore_options);

// continutor wiht condition for continuer.js
function CondContinutor(cond) {
	var self = {}, elseAt = 0, c = require('./continuer.js')();
	self.isCallback = c.isCallback.bind(c);
	self.then = self.next = function() {
		return c.next.apply(c, arguments) && self;
	}
	self.else = function() {
		return (elseAt = c.length, c.next.apply(c, arguments)) && self;
	}
	self.do = function() {
		cond && ((cond.apply(this, arguments) ? c.splice(elseAt, c.length) : c.splice(0, elseAt)), cond=false);
		c.do(c[0] && !c[0][1] && (c[0][1] = arguments));
	}
	return self
}

// log or message output for request.js
var wsSuccess = function(error, response, body) {
	var c = response && response.statusCode && ''.charAt.call(response.statusCode, 0)
	return !(error || (c != '2'));
}
var wsSuccessLog = function(error, response, body) {
	var info = JSON.parse(body)[0]
	console.log(info ? 'astore start time: ' +  info : ' astore connecting: Fail.');
}
var wsErrorLog = function(error, response, body) {
	console.log(['[', error, ']'].join(''), response && response.statusCode, body)
}

var consoleLogger = function(title) {
	return function(error, response, body) {
		if (! wsSuccess.apply(this, arguments))
			wsErrorLog.apply(this, arguments)
		else {
			console.log(title + ' successed, result: ' + body)
		}
	}
}

/**
 * astore connecting and initializing
**/

var get_info_again = new CondContinutor(wsSuccess)
	.then(astore.server_info, ['start_info', wsSuccessLog])
	.else(wsErrorLog);

var init_info_cond = new CondContinutor(wsSuccess);
init_info_cond
	.then(consoleLogger('astore system core information module initializing'), undefined, init_info_cond)
	.next(setTimeout, [init_info_cond.do, 2000]) // sleep 2s, waiting putschema into all nodes
	.next(astore.server_info, ['start_info', new Date().toString() + '\nversion: 1.0', get_info_again.do], true)
	.else(wsErrorLog);

var get_info_cond = new CondContinutor(wsSuccess)
	.then(wsSuccessLog)
	.else(astore.workAt('user'), ['putschema',
		JSON.stringify(require('./schema/demo.js')),
		{fullname: 'com.wandoujia.astore.demoschema.User', timeout: 2*60*60*1000},
		consoleLogger('astore[user] initializing')])
	.next(astore.workAt('activities'), ['putschema',
		JSON.stringify(require('./schema/demo.js')),
		{fullname: 'com.wandoujia.astore.demoschema.ActivityRecord', timeout: 2*60*60*1000},
		consoleLogger('astore[activities] initializing')])
	.next(astore.workAt(), ['putschema',
		astore.schema(),
		init_info_cond.do],
		true); // no next step

astore.server_info('start_info', get_info_cond.do);