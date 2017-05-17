/*
Name:         xt009
Description:  XT009 GPS server for Node.js
Author:       Franklin van de Meent (https://frankl.in)
Modified by:  Dario Nizetic
Source:       https://github.com/darioniz/nodejs-xt009
Fork of:      https://github.com/fvdm/nodejs-tk102
*/

var net = require('net');
var EventEmitter = require('events').EventEmitter;
var xt009 = new EventEmitter();

// device data
var specs = [
  function (raw) {
    // 170517225424,00385918985008,GPRMC,205424.000,A,4310.1757,N,01626.4730,E,0.10,123.43,170517,,,A*69,F,, imei:863070018466416,10,-0.8,F:4.24V,1,127,19274,219,01,047E,8CEC
    // datetime (0), authorized number (1), gprmc (2), local time (3), gps fix (4), lat (5, 6), lon (7, 8), speed knots (9), heading/bearing (10), date (11), signal (15), imei (17), number of satelites (18), altitude(19), battery (20), is_charging (21), mobile country code (24), mobile network code (25), location area code (26), gsm cell id (27)
    var result = null;
    var str = [];
    var datetime = '';
    var gpsdate = '';
    var gpstime = '';
    var imei = '';

    try {
      raw = raw.trim();
      str = raw.split(',');

      if ((str.length === 18 || str.length === 28) && str[2] === 'GPRMC') {
        datetime = str[0].replace(/([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/, function (s, y, m, d, h, i, ms) {
          return '20' + y + '-' + m + '-' + d + ' ' + h + ':' + i + ':' + ms;
        });

        gpsdate = str[11].replace(/([0-9]{2})([0-9]{2})([0-9]{2})/, function (s, d, m, y) {
          return '20' + y + '-' + m + '-' + d;
        });

        gpstime = str[3].replace(/([0-9]{2})([0-9]{2})([0-9]{2})\.([0-9]{3})/, function (s0, h, i, s, ms) {
          return h + ':' + i + ':' + s;
        });

        if (str.length === 28) {
          imei = str[17].replace('imei:', '').trim();
        } else {
          imei = str[16].replace('imei:', '');
        }

        result = {
          raw: raw,
          datetime: datetime,
          phone: str[1],
          battery: str[20],
          charging: str[21],
          gps: {
            date: gpsdate,
            time: gpstime,
            signal: str[15] === 'F' ? 'full' : 'low',
            fix: str[4] === 'A' ? 'active' : 'invalid',
            sats: str[18]
          },
          cell: {
            mcc: str[24],
            mnc: str[25],
            lac: str[26],
            id: str[27]
          },
          geo: {
            latitude: xt009.fixGeo(str[5], str[6]),
            longitude: xt009.fixGeo(str[7], str[8]),
            bearing: parseInt(str[10], 10)
          },
          speed: {
            knots: Math.round(str[9] * 1000) / 1000,
            kmh: Math.round(str[9] * 1.852 * 1000) / 1000,
            mph: Math.round(str[9] * 1.151 * 1000) / 1000
          },
          imei: imei,
          checksum: xt009.checksum(raw)
        };
      }
    } catch (e) {
      result = null;
    }

    return result;
  }
];

// defaults
xt009.settings = {
  ip: '0.0.0.0',
  port: 0,
  connections: 10,
  timeout: 10
};


// Emit event
xt009.event = function (name, value) {
  xt009.emit(name, value);
  xt009.emit('log', name, value);
};

// Catch uncaught exceptions (server kill)
process.on('uncaughtException', function (err) {
  var error = new Error('uncaught exception');

  error.error = err;
  console.log(error);
  xt009.event('error', error);
});

// Create server
xt009.createServer = function (vars) {
  var key;

  // override settings
  if (typeof vars === 'object' && Object.keys(vars).length >= 1) {
    for (key in vars) {
      xt009.settings[key] = vars[key];
    }
  }

  // start server
  xt009.server = net.createServer();

  // maximum number of slots
  xt009.server.maxConnections = xt009.settings.connections;

  // server started
  xt009.server.on('listening', function () {
    xt009.event('listening', xt009.server.address());
  });

  // inbound connection
  xt009.server.on('connection', function (socket) {
    var connection = xt009.server.address();

    connection.remoteAddress = socket.remoteAddress;
    connection.remotePort = socket.remotePort;

    xt009.event('connection', connection);
    socket.setEncoding('utf8');

    if (xt009.settings.timeout > 0) {
      socket.setTimeout(parseInt(xt009.settings.timeout * 1000, 10));
    }

    socket.on('timeout', function () {
      xt009.event('timeout', connection);
      socket.destroy();
    });

    socket.on('data', function (data) {
      var gps = {};
      var err = null;

      data = data.trim();
      xt009.event('data', data);

      if (data !== '') {
        gps = xt009.parse(data);

        if (gps) {
          xt009.event('track', gps);
        } else {
          err = new Error('Cannot parse GPS data from device');
          err.reason = err.message;
          err.input = data;
          err.connection = connection;

          xt009.event('fail', err);
        }
      }
    });

    socket.on('close', function (hadError) {
      connection.hadError = hadError;
      xt009.event('disconnect', connection);
    });

    // error
    socket.on('error', function (error) {
      var err = new Error('Socket error');

      err.reason = error.message;
      err.socket = socket;
      err.settings = xt009.settings;

      xt009.event('error', err);
    });
  });

  xt009.server.on('error', function (error) {
    var err = new Error('Server error');

    if (error === 'EADDRNOTAVAIL') {
      err = new Error('IP or port not available');
    }

    err.reason = error.message;
    err.input = xt009.settings;

    xt009.event('error', err);
  });

  // Start listening
  xt009.server.listen(xt009.settings.port, xt009.settings.ip);

  return xt009;
};

// Parse GPRMC string
xt009.parse = function (raw) {
  var data = null;
  var i = 0;

  while (data === null && i < specs.length) {
    data = specs[i](raw);
    i++;
  }

  return data;
};

// Clean geo positions, with 6 decimals
xt009.fixGeo = function (one, two) {
  var minutes = one.substr(-7, 7);
  var degrees = parseInt(one.replace(minutes, ''), 10);

  one = degrees + (minutes / 60);
  one = parseFloat((two === 'S' || two === 'W' ? '-' : '') + one);

  return Math.round(one * 1000000) / 1000000;
};

// Check checksum in raw string
xt009.checksum = function (raw) {
  var str = raw.trim().split(/[,*#]/);
  var strsum = parseInt(str[15], 10);
  var strchk = str.slice(2, 15).join(',');
  var check = 0;
  var i;

  for (i = 0; i < strchk.length; i++) {
    check ^= strchk.charCodeAt(i);
  }

  check = parseInt(check.toString(16), 10);
  return (check === strsum);
};

// ready
module.exports = xt009;
