"use strict";

var	posts = require('../posts'),
	postTools = require('../postTools'),
	topics = require('../topics'),
	meta = require('../meta'),
	Messaging = require('../messaging'),
	user = require('../user'),
	notifications = require('../notifications'),
	plugins = require('../plugins'),
	utils = require('../../public/src/utils'),

	async = require('async'),
	S = require('string'),
	winston = require('winston'),
	_ = require('underscore'),
	server = require('./'),
	nconf = require('nconf'),

	SocketModules = {
		composer: {
			replyHash: {}
		},
		chats: {},
		notifications: {},
		sounds: {},
		settings: {}
	};

/* Posts Composer */

var	stopTracking = function(replyObj) {
		if (isLast(replyObj.uid, replyObj.tid)) {
			server.in('topic_' + replyObj.tid).emit('event:topic.toggleReply', {uid: replyObj.uid, isReplying: false});
		}

		clearInterval(replyObj.timer);
		delete SocketModules.composer.replyHash[replyObj.uuid];
	},
	isLast = function(uid, tid) {
		return _.filter(SocketModules.composer.replyHash, function(replyObj, uuid) {
			if (
				parseInt(replyObj.tid, 10) === parseInt(tid, 10) &&
				parseInt(replyObj.uid, 10) === parseInt(uid, 10)
			) {
				return true;
			} else {
				return false;
			}
		}).length === 1;
	};

SocketModules.composer.push = function(socket, pid, callback) {
	posts.getPostFields(pid, ['content', 'tid'], function(err, postData) {
		if(err || (!postData && !postData.content)) {
			return callback(err || new Error('[[error:invalid-pid]]'));
		}

		async.parallel({
			topic: function(next) {
				topics.getTopicDataByPid(pid, next);
			},
			tags: function(next) {
				topics.getTopicTags(postData.tid, next);
			},
			isMain: function(next) {
				posts.isMain(pid, next);
			}
		}, function(err, results) {
			if(err) {
				return callback(err);
			}

			callback(null, {
				pid: pid,
				body: postData.content,
				title: results.topic.title,
                lng:results.topic.lng,
                lat:results.topic.lat,
                cplace:results.topic.cplace,
				topic_thumb: results.topic.thumb,
				tags: results.tags,
				isMain: results.isMain
			});
		});
	});
};

SocketModules.composer.editCheck = function(socket, pid, callback) {
	posts.isMain(pid, function(err, isMain) {
		callback(err, {
			titleEditable: isMain
		});
	});
};

SocketModules.composer.renderPreview = function(socket, content, callback) {
	plugins.fireHook('filter:post.parse', content, callback);
};

SocketModules.composer.renderHelp = function(socket, data, callback) {
	var helpText = meta.config['composer:customHelpText'] || '';

	if (meta.config['composer:showHelpTab'] === '0') {
		return callback(new Error('help-hidden'));
	}

	plugins.fireHook('filter:post.parse', helpText, function(err, helpText) {
		if (!meta.config['composer:allowPluginHelp'] || meta.config['composer:allowPluginHelp'] === '1') {
			plugins.fireHook('filter:composer.help', helpText, callback);
		} else {
			callback(null, helpText);
		}
	});
};

SocketModules.composer.register = function(socket, data) {
	var	now = Date.now();

	server.in('topic_' + data.tid).emit('event:topic.toggleReply', {uid: data.uid, isReplying: true});

	data.socket = socket;
	data.lastPing = now;
	data.lastAnswer = now;
	data.timer = setInterval(function() {
		if (data.lastPing === data.lastAnswer) {
			// Ping the socket to see if the composer is still active
			data.lastPing = Date.now();
			socket.emit('event:composer.ping', data.uuid);
		} else {
			stopTracking(data);
		}
	}, 1000*5);	// Every 5 seconds...

	SocketModules.composer.replyHash[data.uuid] = data;
};

SocketModules.composer.unregister = function(socket, uuid) {
	var	replyObj = SocketModules.composer.replyHash[uuid];
	if (uuid && replyObj) {
		stopTracking(replyObj);
	}
};

SocketModules.composer.pingActive = function(socket, uuid) {
	var	data = SocketModules.composer.replyHash[uuid];
	if (data) {
		data.lastAnswer = data.lastPing;
	}
};

