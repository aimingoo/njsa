/**
 * a simple test_case in bash:
 * 		> node -e 'console.log(JSON.stringify(require("./schema/demo.js")))' |\
 *			curl --data @- 'http://localhost:8080/putschema/user?fullname=com.wandoujia.astore.demoschema.User'
 * 		> curl -s 'http://localhost:8080/user/get/1' | node viewer.js
 *
 * there are full testcases:
**/

var user_centre = require('../njsa_api.js').option({uri: 'http://127.0.0.1:8080'}).at('user')
var activities = require('../njsa_api.js').option({uri: 'http://127.0.0.1:8080'}).at('activity')
var con1 = require('./continuer.js')();
var con2 = require('./continuer.js')();

function callback(error, response, body) {
	var c = response && response.statusCode && ''.charAt.call(response.statusCode, 0)
	if (error || (c != '2')) {
		console.log('[' + error + ']', response && response.statusCode, body)
	}
	else { // 2xx
		c = body.charAt(0)
		console.log((c == '{' || c == '[') ? JSON.parse(body) : body)
	}
}

function getCallback(topic) {
	return function() {
		console.log('>>>', topic)
		callback.apply(this, arguments)
	}
}

function addonsDemo(id, fieldName, record, fields, print, http_get, http_post) {
	var oldValue = fields[fieldName]
	var fieldValue = record[fieldName]
	print('The user <' + id + '> updated: ' + oldValue + '/' + fieldValue)
}

con2.next(activities, ['putschema',
		JSON.stringify(require("./schema/demo.js")),
		{fullname: 'com.wandoujia.astore.demoschema.ActivityRecord', timeout: 2*60*60*1000},
		getCallback('case: putschema at activity_schema')])
	.next(activities, ['select', 'User_0',								getCallback('case: putschema at activity_schema - check')])
	.next(activities, ['delschema',
		con2.isCallback(getCallback('case: delschema at activity_schema'), undefined, con1)], true); // continue back to con1

// initializing, send schema
con1.next(user_centre, ['putschema',
		JSON.stringify(require("./schema/demo.js")),
		{fullname: 'com.wandoujia.astore.demoschema.User', timeout: 2*60*60*1000},
		getCallback('case: putschema')])

	// normal <select> op
	.next(user_centre, ['select', 'User_1', 							getCallback('case: select')])
	.next(user_centre, ['select', 'User_1', '.numFriends',				getCallback('case: select with avpath')])
	// valueTypes field with <update> op
	.next(user_centre, ['update', 'User_1', '.lastLoginTime', +new Date,getCallback('case: udpate')])
	.next(user_centre, ['select', 'User_1', 							getCallback('case: udpate - check')])

	// a record with <update> op
	.next(user_centre, ['update', 'User_1', '.', {
			registerTime: +new Date,
			numFriends: 5
		},
		getCallback('case: update the record')])
	.next(user_centre, ['select', 'User_1', 							getCallback('case: update the record - check')])

	// <insert> element to map/array
	.next(user_centre, ['insert', 'User_1', '.activityRecords', {
			time: +new Date,
			rate: Math.random()*3000
		},
		getCallback('case: insert')])
	.next(user_centre, ['select', 'User_1', 							getCallback('case: insert - check1')])
	.next(user_centre, ['select', 'User_1', '.activityRecords',			getCallback('case: insert - check2')])

	// insert element to map/array with <insertall> op
	.next(user_centre, ['insertall', 'User_1', '.activityRecords', [
			{time: +new Date,	rate: 1134},
			{time: +new Date,	rate: 2},
			{time: +new Date,	rate: 180}
		],
		getCallback('case: insertall')])
	.next(user_centre, ['select', 'User_1', '.activityRecords',			getCallback('case: insertall - check')])

	// <delete> elements from map/array
	.next(user_centre, ['delete', 'User_1', '.activityRecords[0]',		getCallback('case: delete one')])
	.next(user_centre, ['delete', 'User_1', '.activityRecords[*]{.rate < 100}',
		getCallback('case: delete more')])
	.next(user_centre, ['select', 'User_1', '.activityRecords',			getCallback('case: delete one&more - check')])

	// clear map/array
	.next(user_centre, ['clear', 'User_1', '.activityRecords',			getCallback('case: clear')])
	.next(user_centre, ['select', 'User_1', '.activityRecords',
		con1.isCallback(getCallback('case: clear - check'), undefined, con2)], true)	// concat con2

	// add script with <putscript> op
	.next(user_centre, ['putscript', 'numFriends', 'a_UniqId',
		addonsDemo,
		getCallback('case: putscript')])
	.next(user_centre, ['update', 'User_1', '.numFriends', 100,			getCallback('case: putscript - update field')])
	.next(user_centre, ['select', 'User_1', '.numFriends',				getCallback('case: putscript - check')])

	// remove script with <delscript> op
	.next(user_centre, ['delscript', 'numFriends', 'a_UniqId',			getCallback('case: delscript')])
	.next(console.log, ['sleep 1s'], con1)
	.next(setTimeout, [con1.do, 1*1000])
	.next(user_centre, ['update', 'User_1', '.numFriends', 999,			getCallback('case: delscript - update field')])
	.next(user_centre, ['select', 'User_1', '.numFriends',				getCallback('case: delscript - check')])

	// remove schema with <delschema> op
	.next(user_centre, ['delschema',									getCallback('case: delschema')])

	// sleep 1s
	.next(console.log, ['sleep 1s'], con1)
	.next(setTimeout, [con1.do, 1*1000])

	// new session check
	.next(user_centre, ['putschema',
		JSON.stringify(require("./schema/demo.js")),
		{fullname: 'com.wandoujia.astore.demoschema.User', timeout: 2*60*60*1000},
		getCallback('case: putschema')])
	.next(user_centre, ['update', 'User_1', '.numFriends', 333,			getCallback('case: new session update')])
	.next(user_centre, ['select', 'User_1', '.numFriends',				getCallback('case: new session update - check')])
	.next(user_centre, ['delschema',									getCallback('case: delschema')])

	.next(function(){console.log('\nTest project done.')})
	.do();