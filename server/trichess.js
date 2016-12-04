exports.TriChess = function()
{
	var MSG_ALL  = 0;
	var MSG_TO   = 1;
	var MSG_ROOM = 2;
	
	var STAT_NORMAL = 0;
	var STAT_READY  = 1;
	var STAT_START  = 2;
	
	var COLOR_BLACK = 1;
	var COLOR_WHITE = 2;
	
	var m_Config = {
		"ListenPort" : 8080,
		"RoomTotal" : 100,
		"MaxClientNum" : 300
	};
	var m_Connections = [];
	var m_Rooms = [];
	var m_RoomData = [];
	var n_Clients = 0;
	var self = this;
	var io;//socket.io
	
	this.SetConfig = function(cfg)
	{
		for(var x in cfg)
		{
			m_Config[x] = cfg[x];
		}
	}
	
	var InitChessData = function(roomIdx){
		m_RoomData[roomIdx] = [];
		for(var i = 0; i < 15; i++){
			m_RoomData[roomIdx][i] = [];
			for(var j = 0; j < 15; j++){
				m_RoomData[roomIdx][i][j] = 0;
			}
		}
	}
	
	var ResetCheseData = function(roomIdx){
		for(var i =0 ; i < 15; i++){
			for(var j = 0; j < 15; j++){
				m_RoomData[roomIdx][i][j] = 0;
			}
		}
	}
	
	this.Startup = function()
	{
		for(var i = 0; i < m_Config.RoomTotal; i++){
			m_Rooms[i] = [0, 0];
			InitChessData(i);
		}
		
		io = require('socket.io').listen(8080);
		io.sockets.on('connection', function (socket) {
			socket.on("disconnect", OnClose);
			socket.on("login", OnLogin);
			socket.on("joinRoom", OnJoinRoom);
			socket.on("leaveRoom", OnLeaveRoom);
			socket.on("ready", OnReady);
			socket.on('message', OnMessage);
			socket.on("drawChess", OnDrawChess);
		});
		console.log('server is started, port: ' + m_Config.ListenPort);
	}
	
	var GetRoomList = function()
	{
		var data = [];
		for(var idx in m_Rooms){
			var room = [0, 0];
			for(var j = 0; j < 2; j++){
				if(m_Rooms[idx][j]){
					var c = m_Connections[m_Rooms[idx][j]];
					if(c){
						room[j] = {
							"id" : c.socket.id,
							"nickname" : c.nickname,
							"status" : c.status
						};
					}
				}
			}
			data.push(room);
		}
		return data;
	}
	
	var GetUserList = function()
	{
		var list = [];
		for(var sid in m_Connections)
		{
			list.push(GetUserInfo(sid));
		}
		return list;
	}
	
	var GetUserInfo = function(sid)
	{
		return {
			"id" : m_Connections[sid].socket.id,
			"nickname" : m_Connections[sid].nickname,
			"status" : m_Connections[sid].status
		}
	}
	
	var OnClose = function(data)
	{
		var sid = this.id;
		
		if(!m_Connections[sid]) return ;
		n_Clients--;
		

		io.sockets.emit("close", {
			"id" : sid,
			"roomIdx" : m_Connections[sid].roomIdx,
			"posIdx" : m_Connections[sid].posIdx
		});
		
		var roomIdx = m_Connections[sid].roomIdx;
		var posIdx  = m_Connections[sid].posIdx;
		if(roomIdx != -1){
			m_Rooms[roomIdx][posIdx] = 0;
			if(m_Connections[sid].status == STAT_START){
				if(posIdx == 0){
					if(m_Rooms[roomIdx][1] && m_Connections[m_Rooms[roomIdx][1]]){
						m_Connections[m_Rooms[roomIdx][1]].status = STAT_NORMAL;
					}
				}else{
					if(m_Rooms[roomIdx][0] && m_Connections[m_Rooms[roomIdx][0]]){
						m_Connections[m_Rooms[roomIdx][0]].status = STAT_NORMAL;
					}
				}
			}
		}
		
		delete m_Connections[sid];
	}
	
	var OnLogin = function(data){
		var ret = 0;
		var sid = this.id;
		if(n_Clients < m_Config.MaxClientNum){
			var client = {
				socket   : this,
				nickname : data.nickname,
				status   : STAT_NORMAL,
				roomIdx  : -1, 
				posIdx   : -1 
			};
			
			m_Connections[sid] = client;
			n_Clients++;

			this.emit("login", {
				"ret"  : 1, 
				"info" : GetUserInfo(sid),
				"list" : GetUserList(),
				"room" : GetRoomList()
			});
			
			io.sockets.emit("join", GetUserInfo(sid));
		}else{
			this.emit("login", {"ret" : 0});
		}
	}	
	
	var OnJoinRoom = function(data){
		var sid = this.id;
		if(data.roomIdx > -1 && data.roomIdx < m_Config.RoomTotal && 
			(data.posIdx == 0 || data.posIdx == 1) && 
			m_Rooms[data.roomIdx][data.posIdx] == 0 && 
			m_Connections[sid] && m_Connections[sid].status != STAT_START)
		{
			var oldRoomIdx = m_Connections[sid].roomIdx;
			var oldPosIdx  = m_Connections[sid].posIdx;
			
			if(oldRoomIdx != -1){
				m_Rooms[oldRoomIdx][oldPosIdx] = 0;
				io.sockets.emit("leaveRoom", {
					"id"	   : sid,
					"roomIdx"  : oldRoomIdx,
					"posIdx"   : oldPosIdx
				});
			}			
				
			m_Connections[sid].roomIdx = data.roomIdx;
			m_Connections[sid].posIdx  = data.posIdx;
			m_Connections[sid].status  = STAT_NORMAL;
			m_Rooms[data.roomIdx][data.posIdx] = sid;
			io.sockets.emit("joinRoom", {
				"roomIdx"  : data.roomIdx,
				"posIdx"   : data.posIdx,
				"nickname" : m_Connections[sid].nickname,
				"id"       : sid
			});
			
			var info = [0, 0];
			if(m_Rooms[data.roomIdx][0]) info[0] = GetUserInfo(m_Rooms[data.roomIdx][0]);
			if(m_Rooms[data.roomIdx][1]) info[1] = GetUserInfo(m_Rooms[data.roomIdx][1]);
			this.emit("roomInfo", info);
		}else{
			this.emit("joinRoomError", '');
		}
	}	
	
	var OnLeaveRoom = function(data){
		var sid = this.id;
		if(m_Connections[sid] && m_Connections[sid].roomIdx != -1 && 
			m_Connections[sid].roomIdx == data.roomIdx)
		{
			var roomIdx = m_Connections[sid].roomIdx;
			var posIdx  = m_Connections[sid].posIdx;
			m_Rooms[roomIdx][posIdx] = 0;
			m_Connections[sid].roomIdx = -1;
			m_Connections[sid].posIdx = -1;
			m_Connections[sid].status = STAT_NORMAL;
			
			io.sockets.emit("leaveRoom", {
				"id" 	   : sid,
				"roomIdx"  : roomIdx,
				"posIdx"   : posIdx
			});
		}
	}
	
	var OnReady = function(data){
		var sid = this.id;
		if(m_Connections[sid] && m_Connections[sid].roomIdx != -1 && 
			m_Connections[sid].status != STAT_START)
		{
			var status = 1 - m_Connections[sid].status;
			var roomIdx = m_Connections[sid].roomIdx;
			m_Connections[sid].status = status;
			
			io.sockets.emit("ready", {
				"id"      : sid,
				"roomIdx" : roomIdx,
				"posIdx"  : m_Connections[sid].posIdx,
				"nickname": m_Connections[sid].nickname,
				"status"  : status
			});			
			
			if(m_Rooms[roomIdx][0] && m_Rooms[roomIdx][1] && 
				m_Connections[m_Rooms[roomIdx][0]] && 
				m_Connections[m_Rooms[roomIdx][1]] && 
				m_Connections[m_Rooms[roomIdx][0]].status == STAT_READY &&
				m_Connections[m_Rooms[roomIdx][1]].status == STAT_READY)
			{
				m_Connections[m_Rooms[roomIdx][0]].status = STAT_START;
				m_Connections[m_Rooms[roomIdx][1]].status = STAT_START;
				m_Connections[m_Rooms[roomIdx][0]].socket.emit("start", {
					"color" : COLOR_BLACK,
					"allowDraw" : true
				});
				m_Connections[m_Rooms[roomIdx][1]].socket.emit("start", {
					"color" : COLOR_WHITE,
					"allowDraw" : false
				});
				
				io.sockets.emit("startInfo", {
					"roomIdx" : roomIdx,
					"player1" : m_Rooms[roomIdx][0],
					"player2" : m_Rooms[roomIdx][1]
				});
			}		
		}
	}
	
	var OnDrawChess = function(data){
		var sid     = this.id;
		var roomIdx = m_Connections[sid].roomIdx;
		if(m_Rooms[roomIdx][0] && m_Rooms[roomIdx][1] && 
			m_Connections[m_Rooms[roomIdx][0]] && 
			m_Connections[m_Rooms[roomIdx][1]] && 		
			m_Connections[m_Rooms[roomIdx][0]].status == STAT_START &&
			m_Connections[m_Rooms[roomIdx][1]].status == STAT_START && 
			checkValidChess(roomIdx, data.x, data.y) == true)
		{
			data.id = sid;
			m_RoomData[roomIdx][data.x][data.y] = data.color;
			
			for(var i = 0; i < 2; i++){
				m_Connections[m_Rooms[roomIdx][i]].socket.emit("drawChess", data);
			}
			
			if(checkGameOver(roomIdx, data.x, data.y) == true){
				var first  = m_Rooms[roomIdx][0];
				var second = m_Rooms[roomIdx][1];
				var winer  = (sid == first ? first : second);
				var loser  = (sid == second ? first : second);
				m_Connections[first].status = STAT_NORMAL;
				m_Connections[second].status = STAT_NORMAL;
				ResetCheseData(roomIdx);
				m_Connections[winer].socket.emit("winer", "");	
				m_Connections[loser].socket.emit("loser", "");	

				io.sockets.emit("overInfo", {
					"roomIdx" : roomIdx,
					"player1" : first,
					"player2" : second
				});				
			}
		}
	}
	
	var checkValidChess = function(roomIdx, x, y){
		if(m_RoomData[roomIdx][x][y] == 1){
			return false;
		}
		return true;
	}
	
	var checkGameOver = function(roomIdx, x, y){
		var n;
		var cur = m_RoomData[roomIdx][x][y];
		
		//ROW
		n = 0;
		var startX = (x - 4) < 0 ? 0 : x - 4;
		var endX   = (x + 4) > 14 ? 14 : x + 4;		
		for(var i = startX; i <= endX; i++){
			if(m_RoomData[roomIdx][i][y] == cur){
				n++;
			}else{
				n = 0;
			}
			if(n >= 5) return true;
		}
		
		//COLUMN
		n = 0;
		var startY = (y - 4) < 0 ? 0 : x - 4;
		var endY   = (y + 4) > 14 ? 14 : y + 4;		
		for(var i = startY; i <= endY; i++){
			if(m_RoomData[roomIdx][x][i] == cur){
				n++;
			}else{
				n = 0;
			}
			if(n >= 5) return true;
		}
		
		//Diagonse
		n = 0;
		var min = x < y ? (x - 4 < 0 ? x : 4) : (y - 4 < 0 ? y : 4);
		var max = x > y ? (x + 4 > 14 ? 14 - x : 4) : (y + 4 > 14 ? 14 - y : 4); 
		var p1x = x - min;
		var p1y = y - min;
		var p2x = x + max;
		var p2y = y + max;
		for(var i = p1x, j = p1y; i <= p2x, j <= p2y; i++, j++){
			if(m_RoomData[roomIdx][i][j] == cur){
				n++;
			}else{
				n = 0;
			}
			if(n >= 5) return true;
		}
		
		//Opposite Diagonse
		n = 0;
		var min = (x + 4 > 14 ? 14 - x : 4) < (y - 4 < 0 ? y : 4) ? 
				  (x + 4 > 14 ? 14 - x : 4) : (y - 4 < 0 ? y : 4);
		var max = (x - 4 < 0 ? x : 4) < (y + 4 > 14 ? 14 - y : 4) ?
				  (x - 4 < 0 ? x : 4) : (y + 4 > 14 ? 14 - y : 4);
		var p1x = x + min;
		var p1y = y - min;
		var p2x = x - max;
		var p2y = y + max;
		for(var i = p1x, j = p1y; i >= p2x; i--, j++){
			if(m_RoomData[roomIdx][i][j] == cur){
				n++;
			}else{
				n = 0;
			}
			if(n >= 5) return true;
		}
		
		return false;
	}

	var OnMessage = function (data) {
		var sid = this.id;
		if(!m_Connections[sid]) return;
		
		var cli = m_Connections[sid];
		var msg = {
			type : data.type,
			id : cli.socket.id,
			nickname : cli.nickname,
			body : data.body
		};
		switch(data.type){
			case MSG_ALL:
				if(data.body){
					io.sockets.emit("message", msg);
				}
				break;
			case MSG_TO:
				if(data.to && data.body){
					m_Connections[data.to].socket.emit("message", msg);
				}
				break;
			case MSG_ROOM:
				if(cli.roomIdx > -1 && cli.roomIdx < m_Config.RoomTotal && data.body){
					for(var i = 0; i < 2; i++){
						if(m_Rooms[cli.roomIdx][i]){
							m_Connections[m_Rooms[cli.roomIdx][i]].socket.emit("message", msg);
						}
					}
				}
				break;
			default:
				break;
		}
	}
}