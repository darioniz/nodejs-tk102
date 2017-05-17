/*
  Start with:  node example.js
  Telnet to:   telnet 127.0.0.1 1337
  Copy/paste:  1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123
*/

var xt009 = require('xt009');
var net = require('net');

var gps = '1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123';

// fancy console log
function output(data) {
  console.log('\nIncoming GPS data:\n');
  console.dir(data, {
    colors: String(process.env.TERM).match(/color$/)
  });
}

// report only track event to console
xt009.on('track', output);

// wait for server to be ready
xt009.on('listening', function (lst) {
  var client;

  console.log('TK102 server is ready');

  // Send data with telnet
  client = net.connect(lst.port, function () {
    console.log('Connected to XT009 server');
    console.log('Sending GPS data string for processing');

    client.write(gps + '\r\n');
    client.end();

    console.log('CTRL+C to exit');
  });
});

// start server
xt009.createServer({
  port: 1337
});
