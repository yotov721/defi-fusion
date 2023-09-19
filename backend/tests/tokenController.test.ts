import { expect } from 'chai';
import chaiHttp from 'chai-http';
import app from '../server/app';

const chai = require('chai');

chai.use(chaiHttp);

describe('Token Controller', () => {
  describe('GET /token/:address', () => {
    it('should return token information for a valid address', (done) => {
      const expectedTokenInfo = {
        name: 'Fusion Token',
        symbol: 'FSN',
        decimals: 18,
      };

      chai.request(app)
        .get('/token/0xfC089A418902af9C3553E024f013609Bb3C3EAdB')
        .end((err: Error, res: ChaiHttp.Response) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('name').equal(expectedTokenInfo.name);
          expect(res.body).to.have.property('symbol').equal(expectedTokenInfo.symbol);
          expect(res.body).to.have.property('decimals').equal(expectedTokenInfo.decimals);
          done();
        });
    });

    it('should return an error for an invalid address', (done) => {
      chai.request(app)
        .get('/token/0xinvalid_token_address')
        .end((err: Error, res: ChaiHttp.Response) => {
          expect(res).to.have.status(400);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('error').eql('Invalid token address');
          done();
        });
    });
  });
});
