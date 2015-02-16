njsa
=========

AStore In NodeJS. The astore is Avro Data Store based on Akka.

NJSA include two modules:

  * njsa_api.js
    - NJSAA: AStore standard api/interfaces for njsa
  * njsa.js
    - NJSA: AStore In NodeJS

about AStore to see: https://github.com/wandoulabs/astore

## Installation
install NJSA package by npm:

```bash
$ npm install njsa
```

## Usage
1). install astore and run it, see:

[https://github.com/wandoulabs/astore#run-astore](https://github.com/wandoulabs/astore#run-astore)

2). get astore configure ($ASTORE is install direcotry)

for develop environment:
```bash
$ cd $ASTORE/src/main/resources
```
or in released directory:
```bash
$ cd $ASTORE/conf
```
read these configures:
```bash
$ grep -A3 'wandou.astore.web' application.conf
wandou.astore.web {
  interface = "127.0.0.1"
  port = 8080
}
```
and, try base detect interface (must run astore first)
```bash
$ echo `curl -s 'http://127.0.0.1:8080/ping'`
pong
```

3). in nodejs, run samples

change testcase connection arguments to your astore configures:
```bash
$ cd njsa/test
$ grep -H -Pne 'astore_options |require\(.*\.option\(' t_*.js
t_njsa.js:12:var astore_options = {addr: {uri: 'http://localhost:8080'}};
t_njsa_api.js:10:var user_centre = require('../njsa_api.js').option({uri: 'http://127.0.0.1:8080'}).at('user')
t_njsa_api.js:11:var activities = require('../njsa_api.js').option({uri: 'http://127.0.0.1:8080'}).at('activity')
```
and run it
```bash
$ node t_njsa_api.js
$ node t_njsa.js
```

## Base avro schema (and schema define by json/js)

you must initialition astore with a entity schema define. the define must is a record or union type, and putschema to astore(if union, need a fullname argument).

examples:
```javascript
var modelName = 'user'
var centre = require('../njsa_api.js').at(modelName)
var schemaContent = JSON.stringify(require("./schema/demo.js"))
var entityOption = {
  fullname: 'com.wandoujia.astore.demoschema.User',
  timeout: 2*60*60*1000
}
var callback = function(error, response, body) {}
centre('putschema', schemaContent, entityOption, callback)
```

#### modelName
NJSA can work at multi-model astore environment, a model stands for a schema and its activities for all entities. a entity is actor in astore runtime(scala actor).

