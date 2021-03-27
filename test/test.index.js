let chai = require('chai');
let chaiHttp = require('chai-http');
// let index = require('../routes/index');
let express = require('express');
// const app = express();
// var app = require("../app");
// const session = require('express-session');
var routes = require('../routes/index.js').router;
// var generateCode = require('../routes/index.js').generateCode;
let should = chai.should();
const path = require('path');
const serve = require('express').static;
var index = require("../routes/index.js");
const assert = require('assert');
const expect = require('chai').expect
const request = require('supertest');
var app = express();
app.use(index.router);
// indexRouter.generateCode();
chai.use(chaiHttp);
// tests generateCode()
describe('Code', () => {
  describe('/Generate Code', () => {
    it('it should return a 4 letter code', (done) => {
      let code = index.generateCode(4);
      expect(code).to.be.lengthOf(4);
      done();
    });
    it('it should return a different code each time', (done) => {
      let code = index.generateCode(4);
      let code2 = index.generateCode(4);
      expect(code).to.not.equal(code2);
      done();
    });
  });
});
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express);
app.set('views', path.join(__dirname, 'views'))
// tests router.GET methods
describe('Route Index', () => {
  it('should render the createboard view', (done) => {
      chai.request(app)
          .get('/createboard')
          .end((err, res) => {
              expect(res).to.have.status(200);
              done();
          });
  });
  it('should render the joinboard view', (done) => {
    chai.request(app)
        .get('/joinboard')
        .end((err, res) => {
            expect(res).to.have.status(200);
            done();
        });
  });
  it('should render the board view', (done) => {
    chai.request(app)
        .get('/board')
        .end((err, res) => {
            expect(res).to.have.status(200);
            done();
        });
  });
});
// tests router.POST methods
describe('Route Index', () => {
  it('should render the createboard view', (done) => {
      chai.request(app)
          .post('/createboard')
          .end((err, res) => {
              expect(res).to.have.status(200);
              done();
          });
  });
  it('should render the joinboard view', (done) => {
    chai.request(app)
        .post('/joinboard')
        .end((err, res) => {
            expect(res).to.have.status(200);
            done();
        });
  });
  it('should render the board view', (done) => {
    chai.request(app)
        .post('/board')
        .end((err, res) => {
            expect(res).to.have.status(200);
            done();
        });
  });
});
// // module.exports = router;