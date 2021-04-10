let chai = require('chai');
let chaiHttp = require('chai-http');
let express = require('express');
var routes = require('../routes/index.js').router;
let should = chai.should();
const path = require('path');
const serve = require('express').static;
var index = require("../routes/index.js");
const assert = require('assert');
const expect = require('chai').expect
// const request = require('supertest');
var app = require('../app');
app.use(index.router);


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
app.set('views', path.join(__dirname, '../views'))
// tests router.GET methods
describe('Route Index', () => {
  describe('GET Methods', () => {
    it('should render the createboard view', (done) => {
        chai.request(app)
            // .keepOpen()
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
    it('should NOT render the board view if no code given', (done) => {
      chai.request(app)
          .get('/board')
          .end((err, res) => {
            
              expect(res).to.have.status(500);
              done();
          });
    });
  });
  // tests router.POST methods
  describe('POST Methods', () => {
    it('should NOT redirect to board view without password', (done) => {
        chai.request(app)
            // .keepOpen()
            .post('/createboard')
            .end((err, res) => {
              res.should.have.status(500);
              res.body.should.be.a('object');
              // res.body.should.have.property('errors');
              // res.body.errors.should.have.property('pages');
              // res.body.errors.pages.should.have.property('kind').eql('required');
            done();
            });
    });
    it('should NOT redirect to board without password', (done) => {
      chai.request(app)
          .post('/joinboard')
          .end((err, res) => {
              expect(res).to.have.status(500);
              done();
          });
    });
  });
});

