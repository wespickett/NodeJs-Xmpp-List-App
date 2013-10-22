///---DbManager---
(function(){

	var delegates = {},
		next; 
	
	var publicReturn =  {
		registerDelegate: function(command, handler) {
			if (typeof command === "string" && typeof handler === "function") {
				delegates[command] = handler;
			} else {
				console.log("cannot register db delegate: bad parameters"); //TODO: better handle
			}
		},
		handleMessage: function (message, pipelineCB) {
			var processStatus,
				delegate;

			delegate = delegates[message.command];
			if (typeof delegate !== "undefined") {
				
				delegate(message, function(processStatus){

					console.log("processStatus", processStatus)
					
					if (processStatus && typeof processStatus.success !== undefined && processStatus.success === true) {
						if (typeof next === "function") {
							message.response = processStatus.response;
							message.broadcast = processStatus.broadcast;
							next(message, pipelineCB);
						} else {
							console.log("permissionManager: no next");
							pipelineCB({status: "failed", msg: "chain broken after dbManager"});
						}
					} else {
						pipelineCB({status: 'failed', msg: "~"+processStatus.msg});
					}
				});
				
			} else {
				console.log("db delegate: "+ message.command +" not registered"); //TODO: better handle
				pipelineCB({status: "failed", msg: "db delegate: "+ message.command +" not registered"});
			}
		}
	}
	
	module.exports = function(nextModule){
		next = nextModule;
		return publicReturn;
	};
	
})();
///---End DbManager---
