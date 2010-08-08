/* Copyright (c) 2009 Marak Squires - http://github.com/marak/node_mailer
 
Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:
 
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/


var tcp = require('net');
var sys = require('sys');

var keyStr = "ABCDEFGHIJKLMNOP" +
             "QRSTUVWXYZabcdef" +
             "ghijklmnopqrstuv" +
             "wxyz0123456789+/" +
             "=";

function encode64(input)
{
   var output = "";
   var chr1, chr2, chr3 = "";
   var enc1, enc2, enc3, enc4 = "";
   var i = 0;

   do {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
         enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
         enc4 = 64;
      }

      output = output +
         keyStr.charAt(enc1) +
         keyStr.charAt(enc2) +
         keyStr.charAt(enc3) +
         keyStr.charAt(enc4);
      chr1 = chr2 = chr3 = "";
      enc1 = enc2 = enc3 = enc4 = "";
   } while (i < input.length);

   return output;
}

var boundary = "---000e0cd6ae4c55f3b6048cde954c";

function crlf(con,str)
{
	con.write(str + '\r\n');
}

function contentType(filename)
{
	var idx = filename.lastIndexOf('.');
	if (idx >= 0)
	{
		var ext = filename.substr(idx+1);
		switch(ext.toLowerCase())
		{
			case 'jpeg':
			case 'jpg':
				return 'image/jpeg';
			case 'png':
				return 'image/png';
			case 'gif':
				return 'image/gif';
			case 'txt':
				return 'text/plain';
			case 'zip':
				return 'application/zip';
		}
	}
	return 'unknown';
}

function sendBinary(con,mime)
{
	crlf(con,'--' + boundary);
	crlf(con,'Content-Type: '+(mime.ContentType || contentType(mime.filename))+';');
	crlf(con,'Content-Transfer-Encoding: base64');
	crlf(con,'Content-Disposition: inline;');
	crlf(con,' filename="'+mime.filename+'"');
	crlf(con,'');
	var txt = encode64(mime.data); //FIXME - change this to internal nodejs function if/when it gets exposed
	for(var i=0,len=txt.length;i<len;i+=72)
		con.write(txt.substr(i,72)+'\r\n');
}

function sendText(con,mime)
{
	crlf(con,'--' + boundary);
	crlf(con,'Content-Type: '+(mime.ContentType || 'text/html'));
	crlf(con,'Content-Transfer-Encoding: '+(mime.ContentTransferEncoding || '7bit'));
	crlf(con,'');
	crlf(con,mime.data);
}

function sendMimeHeader(con)
{
  crlf(con,'MIME-Version: 1.0');
	crlf(con,'Content-Type: multipart/mixed;');
	crlf(con,' boundary="'+boundary+'"');
	crlf(con,'');
	crlf(con,'This is a multi-part message in MIME format.');
}

function sendMimes(con,body,mimes)
{
	sendMimeHeader(con);
	if (body)
		sendText(con,{data:body});
	for(var i=0;i<mimes.length;i++)
	{
		var mime = mimes[i];
		if (!mime.filename)
			sendText(con,mime);
		else
			sendBinary(con,mime);
	}
	crlf(con,'--' + boundary + '--');
}

var email = {
  send: function (options) {
    var options = typeof(options) == "undefined" ? {} : options;
    options.to = typeof(options.to) == "undefined" ? "marak.squires@gmail.com" : options.to;
    options.from = typeof(options.from) == "undefined" ? "obama@whitehouse.gov" : options.from;
    options.subject = typeof(options.subject) == "undefined" ? "node_mailer test email" : options.subject;
    options.body = typeof(options.body) == "undefined" ? "hello this is a test email from the node_mailer" : options.body;  
    options.host = typeof(options.host) == "undefined" ? "localhost" : options.host;
    options.domain = typeof(options.domain) == "undefined" ? "localhost" : options.domain;
    options.port = typeof(options.port) == "undefined" ? 25 : options.port;
        
    var self = this;


    this.connection = tcp.createConnection(options.port, options.host);
    this.connection.setEncoding('utf8');
    this.connection.addListener("connect", function () {
      self.connection.write("helo " + options.domain + "\r\n");
      if(options.authentication === "login") {
        self.connection.write("auth login\r\n");
        self.connection.write(options.username + "\r\n");
        self.connection.write(options.password + "\r\n");
      }
      self.connection.write("mail from: " + options.from + "\r\n");
      self.connection.write("rcpt to: " + options.to + "\r\n");
      self.connection.write("data\r\n");
      self.connection.write("From: " + options.from + "\r\n");
      self.connection.write("To: " + options.to + "\r\n");
      self.connection.write("Subject: " + options.subject + "\r\n");
			if (options.mimes)
				sendMimes(self.connection,email.wordwrap(options.body),options.mimes);
			else
			{
      	self.connection.write("Content-Type: text/html\r\n");
      	self.connection.write(email.wordwrap(options.body) + "\r\n");
			}
      self.connection.write(".\r\n");
      self.connection.write("quit\r\n");
      self.connection.end();
    });

    this.connection.addListener("data", function (data) {
        if(email.parseResponse(data)){
          //sys.puts("SUCC");
        } else{
          sys.puts("ERR: \n" + data);
        }
    });
  },

  parseResponse:function(data){
    var d = data.split("\r\n");
		for(var i in d){
    	if(d[i][0] == '2'){
        return true;
      }
    };
    return false;
  },
  
  wordwrap:function(str){
    var m = 80;
    var b = "\r\n";
    var c = false;
    var i, j, l, s, r;
    str += '';
    if (m < 1) {
      return str;
    }
    for (i = -1, l = (r = str.split(/\r\n|\n|\r/)).length; ++i < l; r[i] += s) {
      for(s = r[i], r[i] = ""; s.length > m; r[i] += s.slice(0, j) + ((s = s.slice(j)).length ? b : "")){
        j = c == 2 || (j = s.slice(0, m + 1).match(/\S*(\s)?$/))[1] ? m : j.input.length - j[0].length || c == 1 && m || j.input.length + (j = s.slice(m).match(/^\S*/)).input.length;
      }
    }
    return r.join("\n");
  }
}

exports.send = email.send;
