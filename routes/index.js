var express = require('express');
const session = require('express-session');
var router = express.Router();

const CODE_LENGTH = 4;
let boards = {};

function generateCode(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charLen = characters.length;
  let code = "";
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * charLen));
  }
  return code;
}

/* GET home page. */
router.get('/', function (req, res, next) {
  let error = "";
  if (req.query.error) {
    error = req.query.error;
  }
  res.render('index', { error: error });
});

router.post('/', function (req, res, next) {
  let boardcode = req.body.code;
  if (boardcode in boards) {
    if (req.session.codes && req.session.codes[boardcode]) {
      // if board is already in session & you're an editor
      return res.redirect("/board?code=" + boardcode);
    } else if (boards[boardcode].length == 0) {
      // add boardcode to session with editability set to true if joining board without password
      if (req.session.codes) {
        req.session.codes[boardcode] = true;
      } else {
        req.session.codes = {};
        req.session.codes[boardcode] = true;
      }
      return res.redirect("/board?code=" + boardcode);
    } else {
      return res.redirect("/joinboard?code=" + boardcode);
    }
  }
  return res.redirect("/?error=code");

});

router.get('/createboard', function (req, res, next) {
  res.render('createboard');
});

router.post('/createboard', function (req, res, next) {
  let password = req.body.password;
  password.trim();
  let code = generateCode(CODE_LENGTH);
  while (boards[code]) {
    code = generateCode(CODE_LENGTH);
  }
  boards[code] = password;
  if (req.session.codes) {
    req.session.codes[code] = true;
  } else {
    req.session.codes = {};
    req.session.codes[code] = true;
  }
  return res.redirect('/board?code=' + code);
});

router.get('/joinboard', function (req, res, next) {
  let error = "";
  if (req.query.error) {
    error = req.query.error;
  }
  let code = req.query.code;
  res.render('joinboard', { code: code, error: error });
});

router.post('/joinboard', function (req, res, next) {
  let password = req.body.password;
  let code = req.body.code;
  let submit = req.body.submit;
  if (submit == "Join as editor") {
    if (password == boards[code]) {
      // set session stuff to say you can edit this board if password is correct
      if (req.session.codes) {
        req.session.codes[code] = true;
      } else {
        req.session.codes = {};
        req.session.codes[code] = true;
      }
    } else {
      return res.redirect('/joinboard?code=' + code + '&error=pass');
    }
  } else if (submit == "Join as viewer") {
    if (req.session.codes) {
      req.session.codes[code] = false;
    } else {
      req.session.codes = {};
      req.session.codes[code] = false;
    }
  }
  return res.redirect('board?code=' + code);

});

router.get('/board', function (req, res, next) {
  let code = req.query.code;
  let canEdit = req.session.codes[code];
  res.render('board', { boardcode: code, canEdit: canEdit });
});

module.exports = {router, generateCode};
// exports.router = router;
// exports.generateCode = generateCode;