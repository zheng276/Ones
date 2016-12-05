var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/hello', function(req, res, next) {
  res.send('Hello Tiancheng Gege!!!')
})

router.get('/play', function (req, res, next) {
  res.render('play', { title: 'Trichess - by team Ones'})
})

module.exports = router;
