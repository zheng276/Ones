
function TriChess(host, port)
{
	var m_Host = host;
	var m_Port = port;
	var m_Events = [];
	var m_Error = "";
	var socket;
	var self = this;
	
	//Bind Event
	var bindEvent = function()
	{
		for(var e in m_Events){
			socket.on(e, m_Events[e]);
		}
	}
	
	//Set Error
	var setError = function(err)
	{
		m_Error = err;
	}
	
	this.getError = function(){
		return m_Error;
	}
	
	//Connect to Server
	this.connect = function()
	{
		if(!("io" in window)){
			setError("io not defined");
			return false;
		}
		socket = io.connect('http://' + m_Host + ':' + m_Port);
		
		/*if(socket.socket.open == false){
			setError("connect http://" + m_Host + ":" + m_Port + " failed");
			return false;
		}*/
		bindEvent();
		
		return true;
	}
	
	//Login
	this.login = function(nickname)
	{
		socket.emit("login", {
			"nickname" : nickname
		});
	}
	
	//Enter Room
	this.joinRoom = function(roomIdx, posIdx)
	{	
		socket.emit("joinRoom", {"roomIdx" : roomIdx, "posIdx" : posIdx});
	}
	
	//Send Msg to All
	this.sendAllMsg = function(body)
	{
		socket.emit("message", {
			"type" : 0,
			"body" : body
		});
	}
	
	//Send Msg to One
	this.sendToMsg = function(to, body)
	{
		socket.emit("message", {
			"type" : 1,
			"to" : to,
			"body" : body
		});
	}
	
	//Send Msg to Room
	this.sendRoomMsg = function(body)
	{
		socket.emit("message", {
			"type" : 2,
			"body" : body
		});
	}
	
	//Leave Room
	this.leaveRoom = function(roomIdx){
		socket.emit("leaveRoom", {
			"roomIdx" : roomIdx
		});
	}
	
	//Ready
	this.ready = function(){
		socket.emit("ready", "");
	}
	
	//Drop Chess
	this.drawChess = function(color, x, y)
	{
		socket.emit("drawChess", {
			"color" : color,
			"x" : x,
			"y" : y
		});
	}
	
	//Event sets On
	this.on = function(event, callback)
	{
		m_Events[event] = callback;
		return self;
	}
}