const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server/app');
const should = chai.should(); // eslint-disable-line no-unused-vars

chai.use(chaiHttp);

describe('Token Controller', () => {
  describe('GET /token/:address', () => {
    it('should return token information for a valid address', (done) => {
      chai.request(app)
        .get('/token/0xfC089A418902af9C3553E024f013609Bb3C3EAdB')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('object');
          res.body.should.have.property('name');
          res.body.should.have.property('symbol');
          res.body.should.have.property('decimals');
          done();
        });
    });

    it('should return an error for an invalid address', (done) => {
      chai.request(app)
        .get('/token/0xinvalid_token_address')
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.an('object');
          res.body.should.have.property('error').eql('Invalid token address');
          done();
        });
    });
  });
});
