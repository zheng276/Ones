var module = require("./trichess");
var app = new module.TriChess();
app.SetConfig({
	"ListenPort" : 8080,
	"RoomTotal" : 100,
	"MaxClientNum" : 300
});
app.Startup();