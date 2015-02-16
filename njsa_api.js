// -----------------------------------------------------------------------------
// -- NJSAA: AStore standard api/interfaces for njsa
// -- Author: Aimingoo
// -- Copyright (c) 2015.02
// --
// -- dependencies:
// --	npm install request
// --
// -- usages:
// --	centre = require('./njsa_api.js')
// --	centre = require('./njsa_api.js').option(opt)
// -- and
// --	centre(model, op, id, ...)
// -- or
// --	centre = require('./njsa_api.js').at('account')
// --	centre = require('./njsa_api.js').option(opt).at('account')
// --	centre(op, id, ...)
// -----------------------------------------------------------------------------

var centre_opt = {
	headers: {
		"Content-Type": 	"text/plain; charset=UTF-8"
	},
	host: 	'127.0.0.1',
	port: 	'8080',
	method: 'POST',
	path: 	''			// tailed without '/'
}

//-- normal/check interface
//	http://127.0.0.1:8080/ping

//-- Documents
//	https://github.com/wandoulabs/astore#restful-api

//-- op for record
// centre(model, 'get',		id)					 -- is 'GET' http_method
// centre(model, 'put',		id, value)

//-- op for record with key
// centre(model, 'get',		id, key)
// centre(model, 'put',		id, key, value)

//-- op for record with avpath
// centre(model, 'select',	id)					 -- is select_op with avpath: '.'
// centre(model, 'select',	id, avpath)
// centre(model, 'update',	id, avpath, value)

//-- op for Array / Map only. use avpath.
// centre(model, 'insert',	id, avpath, value)
// centre(model, 'insertall',id, avpath, KVs)
// centre(model, 'clear',	id, avpath)
// centre(model, 'delete',	id, avpath)

//-- op for schema
// centre(model, 'putschema', schema)
// centre(model, 'putschema', schema, params)	-- params = {fullname=aString, timeout=aNumber}
// centre(model, 'delschema')					-- is 'GET' http_method

//-- op for script
// centre(model, 'putscript', field, scriptid, script)	-- <script> is function/string, or object with 'run' property.
// centre(model, 'delscript', field, scriptid)	-- is 'GET' http_method

