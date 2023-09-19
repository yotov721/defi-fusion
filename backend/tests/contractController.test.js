const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server/app');
const should = chai.should(); // eslint-disable-line no-unused-vars
const expect = chai.expect;

chai.use(chaiHttp);

const contractAddress = "0x848186D33fEF848f0e965300dD8E1B58D60E96dB"
const stakerAddress = "0xDfEDD116e09aB9a877b08e0E348B6299289643cd"

describe('Contract Controller', () => {
    describe('GET /contract/:address', () => {

      it('should return contract information for a valid address', (done) => {
        chai.request(app)
          .get(`/contract/${contractAddress}`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.an('object');
            res.body.should.have.property('properties');

            const properties = res.body.properties

            expect(properties).to.have.property('maxTotalStake');
            expect(properties).to.have.property('maxUserStake');
            expect(properties).to.have.property('totalYield');
            expect(properties).to.have.property('totalStaked');
            expect(properties).to.have.property('totalStakers');
            expect(properties).to.have.property('rewardRateInPercentage');
            expect(properties).to.have.property('maxStakingDuration');
            expect(properties).to.have.property('maxStakingDurationInDays');
            expect(properties).to.have.property('maxTotalStakeInEth');
            expect(properties).to.have.property('maxUserStakeInEth');

            done();
          });
      });

      it('should return an error for an invalid address', (done) => {
        chai.request(app)
          .get('/contract/0xinvalid_contract_address')
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.be.an('object');
            res.body.should.have.property('error').eql('Invalid contract address');
            done();
          });
      });

      it('should return single contract property when valid property query param is passed', (done) => {
        const contractProperty = "maxUserStake"

        chai.request(app)
          .get(`/contract/${contractAddress}?property=${contractProperty}`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.an('object');
            res.body.should.have.property('properties');

            const properties = res.body.properties

            expect(properties).to.have.property(`${contractProperty}`);

            done();
          });

      });

      it('should return error when invalid property query param is passed', (done) => {
        const contractProperty = "invalidProperty"

        chai.request(app)
          .get(`/contract/${contractAddress}?property=${contractProperty}`)
          .end((err, res) => {
            res.should.have.status(500);
            res.body.should.be.an('object');
            res.body.should.have.property('error');
            done();
          });

      });

      it('should return contract properties and user data when valid user address query param is passed', (done) => {
        chai.request(app)
          .get(`/contract/${contractAddress}?userAddress=${stakerAddress}`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.an('object');
            res.body.should.have.property('userData');
            res.body.should.have.property('properties');
            const userData = res.body.userData

            expect(userData).to.have.property('1');
            expect(userData[1]).to.have.property('stakedAmountInWei');
            expect(userData[1]).to.have.property('stakedAmountInEth');
            expect(userData[1]).to.have.property('startTimestamp');
            expect(userData[1]).to.have.property('startDatetime');

            done();
          });
      });

      it('should return error when invalid user address query param is passed', (done) => {
        chai.request(app)
          .get(`/contract/${contractAddress}?userAddress=0xInvalid_user_address`)
          .end((err, res) => {
            res.should.have.status(500);
            res.body.should.be.an('object');
            res.body.should.have.property('error');

            done();
          });
      });

      it('should return user data when valid address and property userData query params are passed', (done) => {
        chai.request(app)
          .get(`/contract/${contractAddress}?userAddress=${stakerAddress}&property=userData`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.an('object');
            res.body.should.have.property('userData');
            const userData = res.body.userData

            expect(userData).to.have.property('1');
            expect(userData[1]).to.have.property('stakedAmountInWei');
            expect(userData[1]).to.have.property('stakedAmountInEth');
            expect(userData[1]).to.have.property('startTimestamp');
            expect(userData[1]).to.have.property('startDatetime');
            done();
          });
      });

      it('should return property when valid property query param and valid address are passed', (done) => {
        const contractProperty = "maxUserStake"
        chai.request(app)
          .get(`/contract/${contractAddress}?property=${contractProperty}&userAddress=${stakerAddress}`)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.an('object');
            res.body.should.have.property('properties');
            const properties = res.body.properties

            expect(properties).to.have.property(contractProperty);

            done();
          });

      });
    });

  });

// http://localhost:3000/contract/0x848186D33fEF848f0e965300dD8E1B58D60E96dB?userAddress=0xDfEDD116e09aB9a877b08e0E348B6299289643cd&property=userData

