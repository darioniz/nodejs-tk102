/*
Name:         yt009 - test.js
Description:  Test script for TK102 GPS server for node.js
Author:       Franklin van de Meent (https://frankl.in)
Source:       https://github.com/fvdm/nodejs-tk102
Feedback:     https://github.com/fvdm/nodejs-tk102/issues
License:      Unlicense / Public Domain (see UNLICENSE file)
              (https://github.com/fvdm/nodejs-tk102/raw/master/UNLICENSE)
*/

var dotest = require('dotest');
var app = require('./');

// Str to work with
//var input = '1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123';
var input = '170517225424,00385918985008,GPRMC,205424.000,A,4310.1757,N,01626.4730,E,0.10,123.43,170517,,,A*69,F,, imei:863070018466416,10,-0.8,F:4.24V,1,127,19274,219,01,047E,8CEC';

// module
dotest.add('Module', function () {
  dotest.test()
    .isObject('fail', 'exports', app)
    .isObject('fail', '.settings', app && app.settings)
    .isFunction('fail', '.event', app && app.event)
    .isFunction('fail', '.createServer', app && app.createServer)
    .isFunction('fail', '.fixGeo', app && app.fixGeo)
    .isFunction('fail', '.checksum', app && app.checksum)
    .isFunction('fail', '.parse', app && app.parse)
    .done();
});

// checksum valid
dotest.add('checksum valid', function () {
  var data = app.checksum(input);

  dotest.test()
    .isExactly('fail', 'data', data, true)
    .done();
});

// checksum invalid
dotest.add('checksum invalid', function () {
  var data = app.checksum(input.toLowerCase());

  dotest.test()
    .isExactly('fail', 'data', data, false)
    .done();
});

// parser valid
dotest.add('parse valid', function () {
  var data = app.parse(input);

  dotest.test()
    .isObject('fail', 'data', data)
    .isExactly('fail', 'data.raw', data && data.raw, input)
    .isExactly('fail', 'data.checksum', data && data.checksum, true)
    .isExactly('fail', 'data.phone', data && data.phone, '00385918985008')
    .isExactly('fail', 'data.imei', data && data.imei, '863070018466416')
    .isExactly('fail', 'data.datetime', data && data.datetime, '2017-05-17 22:54:24')
    .isObject('fail', 'data.gps', data && data.gps)
    .isExactly('fail', 'data.gps.date', data && data.gps && data.gps.date, '2017-05-17')
    .isExactly('fail', 'data.gps.time', data && data.gps && data.gps.time, '20:54:24')
    .isExactly('fail', 'data.gps.signal', data && data.gps && data.gps.signal, 'full')
    .isExactly('fail', 'data.cell.id', data && data.gps && data.cell.id, '8CEC')
    .isExactly('fail', 'data.gps.fix', data && data.gps && data.gps.fix, 'active')
    .isObject('fail', 'data.geo', data && data.geo)
    .isExactly('fail', 'data.geo.latitude', data && data.geo && data.geo.latitude, 43.169595)
    .isExactly('fail', 'data.geo.longitude', data && data.geo && data.geo.longitude, 16.441217)
    .isExactly('fail', 'data.geo.bearing', data && data.geo && data.geo.bearing, 123)
    .isObject('fail', 'data.speed', data && data.speed)
    .isExactly('fail', 'data.speed.knots', data && data.speed && data.speed.knots, 0.1)
    .done();
});

// parser fail
dotest.add('parse fail', function () {
  var data = app.parse('invalid input');

  dotest.test()
    .isNull('fail', 'data', data)
    .done();
});


// Start the tests
dotest.run();