module.exports = function(baseOpt) {
	var request = require('request');

	function AStroeScriptFactory(fieldName, func) {
		function functionBody(func) {
			with ((func||this).toString()) return slice(indexOf('{') + 1, lastIndexOf('}'))
		}

		// <func> is a String, function, or object with <.run> member.
		//	- if <func> is object, then all properties will put into script context's <variants>
		function variantsDefine(fieldName, func) {
			var variants = ['var fieldName = "' + fieldName + '"'];
			if (func && typeof func == 'object') {
				Object.keys(func).forEach(function(key) {
					if (key != 'run') {
						if (typeof func[key] == 'function') {
							variants.push(key + ' = ' + func[key].toString())
						}
						else {
							variants.push(key + ' = ' + JSON.stringify(func[key]))
						}
					}
				})
				if (func.run) func = func.run
			}
			variants.push("ScriptContext = function(record, fields) {" +
				(func ? (typeof func == 'function' ? functionBody(func) : func.toString()) : '') +
			"}")
			return variants.join(', ')
		}

		function ScriptExecutor() {
			function AsClosedObject(me, Ids) {
				return new JSAdapter({ get: function(name) {return me.get(name)} }, {
					__get__: function(name) { return me.schema.getField(name) ? me.get(name) : undefined },
					__has__: function(name) { return me.schema.getField(name) !== null },
					__put__: function(name, value, field) { (field = me.schema.getField(name)) && me.put(field.pos(), value) },
					__getIds__: function() { return Ids || ([].forEach.call(me.schema.getFields(), function(item){ this.push(item.name()) }, Ids=['get']), Ids) },
				})
			}
			function AsFields(me, Ids) {
				var fields = {};
				[].forEach.call(me, function(field) { fields[this[this.length] = field._1.name()] = field._2 }, Ids=[])
				return (new JSAdapter({
					__get__: function(name) { return fields[name] },
					__has__: function(name) { return Ids.indexOf(name) },
					__getIds__: function() { return Ids }
				}))
			}

			try {
				ScriptContext(AsClosedObject(record), AsFields(fields))
			}
			catch (e) {
				print('[ERROR-JS] .' + fieldName + '/' + id + ': ' + e.message)
				// http_get.apply('http://localhost/sc?ERROR&id=' + id + '&msg=' + encodeURIComponent(e.message))
			}
		}

		return variantsDefine(fieldName, func) + ';\n' +
			functionBody(ScriptExecutor).replace(/^\t\t\t/mg, '');
	}

	var NJSAA = function(model, op, id, avpath) {
		var msg, callback, params, option = Object.create(baseOpt), last = arguments.callee.length;
		switch (op) {
			case 'get': 	// [model, 'get', id, cb]
				if (typeof avpath === 'function') {
					callback = avpath
					avpath = undefined
				}
				else {		// [model, 'get', id, field, cb]
					callback = arguments[last]
				}
				option.method = 'GET'
				break
			case 'put': 	// [model, 'put', id, msg, cb]
				callback = arguments[last]
				if (typeof callback === 'function') {
					msg = avpath
					avpath = undefined
				}
				else { 		// [model, 'put', id, field, msg, cb]
					msg = callback
					callback = arguments[last + 1]
				}
				break
			case 'update': 	// [model, '<op>', id, avpath, msg, cb]
			case 'insert':
			case 'insertall':
				msg = arguments[last]
				callback = arguments[last + 1]
				break
			case 'select': 	// [model, 'select', id, cb]
				if (typeof avpath === 'function') {
					callback = avpath
					avpath = '.'
				}
				else {		// [model, 'select', id, avpath, cb]
					callback = arguments[last]
				}
				break
			case 'clear':	// [model, '<op>', id, avpath, cb]
			case 'delete':
				callback = arguments[last]
				break
			case 'putschema':	// [model, 'putschema', msg, cb]
				msg = id
				if (typeof avpath === 'function') {
					callback = avpath
				}
				else { 			// [model, 'putschema', msg, params, cb]
					params = avpath
					callback = arguments[last]
				}
				id = undefined
				avpath = undefined
				break;
			case 'delschema': 	// [model, 'delschema', cb]
				callback = id
				avpath = id = undefined
				option.method = 'GET'
				break
			case 'putscript': 	// [model, 'putscript', field, scriptid, msg, cb]
				msg = AStroeScriptFactory(id, arguments[last])	// <id> is fieldName
				callback = arguments[last+1]
				break;
			case 'delscript':	// [model, 'delscript', field, scriptid, cb]
				callback = arguments[last]
				option.method = 'GET'
				break;
			default:
				throw new Error('Unknow Astore Op.')
		}

		var paths = [option.uri];
		if (op == 'putschema' || op == 'delschema') {
			paths.push(op, model)
		}
		else if (op == 'putscript' || op == 'delscript') {
			paths.push(model, op, id, avpath) 	// push <id> as $field, and <avpath> as $scriptid
			avpath = undefined
		}
		else {
			paths.push(model, op, id)
			if (avpath !== undefined && option.method === 'GET') {
				paths.push(avpath)
				avpath = undefined
			}
		}

		var param, value, paramArr = [];
		for (param in params) {
			switch (typeof(value = params[param])) {
				case 'undefined': break;
				case 'boolean':
					(value === true) && paramArr.push(param); break;
				default:
					(value !== null) && paramArr.push(param + '=' + value.toString());
			}
		}
		var url = paths.join('/') + (paramArr.length > 0 ? '?' + paramArr.join('&') : '')
		var cb = callback || (function(error, response, body) {
			var c = response && response.statusCode && response.statusCode.toString().charAt(0)
			if (error || (c != '2')) {
				console.log(['[', error, ']'].join(''), response && response.statusCode, body)
			}
		});

		if (option.method == 'GET') {
			request.get(url, cb)
		}
		else { // POST/PUT/...
			var method = option.method.toLowerCase()
			var body = (typeof msg === 'object' ? JSON.stringify(msg) : (msg === undefined ? "" : msg.toString()))
			if (avpath !== undefined) {
				body = avpath + (body === "" ? "" : '\n' + body)
			}
			request[method]({url: url, body: body, headers: option.headers}, cb)
		}
	}

	// re-init options
	NJSAA.option = function(opt) {
		var opt = opt || {};
		Object.keys(opt).forEach(function(key) {
			this[key] = opt[key]
		}, baseOpt)

		if (!('uri' in opt)) {
			baseOpt.uri = [
				baseOpt.protocol || 'http',
				'://',
				baseOpt.host,
				baseOpt.port ? ':' + baseOpt.port : '',
				baseOpt.path || ''
			].join('');
		}

		if (!('method' in baseOpt)) {
			baseOpt.method = 'GET'
		}

		return this
	}

	NJSAA.at = function(model) {
		if (! model) return NJSAA;
		var njsaa_at = function() {
			// return NJSAA.apply(this, [model].concat([].slice.call(arguments, 0)))
			[].unshift.call(arguments, model)
			return NJSAA.apply(this, arguments)
		}

		njsaa_at.option = NJSAA.option
		njsaa_at.at = NJSAA.at
		return njsaa_at
	}

	NJSAA.option()
	return NJSAA
}(centre_opt)