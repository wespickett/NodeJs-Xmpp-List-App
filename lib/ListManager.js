///---ListManager---
(function() {

	//private vars
	var commandListeners = "join invite create leave".split(' '),
		db;
	
	//public
	var publicReturn = {
		permission: function(message, cb) {
			
			var returnObj = {
				is_permitted: false,
				msg: ''
			};

			if (typeof message !== "undefined" && typeof message.command === "string") {
				switch (message.command) {
					//always allowed
					case "create":
						//TODO: max number of lists can create?
					case "leave":
						returnObj.is_permitted = true;
						cb(returnObj);
						break;
						
					//test if allowed
					
					//case "getList":
					case "leave":
					case "invite":
					case "join":
						db.query("SELECT * FROM `rtga`.`listpermissions` WHERE `listId` = ? AND `userId` = ?", [message.listId, message.userId], function(err, result){
							if (!err && result.length > 0) {
								if (result[0].permissionLevel === 0) {

									returnObj.is_permitted = true;
									cb(returnObj);
								} else {
									returnObj.msg = "The user needs a higher permission level to do this";
									cb(returnObj);
								}
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

			if (typeof message !== "undefined" && typeof message.command === "string") {
				switch (message.command) {
					case "create":
					console.log("in create:");
						db.query("INSERT INTO `rtga`.`listmain` VALUES(null, ?, ?)", [message.title, message.userId], function(err, result){
							if (!err) {
								console.log("q2");
								var groupName = "listgroup"+result.insertId;
									//username = "wes";
									
								//TODO: this needs to be a transaction
								db.query("INSERT INTO `rtga`.`listpermissions` VALUES (?, ?, 0);"+
										"INSERT INTO `openfire`.`ofGroup` VALUES(?, '');"+
										"INSERT INTO `openfire`.`ofGroupUser` (`groupName`, `username`, `administrator`) SELECT \""+groupName+"\",`username`,0 FROM `rtga`.`users` WHERE `id` = ?;"+
										"INSERT INTO `openfire`.`ofGroupProp` VALUES(?, 'sharedRoster.displayName', '');"+
										"INSERT INTO `openfire`.`ofGroupProp` VALUES(?, 'sharedRoster.groupList', '');"+
										"INSERT INTO `openfire`.`ofGroupProp` VALUES(?, 'sharedRoster.showInRoster', 'nobody');",
										[result.insertId, message.userId,
										 groupName,
										 message.userId,
										 groupName,
										 groupName,
										 groupName], 
								function (err2, result2) {

									if (!err2) {
										//list sucessfully created

										console.log("list sucessfully created");
										returnObj.success = true;
								
										returnObj.response = {
											'status': 'success',
											'msg': "List: " + message.title + " sucessfully created",
											'listId': ""+result.insertId
										}; 

										cb(returnObj);
									} else {
										returnObj.msg = "2#"+err2;
										cb(returnObj);
									}
								});
							} else {
								returnObj.msg = "1#"+err;
								cb(returnObj);
							}
						});
						break;
					case "invite":
					
						var groupName = "listgroup"+message.listId;
						
						user = message.username;
						
						db.query("SELECT * FROM `rtga`.`users` WHERE `username` = ?;"+
								"SELECT * FROM `rtga`.`listpermissions` WHERE `listId` = ? AND `userId` = (SELECT `id` FROM `rtga`.`users` WHERE `username` = ?)", [message.username, message.listId, message.username], function(err,result){
							console.log('RESULT:', result);
							if (!result[0][0]) {
								err = "User not registered";
							}
							
							if (!err) {
								userId = result[0][0]['id'];
								userName = result[0][0]['username'];
								
								console.log('username, userid: ', userName + ", " + userId);
								
								var successFunction = function (err2, result2) {
									if (!err2) {
										
										returnObj.success = true;
									
										returnObj.response = {
											'status': 'success',
											'msg': "Successfully invited "+ userName +" to list",
											'listId': message.listId,
											'userId': ""+userId,
											'username': userName
										};
										
										returnObj.broadcast = {
											'sendTo': userName+'@rtga.wespickett.com',
											'body': JSON.stringify({
												'command': 'invited',
												'listId': message.listId,
												'userId': message.userId 
											})
										};
										
										cb(returnObj);
									} else {
										returnObj.msg = err2;
										cb(returnObj);
									}
								};
								
								if (result[1].length < 1) {
									db.query("INSERT INTO `rtga`.`listpermissions` VALUES (?, ?, 0);"+
											"INSERT INTO `openfire`.`ofGroupUser` (`groupName`, `username`, `administrator`) SELECT \""+groupName+"\",`username`,0 FROM `rtga`.`users` WHERE `id` = ?;",
											[message.listId, userId,
											userId], successFunction);
								} else {
									successFunction(null, null);
								}
								// function (err2, result2) {
									// if (!err2) {
										
										// returnObj.success = true;
									
										// returnObj.response = {
											// 'status': 'success',
											// 'msg': "Successfully invited "+ userName +" to list",
											// 'listId': message.listId,
											// 'userId': ""+userId,
											// 'username': userName
										// };
										
										// returnObj.broadcast = {
											// 'sendTo': userName+'@rtga.wespickett.com',
											// 'body': JSON.stringify({
												// 'command': 'invited',
												// 'listId': message.listId,
												// 'userId': message.userId 
											// })
										// };
										
										// cb(returnObj);
									// } else {
										// returnObj.msg = err2;
										// cb(returnObj);
									// }
								// });
								
							} else {
								returnObj.msg = err;
								cb(returnObj);
							}
							
										
						});
						break;
					case "join":
						//let the user join any list by default, then only allow for invitation for private lists
						
						var groupName = "listgroup"+message.listId,
							q,
							user,
							userId,
							userName,
							values;
							
						console.log('lid', message.listId);
						var qq = db.query("SELECT * FROM `rtga`.`listmain` WHERE `id` = ?;" +
								"SELECT * FROM `rtga`.`users` WHERE `id` = ?;",
								[message.listId,
								message.userId], 
						function(err,result){
							console.log('RESULT:', result);
							if (!result[1][0]) {
								err = "User not registered";
							}
							
							if (!result[0][0]['creator_userId']){
								err = "listId not found in db";
							}
							
							if (!err) {
								
								userId = result[1][0]['id'];
								userName = result[1][0]['username'];
								creator = result[0][0]['creator_userId'];
								console.log('username, userid: ', userName + ", " + userId);

								// db.query("INSERT INTO `rtga`.`listpermissions` VALUES(?, ?, 0);" +
										// "INSERT INTO `openfire`.`ofGroupUser` (`groupName`, `username`, `administrator`) VALUES(?, ?, 0);",
										// [message.listId, userId, 
										// groupName, userName], 
								// function(err2, result2){
									// console.log(result2);
									// if (!err2) {
								db.query("SELECT * FROM `rtga`.`listvalues` WHERE `listId` = ?;"+
										"SELECT `userId`,`username` FROM `rtga`.`listpermissions` JOIN `rtga`.`users` ON `rtga`.`listpermissions`.`userId` = `users`.`id` WHERE `listId` = ?",
										[message.listId,
										message.listId],
								function(err2, result2, fields){
									
									var listValuesArr = [],
										listMembersArr = [];
										//listValues = {};
									
									console.log("RESULT2: ", result2);
									
									if (!err2) {
										returnObj.success = true;

										var joinedListName = "error";
										if (typeof result[0] !== "undefined" && typeof result[0][0] !== "undefined") {
											joinedListName = result[0][0]['title'];
										}
										
										console.log('listValuesArr1: ', listValuesArr);
										
										result2[1].forEach(function(row){
											var membValues = {}; 
											membValues['userId'] = row['userId'];
											membValues['username'] = row['username'];
											listMembersArr.push(membValues);
										});
										
										console.log('listMemebersArr1: ', listMembersArr);
										
										result2[0].forEach(function(row){
											var listValues = {}; 
											listValues['id'] = row['id'];
											listValues['value'] = row['value'];
											listValues['addedByUser'] = row['addedByUser'];
											listValues['state'] = row['state'];
											listValues['workingOnUser'] = row['workingOnUser'] || "";
											listValues['checkedOffUser'] = row['checkedOffUser'] || "";
											listValuesArr.push(listValues);
											console.log('listValuesArr2: ', listValuesArr);
										});
										
										returnObj.response = {
											'status': 'success',
											'msg': "Successfully joined list: " + joinedListName,
											'listId': message.listId,
											'listName': joinedListName,
											'values': listValuesArr,
											'userId': ""+userId,
											'username': userName,
											'createdBy': ""+creator,
											'members': listMembersArr
										};
										
										returnObj.broadcast = {
											'sendTo': 'listgroup' + message.listId + '@broadcast.rtga.wespickett.com',
											'body': JSON.stringify({
												'command': 'joined',
												'listId': message.listId,
												'userId': ""+userId,
												'username': userName 
											})
										};

										cb(returnObj);
										
											// } else {
												// console.log(err2);
												// returnObj.msg = err2;
												// cb(returnObj);
											// }
										// });
											
									} else {
										console.log(err2);
										returnObj.msg = err2;
										cb(returnObj);
									}
								});
							} else {
								console.log(err);
								returnObj.msg = err;
								cb(returnObj);
							}
							
						});
						console.log(qq.sql);
						break;
					// case "getList":
						// db.query("SELECT * FROM `rtga`.`listvalues` WHERE `listId` = ?", message.listId, function(err, result, fields){
							
							// var listValuesArr = [],
								// listValues = {};

							// if (!err) {
								// returnObj.success = true;

								// result.forEach(function(row){
									// listValues['id'] = row['id'];
									// listValues['value'] = row['value'];
									// listValues['addedByUser'] = row['addedByUser'];
									// listValues['state'] = row['state'];
									// listValues['workingOnUser'] = row['workingOnUser'];
									// listValues['checkedOffUser'] = row['checkedOffUser'];
									// listValuesArr.push(listValues);
								// });

								// returnObj.response = {
									// 'status': 'success',
									// 'msg': "List values for: " + message.listId,
									// 'listId': message.listId,
									// 'values': listValuesArr
								// };

								// cb(returnObj);
							// } else {
								// console.log(err);
								// returnObj.msg = err;
								// cb(returnObj);
							// }
						// });
						// break;
					// case "getLists":
						// db.query("select `listId`,`title` from listpermissions RIGHT JOIN listmain on listpermissions.listId = listmain.id WHERE listpermissions.userId = ?", message.userId, function(err, result, fields){

							// if (!err) {
								// returnObj.success = true;

								// returnObj.response = {
								// };

								// cb(returnObj);
							// } else {
								// console.log(err);
								// returnObj.msg = err;
								// cb(returnObj);
							// }
						// });
						// break
					case "leave":
						var groupName = "listgroup"+message.listId,
							userName,
							userId;

						db.query("SELECT * FROM `rtga`.`users` WHERE `id` = ?",[message.userId], function(err,result){
							console.log('RESULT:', result);
							if (!err) {
								userId = result[0]['id'];
								userName = result[0]['username'];
								console.log('username, userid: ', userName + ", " + userId);

								db.query("DELETE FROM `rtga`.`listpermissions` WHERE `listId` = ? AND `userId` = ?;" +
										"DELETE FROM `openfire`.`ofGroupUser` WHERE `groupName` = ? AND `username` = ?;",
										[message.listId, message.userId, 
										groupName, userName], 
								function(err2, result2){
									console.log(result2);
									if (!err2) {
										returnObj.success = true;
								
										returnObj.response = {
											'status': 'success',
											'msg': "Permission removed from list " + message.listId,
											'listId': message.listId,
											'userId': ""+userId,
											'username': userName
										};

										returnObj.broadcast = {
											'sendTo': 'listgroup' + message.listId + '@broadcast.rtga.wespickett.com',
											'body': JSON.stringify({
												'command': 'left',
												'listId': message.listId,
												'userId': ""+userId,
												'username': userName 
											})
										}

										cb(returnObj);
									} else {
										console.log(err2);
										returnObj.msg = err2;
										cb(returnObj);
									}
								});
							} else {
								console.log(err);
								returnObj.msg = err;
								cb(returnObj);
							}
						});
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
