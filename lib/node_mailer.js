// simple emailer originally based on marak squires' node-mailer
// bsd license
var tcp = require('net');
var sys = require('sys');

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
	for(var i=0,len=mime.data.length;i<len;i+=54)
		con.write(mime.data.toString('base64',i,(i+54) < len ? (i+54) : len) + '\r\n');
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

function send(options)
{
	var client = tcp.createConnection(options.port || 25, options.host || 'localhost');
	client.setEncoding(options.encoding || 'utf8');
	client.addListener("connect", function()
	{
		crlf(client,"mail from: " + options.from);
		crlf(client,"rcpt to: " + options.to);
		crlf(client,"data");
		crlf(client,"From: " + options.from);
		crlf(client,"To: " + options.to);
		crlf(client,"Subject: " + options.subject);
    if(options.authentication === "login")
		{
      crlf(client,"auth login");
      crlf(client,options.username);
      crlf(client,options.password);
    }
		if (options.mimes)
			sendMimes(client,options.body,options.mimes);
		else
		{
			crlf(client,"Content-Type: text/html");
			crlf(client,"\r\n" + options.body);
		}
		crlf(client,".");
		crlf(client,"quit");
		client.end();
	});
	client.addListener("data", function (data)
	{
		if (data[0] != '2' && (data.indexOf("\n2")<0))
			sys.puts('SMTP Err:\n' + data);
	});
}

exports.send = send;
