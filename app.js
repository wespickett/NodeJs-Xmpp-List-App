var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    xmpp = require('node-xmpp'),
    mysql = require('mysql'),
    querystring = require('querystring'),

    events = require('events'),
    pipelineEmitter = new events.EventEmitter(),

    ChatManager = require('./lib/ChatManager.js'),
    DbManager = require('./lib/DbManager.js'),
    PermissionManager = require('./lib/PermissionManager.js'),
    ListManager = require('./lib/ListManager.js'),
    ListController = require('./lib/ListController.js'),
    UserManager = require('./lib/UserManager.js');


xmppClient = new xmpp.Client({jid: "wes@rtga.wespickett.com", password: "wes", host: "rtga.wespickett.com" });

xmppClient.on('online',
      function() {
	console.log('xmpp online');  
	xmppClient.send(new xmpp.Element('presence', { }).
		  c('show').t('chat').up().
		  c('status').t('Happily echoing your <message/> stanzas')
		 );
      });

xmppClient.on('error', function(e) {
	console.log(e);
});

//group@broadcast.rtga.wespickett.com

//connect mysql
var connection = mysql.createConnection({
  host     : 'rtga.wespickett.com',
  user     : 'root',
  password : 'ece452password',
  multipleStatements: true
//  database : 'rtga'
});
connection.connect();

chatManager = ChatManager(xmppClient);
dbManager = DbManager(chatManager.handleMessage);
permissionManager = PermissionManager(dbManager.handleMessage);
listManager = ListManager(permissionManager.registerDelegate, dbManager.registerDelegate, connection);
listController = ListController(permissionManager.registerDelegate, dbManager.registerDelegate, connection);
userManager = UserManager(permissionManager.registerDelegate, dbManager.registerDelegate, connection);


server.listen(80);

server.on('connection', function(stream){
  console.log("server connected :)");
});

app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    app.use(express.session({ secret: "j@m3sb0nd"}));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

//app.set('view engine', 'ejs');


app.post('/message', function (req, res) {
  
  var ret,
      message = req.body;

  console.log("message received: ", message);

  if (message && typeof message.command === "undefined") {
    ret = {
      "status": "failed",
      "msg": "no command specified"
    };
  } else {
    //start the chain
    permissionManager.handleMessage(message, function(ret){
      var send = JSON.stringify(ret);
      console.log('send:', send);
       res.send(send);
    });
  }

 
  
});
