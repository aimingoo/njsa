// -----------------------------------------------------------------------------
// -- NJSA: AStore In NodeJS
// -- Author: Aimingoo
// -- Copyright (c) 2015.02
// --
// -- usages:
// --	a = require('njsa')(opt)
// -- and
// --	a.server_info('*', callback)
// --	centre = a.workAt('YOUR_MODEL')
// --	centre('get', '12345')	-- '12345' is key
// -----------------------------------------------------------------------------

module.exports = function(opt, version) {
	var fieldName = 'server_info',
		fieldPath = '.' + fieldName,
		models = {},
		versions = {
			'1.0': {	// A AVRO RECORD SCHEMA
				type: 'record',
				name: 'ServerInfoKeys',
				fields: [{ name: fieldName, type: {type: 'map', values: 'string'} }]
			}
		},
		option = {
			server_info_struct: versions.default = versions['1.0'],
			server_info_model: 'server_info_keys',
			server_addr: {	// object of {uri} or {protocol, host, port, path}
				uri: 'http://127.0.0.1:8080'
			}
		},
		self;

	opt && opt.model && (option.server_info_model = opt.model);
	opt && opt.addr && (option.server_addr = opt.addr);
	opt && opt.version && (option.server_info_struct = versions[opt.version] || versions.default);
	return (self = {
		// list server information:
		// 	- astore.workAt()('select', '__1__', '.server_info', cb)
		//		OR
		//	- astore.server_info('*', cb)
		server_info: function(key, value) {
			var centre = self.workAt(), id = '__1__', args = [].slice.call(arguments, 0);
			if (typeof value == 'function') { // op is 'select'
				centre.apply(centre, ['select', id,
					(key == '*' ? fieldPath : fieldPath + '("' + key + '")')
				].concat(args.slice(1)));
			}
			else {
				if (key == '*') {  // update with a object
					centre.apply(centre, ['update', id, fieldPath].concat(args.slice(1)));
				}
				else {  // insert a value
					var val = {}; val[key] = value;
					centre.apply(centre, ['insert', id, fieldPath, val].concat(args.slice(2)));
				}
			}
		},
		workAt: function(model) {
			return models[model || (model = option.server_info_model)] || (models[model] =
				require('./njsa_api.js').option(option.server_addr).at(model));
		},
		schema: function(modPath) {
			return JSON.stringify(modPath ? require(modPath) : option.server_info_struct)
		}
	})
}
