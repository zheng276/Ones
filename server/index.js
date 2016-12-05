var module = require("./trichess");
var app = new module.TriChess();
app.SetConfig({
	"ListenPort" : 8080,
	"RoomTotal" : 30,
	"MaxClientNum" : 100
});
app.Startup();