SocketModules.composer.getUsersByTid = function(socket, tid, callback) {
	// Return uids with active composers
	callback(null, _.filter(SocketModules.composer.replyHash, function(replyObj, uuid) {
		return parseInt(replyObj.tid, 10) === parseInt(tid, 10);
	}).map(function(replyObj) {
		return replyObj.uid;
	}));
};

/* Chat */

SocketModules.chats.get = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('[[error:invalid-data]]'));
	}

	Messaging.getMessages(socket.uid, data.touid, false, callback);
};

SocketModules.chats.send = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('[[error:invalid-data]]'));
	}

	var touid = parseInt(data.touid, 10);
	if (touid === socket.uid || socket.uid === 0) {
		return;
	}

	Messaging.verifySpammer(socket.uid, function(err, isSpammer) {
		if (!err && isSpammer) {
			var sockets = server.getUserSockets(socket.uid);

			for(var i = 0; i < sockets.length; ++i) {
				sockets[i].emit('event:banned');
			}

			// We're just logging them out, so a "temporary ban" to prevent abuse. Revisit once we implement a way to temporarily ban users
			server.logoutUser(socket.uid);
			return callback();
		}
	});

	var msg = S(data.message).stripTags().s;

	Messaging.addMessage(socket.uid, touid, msg, function(err, message) {
		if (err) {
			return callback(err);
		}

		sendChatNotification(socket.uid, touid, message);

		// After-the-fact fixing of the "self" property for the message that goes to the receipient
		var recipMessage = JSON.parse(JSON.stringify(message));
		recipMessage.self = 0;

		// Recipient
		SocketModules.chats.pushUnreadCount(touid);
		server.getUserSockets(touid).forEach(function(s) {
			s.emit('event:chats.receive', {
				withUid: socket.uid,
				message: recipMessage
			});
		});

		// Sender
		SocketModules.chats.pushUnreadCount(socket.uid);
		server.getUserSockets(socket.uid).forEach(function(s) {
			s.emit('event:chats.receive', {
				withUid: touid,
				message: message
			});
		});
	});
};

function sendChatNotification(fromuid, touid, messageObj) {
	// todo #1798 -- this should check if the user is in room `chat_{uidA}_{uidB}` instead, see `Sockets.uidInRoom(uid, room);`
	if (!module.parent.exports.isUserOnline(touid)) {
		notifications.create({
			bodyShort: '[[notifications:new_message_from, ' + messageObj.fromUser.username + ']]',
			bodyLong: messageObj.content,
			path: nconf.get('relative_path') + '/chats/' + utils.slugify(messageObj.fromUser.username),
			uniqueId: 'chat_' + fromuid + '_' + touid,
			from: fromuid
		}, function(err, nid) {
			if (!err) {
				notifications.push(nid, [touid]);
			}
		});
	}
}

SocketModules.chats.pushUnreadCount = function(uid) {
	Messaging.getUnreadCount(uid, function(err, unreadCount) {
		if (err) {
			return;
		}
		server.getUserSockets(uid).forEach(function(s) {
			s.emit('event:unread.updateChatCount', null, unreadCount);
		});
	});
};

SocketModules.chats.markRead = function(socket, touid, callback) {
	Messaging.markRead(socket.uid, touid, function(err) {
		if (!err) {
			SocketModules.chats.pushUnreadCount(socket.uid);
		}
	});
};

SocketModules.chats.userStartTyping = function(socket, data, callback) {
	sendTypingNotification('event:chats.userStartTyping', socket, data, callback);
};

SocketModules.chats.userStopTyping = function(socket, data, callback) {
	sendTypingNotification('event:chats.userStopTyping', socket, data, callback);
};

function sendTypingNotification(event, socket, data, callback) {
	if (!socket.uid || !data) {
		return;
	}
	server.getUserSockets(data.touid).forEach(function(socket) {
		socket.emit(event, data.fromUid);
	});
}

SocketModules.chats.list = function(socket, data, callback) {
	Messaging.getRecentChats(socket.uid, 0, 9, callback);
};

/* Notifications */
SocketModules.notifications.markRead = function(socket, nid) {
	notifications.markRead(nid, socket.uid);
};

SocketModules.notifications.markAllRead = function(socket, data, callback) {
	notifications.markAllRead(socket.uid, callback);
};

/* Sounds */
SocketModules.sounds.getSounds = function(socket, data, callback) {
	// Read sounds from local directory
	meta.sounds.getFiles(callback);
};

SocketModules.sounds.getMapping = function(socket, data, callback) {
	meta.sounds.getMapping(callback);
};

module.exports = SocketModules;
