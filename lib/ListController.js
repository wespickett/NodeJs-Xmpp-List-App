///---ListController---
(function() {

	//private vars
	var commandListeners = "add delete workOn workOff checkOn checkOff".split(' '),
		db;
	
	//public
	var publicReturn = {
		permission: function(message, cb) {
			
			var requiredPermissionLevel = 0,
				returnObj = {
				is_permitted: false,
				msg: ''
			};

			if (typeof message !== "undefined" && typeof message.command === "string") {
				switch (message.command) {
					//always allowed
					case "add":
						requiredPermissionLevel = 0;
						//call function below, then break.. TODO: pull out function below
					case "checkOn":
					case "checkOff":
					case "workOn":
					case "workOff":
					case "delete":
						db.query("SELECT * FROM `rtga`.`listpermissions` WHERE `listId` = ? AND `userId` = ?", [message.listId, message.userId], function(err, result){
							if (!err && result.length > 0) {
								if (result[0].permissionLevel === requiredPermissionLevel) {

									returnObj.is_permitted = true;
									cb(returnObj);
								} else {
									returnObj.msg = "The user needs a higher permission level to do this";
									cb(returnObj);
								}
							} else if (result.length === 0) {
								returnObj.msg = "Item doesnt exist";
								cb(returnObj);
							} else {
								returnObj.msg = err;
								cb(returnObj);
							}
						});
						break;
					default: 
						if (returnObj.is_permitted === false) {
							returnObj.msg = "User does not have permission to " + message.command + "";
						}
						cb(returnObj);
						break;
				}
			}
		},
		process: function(message, cb) {
			
			var returnObj = {
				success: false,
				msg: ''
			};

			var add = function() {
				db.query("INSERT INTO `rtga`.`listvalues` VALUES(null, ?, ?, ?, 0, null, null)", [message.listId, message.value, message.userId], function(err, result){
					if (!err) {
						//successfully added
						returnObj.success = true;

						returnObj.response = {
							'status': 'success',
							'listId': message.listId,
							'itemId': ""+result.insertId,
							'msg': message.value + ' successfully added to list.'
						};

						returnObj.broadcast = {
							'sendTo': 'listgroup' + message.listId + '@broadcast.rtga.wespickett.com',
							'body': JSON.stringify({
								'command':'add',
								'listId': message.listId,
								'value': message.value,
								'itemId': ""+result.insertId,
								'userId': message.userId
							})
						};

						cb(returnObj);

					} else {
						returnObj.msg = err;
						cb(returnObj);
					}
				});
			};

			var check = function(state) {
				var state = (state) ? 1 : 0;
				var checkedUser = (state) ? message.userId : null ;
				db.query("UPDATE `rtga`.`listvalues` SET `state` = ?, `checkedOffUser` = ? WHERE id = ?", [state, checkedUser, message.itemId], function(err, result){
					if (!err) {
						//successfully added

						returnObj.success = true;

						var action = (state) ? 'On' : 'Off' ;
						returnObj.response = {
							'status': 'success',
							'msg': 'Successfully checked ' + action + ' item.',
							'itemId': message.itemId
						};

						returnObj.broadcast = {
							'sendTo': 'listgroup' + message.listId + '@broadcast.rtga.wespickett.com',
							'body': JSON.stringify({
								'command': 'check' + action,
								'listId': message.listId,
								'itemId': message.itemId,
								'userId': message.userId
							})
						};

						cb(returnObj);

					} else {
						returnObj.msg = err;
						cb(returnObj);
					}
				});
			};

			var work = function(state) {
				var state = (state) ? 2 : 0;
				var workingUser = (state) ? message.userId : null ;
				db.query("UPDATE `rtga`.`listvalues` SET `state` = ?, `workingOnUser` = ? WHERE id = ?", [state, workingUser, message.itemId], function(err, result){
					if (!err) {
						//successfully added

						returnObj.success = true;

						var action = (state) ? 'On' : 'Off' ;
						returnObj.response = {
							'status': 'success',
							'msg': 'Successfully marked working ' + action + ' item.',
							'itemId': message.itemId
						};

						returnObj.broadcast = {
							'sendTo': 'listgroup' + message.listId + '@broadcast.rtga.wespickett.com',
							'body': JSON.stringify({
								'command': 'working' + action,
								'listId': message.listId,
								'itemId': message.itemId,
								'userId': message.userId
							})
						};

						cb(returnObj);

					} else {
						returnObj.msg = err;
						cb(returnObj);
					}
				});
			};

			var deleteItem = function() {
				db.query("DELETE FROM `rtga`.`listvalues` WHERE `listId` = ? AND `id` = ?", [message.listId, message.itemId], function(err, result){
					if (!err) {
						//successfully deleted
						returnObj.success = true;

						returnObj.response = {
							'status': 'success',
							'listId': message.listId,
							'itemId': message.itemId,
							'msg': message.itemId + ' successfully deleted from list.'
						};

						returnObj.broadcast = {
							'sendTo': 'listgroup' + message.listId + '@broadcast.rtga.wespickett.com',
							'body': JSON.stringify({
								'command':'delete',
								'listId': message.listId,
								'itemId': message.itemId,
								'userId': message.userId
							})
						};

						cb(returnObj);

					} else {
						returnObj.msg = err;
						cb(returnObj);
					}
				});
			};

			if (typeof message !== "undefined" && typeof message.command === "string") {
				switch (message.command) {
					case "add":
						add();
						break;
					case "checkOn":
						check(true);
						break;
					case "checkOff":
						check(false);
						break;
					case "workOn":
						work(true);
						break;
					case "workOff":
						work(false);
						break;
					case "delete":
						deleteItem();
						break;
					default:
						break;
				}
			}
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
///---End ListManager---
