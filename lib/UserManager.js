///---UserManager---
(function() {

	//private vars
	var commandListeners = "register login".split(' '),
		db,
		responseObj = {
			status: 'failure',
			msg: ''
		};
	
	//public
	var publicReturn = {
		permission: function(message, cb) {
			
			var returnObj = {
				is_permitted: false,
				msg: ''
			};

			if (typeof message !== "undefined" && typeof message.command === "string") {
				switch (message.command) {
					case "login":
					case "register":
						returnObj.is_permitted = true;
						break;
					default: 
						break;
				}
			}
			if (returnObj.is_permitted === false) {
				returnObj.msg = "User does not have permission to " + message.command + "";
			}
			cb(returnObj); 
		},
		process: function(message, cb) {
			
			var returnObj = {
				success: false,
				msg: ''
			};


			var login = function() {

				var pass = true;

				if (typeof message !== "undefined") {
					if (typeof message.userId === "undefined") {
						returnObj.msg += "no username set;";
						pass = false;
					}
					if (typeof message.password === "undefined") {
						returnObj.msg += "no password set;";
						pass = false;
					}

					if (pass === true) {
						var q = db.query("SELECT * FROM `rtga`.`users` WHERE `username` = ? AND `password` = ?", [message.username, message.password], function(err, result){
							if (!err) {
								console.log(result.length);
								if (result.length > 0) {
									//log user in
									
									returnObj.success = true;
									
									returnObj.response = {
										'status': 'success',
										'msg': "Sucessfully logged in.",
										'userId': result[0]['id']
									};
									
									cb(returnObj);
								}
							} else {
								returnObj.msg = err;
								cb(returnObj);
							}
						});
						console.log(q.sql);
					}
				}
			};

			var register = function() {

				var pass = true;

				if (typeof message !== "undefined") {
					if (typeof message.username === "undefined") {
						returnObj.msg += "no username set;";
						pass = false;
					}
					if (typeof message.password === "undefined") {
						returnObj.msg += "no password set;";
						pass = false;
					}

					if (pass === true) {
						//register user
						var q = db.query("INSERT INTO `rtga`.`users` VALUES(null, ?, ?)", [message.username, message.password], function(err, result){
							if (!err) {
								console.log(result);
								returnObj.success = true;
								
								returnObj.response = {
									'status': 'success',
									'msg': "User: " + message.username + " sucessfully registered",
									'userId': result.insertId 
								};

								cb(returnObj);
							} else {
								returnObj.msg = err;
								cb(returnObj);
							}
						});
						console.log(q.sql);
					} else {
						cb(returnObj);
					}
				}
			}

			if (typeof message !== "undefined" && typeof message.command === "string") {
				var handle;
				switch (message.command) {
					case "register":
						register();
						break;
					case "login":
						login();
						break;
					default: 
						returnObj.msg = message.command + " not registered on server";
						cb(returnObj);
						break;
				}
			};
			
		}
	};
	
	var init = function(permissionManagerRegister, dbManagerRegister, dbConnection) {
		db = dbConnection;		
		//init: register command listeners
		commandListeners.forEach(function (command) {
			permissionManagerRegister(command, publicReturn.permission);
			dbManagerRegister(command, publicReturn.process);
		});
	};
	
	
	module.exports = function(permissionManagerRegister, dbManagerRegister, dbConnection) {
		init(permissionManagerRegister, dbManagerRegister, dbConnection);
		return publicReturn;
	}
})();
///---End UserManager---