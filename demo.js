var email = require("mailer");


var mimes = [ {data:"mime text message"}, {filename:"test.png"}], {filename:"test.jpg"} ];
for(var i in mimes)
{
	if (mimes[i].filename)
		mimes[i].data = fs.readFileSync(mimes[i].filename, "binary");
}

email.send({
  host : "localhost",              // smtp server hostname
  port : "25",                     // smtp server port
  domain : "localhost",            // domain used by client to identify itself to server
  authentication : "login",        // auth login is supported; anything else is no auth
  username : "dXNlcm5hbWU=",       // Base64 encoded username
  password : "cGFzc3dvcmQ=",       // Base64 encoded password
  to : "marak.squires@gmail.com",
  from : "obama@whitehouse.gov",
  subject : "node_mailer test email",
  body : "hello this is a test email from the node_mailer",
	mimes : mimes
});
