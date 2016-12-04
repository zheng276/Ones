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
	var g_Host = "127.0.0.1";
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
	}).on("startInfo", function(data){//Game Start
		$("#room-" + data.roomIdx).addClass("room_item_start");
		$("#user-" + data.player1 + " span").html("Gaming");
		$("#user-" + data.player2 + " span").html("Gaming");
	}).on("overInfo", function(data){//Game End
		$("#room-" + data.roomIdx).removeClass("room_item_start");
		$("#user-" + data.player1 + " span").html("Waiting");
		$("#user-" + data.player2 + " span").html("Waiting");
		if(data.roomIdx == g_Info.roomIdx){
			//Update Status for players
			var p = (data.player1 == g_Info.id ? 2 : 1);
			$("#room-p" + p + "-status").html("Not Ready");
		}
	}).on("leaveRoom", function(data){//Leave Room
		var name = $('#room-' + data.roomIdx + '-name-' + data.posIdx);
		var icon = $('#room-' + data.roomIdx + '-icon-' + data.posIdx);
		name.html('');
		icon.removeClass('yes').addClass('no');
		if(data.id == g_Info.id){//Update User Info
			g_Info.roomIdx = -1;
			g_Info.posIdx  = -1;
			changeTag("room_list");
		}else if(data.roomIdx == g_Info.roomIdx){//Exit Room
			removeRoom(data.posIdx);
		}
	}).on("joinRoomError", function(data){//Enter Room Fail
		alert("Fail to Join Room");
	}).on("message", function(data){//Accept Msg
		if(data.type == MSG_ALL){
			$("#msg-content").append("<p>" + data.nickname + ": " + data.body + "</p>");
		}else if(data.type == MSG_TO){
			$("#msg-content").append("<p style=\"color:#339933\">" + data.nickname + ": " + data.body + "</p>");
		}else if(data.type == MSG_ROOM){
			$("#room-msg-content").append("<p>" + data.nickname + ": " + data.body + "</p>");
		}
	}).on("drawChess", function(data){//Drop Chess
		var left = data.x * 35 + 5;
		var top  = data.y * 35 + 5;
		var css  = (data.color == COLOR_BLACK ? "black" : "white");
		var html = '<div id="chess-' + data.x + '-' + data.y + '" style="left:' + left + 'px;top:' + top + 'px" class="' + css + '"></div>';
		$("div.room_chess").append(html);
		if($("div.room_chess .cur").length == 0){
			$("div.room_chess").append('<div class="cur"></div>');
		}
		$("div.room_chess .cur").css({
			left : left,
			top : top
		});
		if(data.id == g_Info.id){
			g_Info.allowDraw = false;
			$("div.room_chess").css("cursor", "no-drop");
		}else{
			g_Info.allowDraw = true;
			$("div.room_chess").css("cursor", "pointer");
		}	
	}).on("winer", function(data){//Success
		g_Info.status = STAT_NORMAL;
		g_Info.allowDraw = false;
		updateRoom(g_Info.posIdx, g_Info);
		alert("You Win! Boiler Up!");
	}).on("loser", function(data){//Fail
		g_Info.status = STAT_NORMAL;
		g_Info.allowDraw = false;
		updateRoom(g_Info.posIdx, g_Info);
		alert("You Lost :( It's Okay, your life gets more diffcult");
	});
	
	//Render Login 
	$("#dlgBg").css({
		width : $(document).width(),
		height : $(document).height()
	});
	$("#login").css({
		left : ($(document).width() - $("#login").width()) / 2,
		top : 100
	});
	
	//Enter Username
	$('#nickname').click(function(){
		$(this).val('');
	}).blur(function(){
		if($(this).val() == ''){
			$(this).val(defaultNickname);
		}
	}).val(defaultNickname);
	
	//Login
	$("#loginBtn").click(function(){
		//Connect with Server
		if(app.connect() == false){
			alert("error: " + app.getError());
			return false;
		}
		
		//Login with Username
		var nickname = $("#nickname").val();
		if(!nickname || nickname == defaultNickname){
			alert("Please Enter Your Name");
			$("#nickname").val('').focus();
			return ;
		}
		app.login(nickname);
	});
	
	//Enter Room
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

	
	//Change tag
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
	
	
	//Ready
	$("#game_ready").click(function(){
		if(g_Info.status == STAT_START){
			return;
		}
		app.ready();
	});
	
	//Exit Room
	$("#game_leave").click(function(){
		if(g_Info.status == STAT_START){
			alert("Don't escape from the game!");
			return ;
		}
		app.leaveRoom(g_Info.roomIdx);
	});
	
});
