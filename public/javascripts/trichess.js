$(function(){
	var MSG_ALL  = 0;//Send to All 
	var MSG_TO   = 1;//Send to One
	var MSG_ROOM = 2;//Send to Table
	
	var STAT_NORMAL = 0;//NotReady
	var STAT_READY  = 1;//Ready
	var STAT_START  = 2;//In Game
	
	var COLOR_BLACK = 1;//Black
	var COLOR_WHITE = 2;//White
	
	var g_Connected = false;
	var g_Host = "10.186.1.67";
	var g_Port = 8080;
	var g_Info = {
		"id" : 0,
		"nickname" : "",
		"status" : 0,
		"roomIdx" : -1,
		"posIdx" : -1
	};
	var app = new TriChess(g_Host, g_Port);
	var defaultNickname = "Please Enter Your Name";
	
	app.on("login", function(data){//Login Return
		if(data.ret == 1){
			$("#dlgBg").remove();
			$("#login").remove();
			g_Info.id       = data.info.id;
			g_Info.nickname = data.info.nickname;
			g_Info.status   = data.info.status;
			initRoomList(data.room);
			initUserList(data.list);
		}else{
			alert("Login Failed!");
		}
	}).on("close", function(data){//Exit program
		$("#user-" + data.id).remove();
		
		//Exit Room
		if(data.roomIdx == g_Info.roomIdx){
			removeRoom(data.posIdx);
			if(g_Info.status == STAT_START){
				g_Info.status = STAT_NORMAL;
				updateRoom(g_Info.posIdx, g_Info);
			}
		}
		
		//Exit Lobby
		if(data.roomIdx != -1){
			var name = $('#room-' + data.roomIdx + '-name-' + data.posIdx);
			var icon = $('#room-' + data.roomIdx + '-icon-' + data.posIdx);
			name.html('');
			icon.removeClass('yes').addClass('no');
		}
	}).on("join", function(data){//User enter Lobby
		if(g_Info.id != data.id){
			$("#list-box").append(makeHtmlUserList(data));
		}
	}).on("joinRoom", function(data){//User enter Room
		var name = $('#room-' + data.roomIdx + '-name-' + data.posIdx);
		var icon = $('#room-' + data.roomIdx + '-icon-' + data.posIdx);
		name.html(data.nickname);
		icon.removeClass('no').addClass('yes');
		
		//Self
		if(data.id == g_Info.id){
			g_Info.roomIdx = data.roomIdx;
			g_Info.posIdx  = data.posIdx;
			g_Info.status  = STAT_NORMAL;
		}else if(data.roomIdx == g_Info.roomIdx){
			//User enter existing room
			data.status = STAT_NORMAL;
			updateRoom(data.posIdx, data);
		}
	}).on("ready", function(data){//Ready
		//Ready in room
		if(data.roomIdx == g_Info.roomIdx){
			updateRoom(data.posIdx, data);
		}
		//Ready in lobby
		var stat = (data.status == STAT_NORMAL ? 
					"Waiting" : (data.status == STAT_READY ? "Ready" : "Gaming"));
		$("#user-" + data.id + " span").html(stat);
	}).on("roomInfo", function(data){//Room Info
		initRoom(data[0], data[1]);
	}).on("start", function(data){//Start Game
		g_Info.status = STAT_START;
		g_Info.color  = data.color;
		g_Info.allowDraw = data.allowDraw;
		if(g_Info.allowDraw){
			$("div.room_chess").css("cursor", "pointer");
		}else{
			$("div.room_chess").css("cursor", "no-drop");
		}
		$("div.room_chess div").remove();//Clear chess
		$("#game_ready").val("Gaming...");
		alert("Game Started");
	}).on("startInfo", function(data){//有游戏开始了
		$("#room-" + data.roomIdx).addClass("room_item_start");
		$("#user-" + data.player1 + " span").html("Gaming");
		$("#user-" + data.player2 + " span").html("Gaming");
	}).on("overInfo", function(data){//游戏结束了
		$("#room-" + data.roomIdx).removeClass("room_item_start");
		$("#user-" + data.player1 + " span").html("Waiting");
		$("#user-" + data.player2 + " span").html("Waiting");
		if(data.roomIdx == g_Info.roomIdx){
			//更新房间另一个成员的状态
			var p = (data.player1 == g_Info.id ? 2 : 1);
			$("#room-p" + p + "-status").html("Not Ready");
		}
	}).on("leaveRoom", function(data){//离开房间
		var name = $('#room-' + data.roomIdx + '-name-' + data.posIdx);
		var icon = $('#room-' + data.roomIdx + '-icon-' + data.posIdx);
		name.html('');
		icon.removeClass('yes').addClass('no');
		if(data.id == g_Info.id){//更新自己的信息
			g_Info.roomIdx = -1;
			g_Info.posIdx  = -1;
			changeTag("room_list");
		}else if(data.roomIdx == g_Info.roomIdx){//本房间有人退出
			removeRoom(data.posIdx);
		}
	}).on("joinRoomError", function(data){//加入房间失败
		alert("Fail to Join Room");
	}).on("message", function(data){//接受消息
		if(data.type == MSG_ALL){
			$("#msg-content").append("<p>" + data.nickname + ": " + data.body + "</p>");
		}else if(data.type == MSG_TO){
			$("#msg-content").append("<p style=\"color:#339933\">" + data.nickname + ": " + data.body + "</p>");
		}else if(data.type == MSG_ROOM){
			$("#room-msg-content").append("<p>" + data.nickname + ": " + data.body + "</p>");
		}
	}).on("drawChess", function(data){//落子
		var left = data.x * 35 + 6;
		var top  = data.y * 35 + 6;
		var css  = (data.color == COLOR_BLACK ? "black" : "white");
		var html = '<div id="chess-' + data.x + '-' + data.y + '" style="left:' + left + 'px;top:' + top + 'px" class="' + css + '"></div>';
		$("div.room_chess").append(html);
		if($("div.room_chess .cur").length == 0){
			$("div.room_chess").append('<div class="cur"></div>');
		}
		$("div.room_chess .cur").css({
			left : left - 1,
			top : top
		});
		if(data.id == g_Info.id){
			g_Info.allowDraw = false;
			$("div.room_chess").css("cursor", "no-drop");
		}else{
			g_Info.allowDraw = true;
			$("div.room_chess").css("cursor", "pointer");
		}	
	}).on("winer", function(data){//胜利
		g_Info.status = STAT_NORMAL;
		g_Info.allowDraw = false;
		updateRoom(g_Info.posIdx, g_Info);
		alert("You Win! Boiler Up!");
	}).on("loser", function(data){//失败
		g_Info.status = STAT_NORMAL;
		g_Info.allowDraw = false;
		updateRoom(g_Info.posIdx, g_Info);
		alert("You Lost :( It's Okay, your life gets more diffcult");
	});
	
	//昵称输入框事件
	$('#nickname').click(function(){
		$(this).val('');
	}).blur(function(){
		if($(this).val() == ''){
			$(this).val(defaultNickname);
		}
	}).val(defaultNickname);
	
	//登陆
	$("#loginBtn").click(function(){
		//链接服务器
		if(app.connect() == false){
			alert("error: " + app.getError());
			return false;
		}
		
		//登陆
		var nickname = $("#nickname").val();
		if(!nickname || nickname == defaultNickname){
			alert("Please Enter Your Name");
			$("#nickname").val('').focus();
			return ;
		}
		app.login(nickname);
	});
	
	//加入房间
	$("#room-box .player").live("click", function(){
		var roomIdx = $(this).closest('.room_item').attr('value');
		var posIdx = $(this).attr('value');
		if($("#room-" + roomIdx + "-icon-" + posIdx).hasClass("yes")){
			return ;
		}
		
		if(g_Info.status == STAT_START){
			alert("You can't join another room during the game!");
			return ;
		}
		
		app.joinRoom(roomIdx, posIdx);
	});
	
	//发送消息
	$("#msg-button").click(function(){
		var msg = $("#msg-input").val();
		if(msg == ""){
			return ;
		}
		app.sendAllMsg(msg);
		$("#msg-input").val('');
	});
	
	//发送消息到房间内
	$("#msg").submit(function(){
		var msg = $("#room-msg-input").val();
		if(!msg){
			return ;
		}
		app.sendRoomMsg(msg);
		$("#room-msg-input").val("");
	});
	$("#room-msg-button").click(function(){
		var msg = $("#room-msg-input").val();
		if(!msg){
			return ;
		}
		app.sendRoomMsg(msg);
		$("#room-msg-input").val("");
	});
	
	//切换窗口
	$("#tag a").click(function(){
		var id = $(this).attr('href').substr(1);
		if($(this).hasClass('on')){
			return false;
		}
		
		if(g_Info.roomIdx == -1){
			alert("You haven't join a room");
			return false;
		}
		
		changeTag(id);
		return false;
	});
	
	//落子
	$("div.room_chess").click(function(ev){
		var pageX = ev.pageX;
		var pageY = ev.pageY;
		var x = parseInt((pageX - $(this).offset().left - 5) / 35);
		var y = parseInt((pageY - $(this).offset().top - 5) / 35);

		if(g_Info.roomIdx == -1 || g_Info.status != STAT_START || 
			$("#chess-" + x + '-' + y).length > 0 || g_Info.allowDraw == false)
		{
			return;
		}
		
		app.drawChess(g_Info.color, x, y);
	});
	
	//准备
	$("#game_ready").click(function(){
		if(g_Info.status == STAT_START){
			return;
		}
		app.ready();
	});
	
	//退出房间
	$("#game_leave").click(function(){
		if(g_Info.status == STAT_START){
			alert("Don't escape from the game!");
			return ;
		}
		app.leaveRoom(g_Info.roomIdx);
	});
	
	//切换
	function changeTag(tag)
	{
		if(tag == "room_list"){
			$("#room_list").show();
			$("#tag_room_list").addClass("on");
			$("#room").hide();
			$("#tag_room").removeClass("on");
		}else{
			$("#room").show();
			$("#tag_room").addClass("on");	
			$("#room_list").hide();
			$("#tag_room_list").removeClass("on");	
		}
	}
	
	//生成用户html
	function makeHtmlUserList(data)
	{
		var stat = (data.status == STAT_READY ? "Ready" : (data.status == STAT_START ? "Gaming" : "Waiting"));
		var html = ('<li id="user-' + data.id + '"><span>' + stat + "</span>" + data.nickname + "</li>");
		return html;
	}
	
	//初始化用户列表
	function initUserList(data)
	{
		var html = '';
		for(var i = 0; i < data.length; i++){
			html+= makeHtmlUserList(data[i]);
		}
		$("#list-box").html(html);	
	}
	
	//初始化房间列表
	function initRoomList(data)
	{
		var html = '';
		for(var idx in data){
			html+= '<div id="room-' + idx + '" value="' + idx + '" class="room_item">';
			html+= '<div id="room-' + idx + '-name-1" class="player2">' + (data[idx][1] ? data[idx][1].nickname : "") + '</div>';
			html+= '<div class="players">';
			html+= '<div value="0" id="room-' + idx + '-icon-0" class="player icon1 ' + (data[idx][0] ? "yes" : "no") + '"></div>';
			html+= '<div value="1" id="room-' + idx + '-icon-1" class="player icon2 ' + (data[idx][1] ? "yes" : "no") + '"></div>';
			html+= '</div>';
			html+= '<div id="room-' + idx + '-name-0" class="player1">' + (data[idx][0] ? data[idx][0].nickname : "") + '</div>';
			html+= '<div class="roomnum">- ' + (parseInt(idx) + 1) + ' -</div>';
			html+= '</div>';
		}
		$("#room-box").html(html);	
	}
	
	//初始化房间
	function initRoom(player1, player2)
	{
		//清除消息和棋子
		$("div.room_chess div").remove();
		$("#room-msg-content p").remove();	
		
		//tag样式切换
		changeTag("room");
		
		//玩家1
		if(player1){
			updateRoom(0, player1);
		}else{
			removeRoom(0);
		}
		
		//玩家2
		if(player2){
			updateRoom(1, player2);
		}else{
			removeRoom(1);
		}
	}
	
	//更新房间人员
	function updateRoom(posIdx, player)
	{
		var p = (posIdx == 0 ? 1 : 2);
		var s = (player.status == STAT_NORMAL ? "NotReady" : (player.status == STAT_READY ? "Ready" : "Gaming"));
		$("#room-p" + p + "-nickname").html(player.nickname);
		$("#room-p" + p + "-status").html(s);
		$("#room-p" + p + "-img").html('<img src="../images/farmer.png" style="width:133px;height:133px;">');
		if(g_Info.id == player.id){
			var b = (player.status == STAT_NORMAL ? "Ready" : (player.status == STAT_READY ? "Cancel" : "Gaming..."));
			$("#game_ready").val(b);
		}
	}
	
	//从本房间移除另一个成员
	function removeRoom(posIdx)
	{
		var p = (posIdx == 0 ? 1 : 2);
		$("#room-p" + p + "-nickname").html('&nbsp;');
		$("#room-p" + p + "-status").html("&nbsp;");
		$("#room-p" + p + "-img").html('<img src="../images/waiting.png" style="width:133px;height:133px;">');
	}
});
