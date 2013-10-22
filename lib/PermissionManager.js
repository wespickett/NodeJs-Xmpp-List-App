///---PermissionManager---
(function(){

	var delegates = {},
		next;
	
	var publicReturn = {
		registerDelegate: function(command, handler) {
			if (typeof command === "string" && typeof handler === "function") {
				delegates[command] = handler;
			} else {
				console.log("cannot register permission delegate: bad parameters"); //TODO: better handle
			}
		},
		handleMessage: function (message, pipelineCB) {
			var permissionStatus,
				delegate;

			delegate = delegates[message.command];
			if (typeof delegate !== "undefined") {
				
				delegate(message, function(permissionStatus) {

					console.log("permissionStatus: ", permissionStatus);
					if (permissionStatus.is_permitted === true) {
						//send message to DbDelegate
						if (typeof next === "function") {
							next(message, pipelineCB);
						} else {
							console.log("permissionManager: no next");
							pipelineCB({status: "failed", msg: "chain broken after permissionManager"});
						}
					} else {
						console.log("delegate of permissionManager failed");
						pipelineCB({status: 'failed', msg: permissionStatus.msg});
					}

				});
				
			} else {
				console.log("permission delegate: "+ message.command +" not registered"); //TODO: better handle
				pipelineCB({status: "failed", msg: "permission delegate: "+ message.command +" not registered"});
			}
		}
	}
	
	module.exports = function(nextModule){
		next = nextModule;
		return publicReturn;
	};
	
})();
///---End PermissionManager---