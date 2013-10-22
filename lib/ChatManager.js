///---ChatManager---
(function(){

	var delegates = {},
		//next,
		xmppClient,
		xmpp = require('node-xmpp');
	
	var publicReturn =  {
		registerDelegate: function(command, handler) {
			if (typeof command === "string" && typeof handler === "function") {
				delegates[command] = handler;
			} else {
				console.log("cannot register chat delegate: bad parameters"); //TODO: better handle
			}
		},
		handleMessage: function (message, pipelineCB) {
			var chatStatus,
				delegate;

			var broadcast = function(msg) {
				console.log("broadcast:", msg);
				xmppClient.send(new xmpp.Element('message', { to: msg.sendTo, type: 'chat'}).c('body').t(msg.body));
			};


			if (typeof message.response !== "undefined" && typeof message.response.status !== "undefined" && message.response.status === "success") {
				if (typeof message.broadcast !== "undefined") {
					broadcast(message.broadcast);
				}
				pipelineCB(message.response);
			} else {
				var errorMsg = "no message";
				if (typeof message.response.msg !== "undefined") errorMsg = message.response.msg;
				pipelineCB({status: "failed", msg: errorMsg});
			}
			// delegate = delegates[message.command];
			// if (typeof delegate !== "undefined") {

			// 	delegate(message, function(chatStatus){

			// 		console.log("chatStatus",chatStatus)
				
			// 		if (chatStatus && typeof chatStatus.success !== undefined && chatStatus.status === 'success') {
						
			// 			//if msg != '' broadcast the message

			// 			pipelineCB(chatStatus);
			// 		} else {
			// 			pipelineCB({status: "failed", msg: chatStatus.msg});
			// 		}

			// 	});				

			// } else {
			// 	console.log("chat delegate: "+message.command+" not registered"); //TODO: better handle
			// 	pipelineCB({status: "failed", msg: "chat delegate: "+message.command+" not registered"});
			// }
		}
	}
	
	module.exports = function(xmppConnection){
		xmppClient = xmppConnection;
		//next = nextModule;
		return publicReturn;
	};
	
})();
///---End ChatManager---