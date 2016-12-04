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
}