#### centre
It's command centre, got it by require njsa_api module:
```javascript
centre = require('../njsa_api.js')
```
The centre is a function with base command/function call format:
```javascript
function(modelName, opName, id, ...) // op of <id> in <model>
// or
function(modelName, opName, ...)   // op of <model> in astore
```
you can re-option it(the options see: [nodejs &lt;request&gt; module](http://github.com/request/request)):
```javascript
centre = centre.option({
  host: '192.168.1.100'
})
```
and/or, bind the centre to a model:
```javascript
centre = centre.at(modelName)
```
now, next calls will include a default mode name:
```javascript
function(opName, id, ...) // op of <id> in <model>
// or
function(opName, ...)   // op of <model> in astore
```

#### schemaContent
The "./schema/demo.js" file is a schema with js format define(no, it's not json define). so you can require the model and call JSON.stringify() of the result.

the js define need return a object(for arvo RECORD type), or array(for avro UNION type). example:
```javascript
// export array as union types
module.exports = [ActivityRecord, User];
```
the ActivityRecord/User is Javascript Object define.

#### fullname
if schema include union type, then must set &lt;fullname&gt; option when putschema. the fullname include full-namespace, example:
```javascript
var ActivityRecord = {
  name: 'ActivityRecord',
  namespace: "com.wandoujia.astore.demoschema",
  type: 'record', fields: [
    // ...
  ]
}

// export array as union types
module.exports = [ActivityRecord, ...];
```
for the case, &lt;ActivityRecord&gt; fullname is "com.wandoujia.astore.demoschema.ActivityRecord".

#### callback
It's nodejs request module callback function, see: [nodejs &lt;request&gt; module](http://github.com/request/request)

if none the argument, njsa_api will use a default callback as console error logger:
```javascript
function(error, response, body) {
	var c = response && response.statusCode && response.statusCode.toString().charAt(0)
	if (error || (c != '2')) {
		console.log(['[', error, ']'].join(''), response && response.statusCode, body)
	}
}
```

## NJSAA: standard api/interfaces

the NJSAA module implement full api/interfaces for astore. include:
```javascript
// op for record
centre(model, 'get',		id)
centre(model, 'put',		id, value)

// op for record with key
centre(model, 'get',		id, key)
centre(model, 'put',		id, key, value)

// op for record with avpath
centre(model, 'select',	id)					 // is select_op with avpath: '.'
centre(model, 'select',	id, avpath)
centre(model, 'update',	id, avpath, value)

// op for Array / Map only. use avpath.
centre(model, 'insert',	id, avpath, value)
centre(model, 'insertall',id, avpath, KVs)
centre(model, 'clear',	id, avpath)
centre(model, 'delete',	id, avpath)

// op for schema
centre(model, 'putschema', schema)
centre(model, 'putschema', schema, params)	// params = {fullname=aString, timeout=aNumber}
centre(model, 'delschema')

// op for script
centre(model, 'putscript', field, scriptid, script)	// <script> is function/string, or object with 'run' property.
centre(model, 'delscript', field, scriptid)	// is 'GET' http_method
```
AVPATH see: [https://github.com/wandoulabs/avpath](https://github.com/wandoulabs/avpath)
RESTful-api see: [https://github.com/wandoulabs/astore#restful-api](https://github.com/wandoulabs/astore#restful-api)

## enhanced script support for astore

a script snippet is a "OnUpdate trigger" of entity field/member in astore. the script is full support javascript(see [Nashorn javascript and extensions in java8](https://wiki.openjdk.java.net/display/Nashorn/Nashorn+extensions). you can use &lt;putscript&gt; op with a scriptContent block to hook it:
```javascript
centre(model, 'putscript', field, scriptid, script)
```
or remove it:
```javascript
centre(model, 'delscript', field, scriptid)
```
#### field argument
script snippet must hook a filed of entity record. when the field updated by any instance of the record, astore will throw a event/callback and call your script snippet.

once tigger will incluced some fileds(multi OnUpdate is merged). so you need check who is changed(but, the NJSA can got current fieldName to help you process it).

#### scriptid argument
any uniqued string to mark your scriptContent. a script content can invoke more fields, if you can check/tag each filed. but, fieldName+scriptid must unique in global of the astore.

#### script argument
in astore, script/scriptContent must is string and the content will run into a function context. so, your &lt;putscript&gt; op must submit some lines/statements only.

but NJSA support expanded script snippet/content/environment. you can get enhanced features at the script argument. ex:
```javascript
// 1. use script line/string
centre(model, 'putscript', fieldName, 'script_1', 'print("Updated.")')

// 2. use function
centre(model, 'putscript', fieldName, 'script_2', function(){
  print("Updated.")
})

// 3. use a object as custom context, the object has custom properties as variants,
//    and 'run' peroperty will as scriptContent put into astore.
centre(model, 'putscript', fieldName, 'script_3', {
  msg: 'hello, world.'
  name: 'BlackBean'
  run: function(){
    print(name + ' say: ' + msg)
  }
})
```

#### expanded script environment
1) global variant &lt;record&gt; is standard js object
in astore native environment, the &lt;record&gt; is warped java object. so you cant direct access any field/properties, only do these:
```javascript
// in astore native environment
value_1 = record.get('field_a')
value_2 = record.get('field_b')
...
```
with NJSA, ex:
```javascript
// with NJSA
value_1 = record.field_a
value_2 = record.field_b
...
```
2) global variant &lt;fields&gt; is standard js object too
in astore native environment, the &lt;fields&gt; is array of OnUpdate changeset. so you must enumerate fields to get a field/fieldValue by name. ex:
```javascript
// in astore native environment
var findFieldName = 'field_b', gotValue
for (i=0; i<fields.length; i++)
  if (fields[i]._1.name() == findFieldName) {
    gotValue = fields[i]._2;
    break
  }
}
print(findFieldName+': ', gotValue || 'NO FOUND')
...
```
with NJSA, you can do these:
```javascript
// with NJSA
print('field_b: ', fields.field_b || 'NO FOUND')
...
```
3) global variant &lt;fieldName&gt; will set to current changed field name
in astore native environment, you cant know who changing. so you must put field names into script content in advance. but in NJSA, the &lt;fieldName&gt; is global variant. ex:
```javascript
// in NJSA
centre(model, 'putscript', 'field_b', 'script_2', function(){
  print(fieldName, 'oldValue: '+fields[fieldName], 'newValue: '+record[fieldName])
})
```

4) configurable script content
in NJSA, a function or code snippet can invoke any fields, and support configurable arguments. ex:
```javascript
// in NJSA
function showUpdating() {
  print(fieldName+' changing['+id+']: ', record[fieldName])
  http_get.apply(config.notify_uri + '?' + [
		'id=' + id,
		'oldValue=' + fields[fieldName],
		'newValue=' + record[fieldName]
	].join('&'))
}

// now you can invoke any fields with the the script, and notify some web services
var script_1 = {
  config: {
    notify_uri: 'http://localhost:8080/notify'
  },
  run: showUpdating
}

var script_2 = {
  config: {
    notify_uri: 'http://remote_host_name/notify_from_astore'
  },
  run: showUpdating
}

centre(model, 'putscript', 'field_a', 'script_2', script_1)
centre(model, 'putscript', 'field_b', 'script_2', script_2)
```

## NJSA: AStore In NodeJS
The NJSA isn't NJSAA. NJSA is a framework support for astore, but NJSAA is standard interfaces.

NJSA work at multi-model environment too, and support custom system environment version.

try run the testcase:
```bash
> node node ./t_njsa.js 
astore[user] initializing successed, result: OK
astore[activities] initializing successed, result: OK
astore system core information module initializing successed, result: OK
astore start time: Tue Feb 17 2015 02:08:02 GMT+0800 (CST)
version: 1.0
```
try run again:
```bash
> node node ./t_njsa.js 
astore start time: Tue Feb 17 2015 02:08:02 GMT+0800 (CST)
version: 1.0
```
so, the framework initializing once run anywhere. and you can check schemas/environment version in astore, or restart/reset it.

put more system information into the environment:
```javascript
var astore_options = {addr: {uri: 'http://localhost:8080'}};
var astore = require("../njsa.js")(astore_options);

// server_info write/read
astore.server_info('myinfo', 'hi, aimingoo.', function(){
  astore.server_info('myinfo', function(error, response, body){
    console.log(body)
  })
})
```

or get any njsaa instance/model
```javascript
// work at multi-model
user_centre = astore.workAt('user')
activities_centre = astore.workAt('activities')
system_centre = astore.workAt()
```

or check system_info schema, and/or load new schema as a new model
```javascript
// print/recheck system core/framework schema
console.log(astore.schema())

// schema loader for <putschema> op
new_centre = astore.workAt('test')
new_centre('putschema', astore.schema('./schema/demo.js'))
```
