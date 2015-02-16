/**
 *  a simple avro schema
**/

var ActivityRecord = {
  name: 'ActivityRecord',
  namespace: "com.wandoujia.astore.demoschema",
  type: 'record', fields: [
    { name: 'time', type: 'long', default: 0 },
    { name: 'rate', type: 'double', default: 0 }
  ]
}

var User = {
  name: 'User',
  namespace: "com.wandoujia.astore.demoschema",
  type: 'record', fields: 
    [ { name: 'name', type: 'string', default: 'anonymous' },
      { name: 'registerTime', type: 'long', default: 0 },
      { name: 'numFriends', type: 'int', default: 0 },
      { name: 'activityRecords',
        type: { type: 'array', items: "ActivityRecord" },
        default: [] },
      { name: 'state',
        type: { type: 'map', values: "string" },
        default: {} }
    ]
}

// export array as union types
module.exports = [ActivityRecord, User];