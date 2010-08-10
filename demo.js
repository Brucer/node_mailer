var email = require("mailer");

var mime = {filename:"test.jpg"};
	mime.data = fs.readFileSync(mime.filename);

email.send({
  host : "localhost",              // smtp server hostname
  port : "25",                     // smtp server port
	from : "email@corp.com",
	to : "person@corp.com",
  subject : "node_mailer test email",
  body : "hello this is a test email from the node_mailer",
	mimes : [mime]
});
