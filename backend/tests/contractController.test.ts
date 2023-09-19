import { expect } from 'chai';
import chaiHttp from 'chai-http';
import express from 'express';
import { ethers } from 'ethers';

const chai = require('chai');
const app = express();
const should = chai.should(); // eslint-disable-line no-unused-vars
app.use(express.json());


const contractAddress = "0x848186D33fEF848f0e965300dD8E1B58D60E96dB";
const stakerAddress = "0xDfEDD116e09aB9a877b08e0E348B6299289643cd";

const expectedContractInfo: Record<string, any> = {
    maxTotalStake: 1_000_000,
    maxUserStake: 500_000,
    rewardRateInPercentage: 10,
    maxStakingDuration: 2592000,
    maxStakingDurationInDays: 30,
    maxTotalStakeInEth: 0.000000000001,
    maxUserStakeInEth: 0.0000000000005,
};

const expectedStakerInfo: Record<string, any> = {
    stakedAmountInWei: 500_000,
    stakedAmountInEth: 0.0000000000005,
    startTimestamp: 1695044532,
    startDatetime: "9/18/2023, 4:42:12 PM",
};

describe('Contract Controller', () => {
    describe('GET /contract/:address', () => {

        it('should return contract information for a valid address', (done) => {
            // Only the fields that are not expected to change are verified

            chai.request(app)
                .get(`/contract/${contractAddress}`)
                .end((err: Error, res: ChaiHttp.Response) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('properties');

                    const properties = res.body.properties as Record<string, any>;

                    expect(properties).to.have.property('totalYield');
                    expect(properties).to.have.property('totalStaked');
                    expect(properties).to.have.property('totalStakers');
                    expect(Number(properties.maxTotalStake)).to.equal(expectedContractInfo.maxTotalStake);
                    expect(Number(properties.maxUserStake)).to.equal(expectedContractInfo.maxUserStake);
                    expect(Number(properties.rewardRateInPercentage)).to.equal(expectedContractInfo.rewardRateInPercentage);
                    expect(Number(properties.maxStakingDuration)).to.equal(expectedContractInfo.maxStakingDuration);
                    expect(Number(properties.maxStakingDurationInDays)).to.equal(expectedContractInfo.maxStakingDurationInDays);
                    expect(Number(properties.maxTotalStakeInEth)).to.equal(expectedContractInfo.maxTotalStakeInEth);
                    expect(Number(properties.maxUserStakeInEth)).to.equal(expectedContractInfo.maxUserStakeInEth);

                    done();
                });
        });

        it('should return an error for an invalid address', (done) => {
            chai.request(app)
                .get('/contract/0xinvalid_contract_address')
                .end((err: Error, res: ChaiHttp.Response) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('error').eql('Invalid contract address');
                    done();
                });
        });

        it('should return single contract property when a valid property query param is passed', (done) => {
            const contractProperty = "maxUserStake";

            chai.request(app)
                .get(`/contract/${contractAddress}?property=${contractProperty}`)
                .end((err: Error, res: ChaiHttp.Response) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('properties');

                    const properties = res.body.properties as Record<string, any>;

                    expect(properties).to.have.property(`${contractProperty}`);
                    expect(Number(properties[contractProperty])).equal(expectedContractInfo.maxUserStake);

                    done();
                });
        });

        it('should return an error when an invalid property query param is passed', (done) => {
            const contractProperty = "invalidProperty";

            chai.request(app)
                .get(`/contract/${contractAddress}?property=${contractProperty}`)
                .end((err: Error, res: ChaiHttp.Response) => {
                    res.should.have.status(500);
                    res.body.should.be.an('object');
                    res.body.should.have.property('error').equal(`Property ${contractProperty} not found in contract`);
                    done();
                });

        });

        it('should return contract properties and user data when a valid user address query param is passed', (done) => {
            chai.request(app)
                .get(`/contract/${contractAddress}?userAddress=${stakerAddress}`)
                .end((err: Error, res: ChaiHttp.Response) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('userData');
                    res.body.should.have.property('properties');
                    const userData = res.body.userData as Record<string, any>;

                    expect(userData).to.have.property('1');
                    expect(userData[1]).to.have.property('stakedAmountInWei');
                    expect(userData[1]).to.have.property('stakedAmountInEth');
                    expect(userData[1]).to.have.property('startTimestamp');
                    expect(userData[1]).to.have.property('startDatetime');

                    done();
                });
        });

        it('should return an error when an invalid user address query param is passed', (done) => {
            chai.request(app)
                .get(`/contract/${contractAddress}?userAddress=0xInvalid_user_address`)
                .end((err: Error, res: ChaiHttp.Response) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('error').equal('Invalid user address');

                    done();
                });
        });

        it('should return user data when a valid address and property userData query params are passed', (done) => {
            chai.request(app)
                .get(`/contract/${contractAddress}?userAddress=${stakerAddress}&property=userData`)
                .end((err: Error, res: ChaiHttp.Response) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('userData');
                    const userData = res.body.userData as Record<string, any>;

                    expect(userData).to.have.property('1');

                    const stakedAmountInWei = Number(userData[1].stakedAmountInWei);
                    const stakedAmountInEth = Number(userData[1].stakedAmountInEth);
                    const startTimestamp = Number(userData[1].startTimestamp);

                    expect(stakedAmountInWei).to.equal(expectedStakerInfo.stakedAmountInWei);
                    expect(stakedAmountInEth).to.equal(expectedStakerInfo.stakedAmountInEth);
                    expect(startTimestamp).to.equal(expectedStakerInfo.startTimestamp);
                    expect(userData[1]).to.have.property('startDatetime').equal(expectedStakerInfo.startDatetime);
                    done();
                });
        });

        it('should return property when a valid property query param and valid address are passed', (done) => {
            const contractProperty = "maxUserStake";
            chai.request(app)
                .get(`/contract/${contractAddress}?property=${contractProperty}&userAddress=${stakerAddress}`)
                .end((err: Error, res: ChaiHttp.Response) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('properties');
                    const properties = res.body.properties as Record<string, any>;

                    expect(properties).to.have.property(contractProperty).equal(expectedContractInfo.maxUserStake);

                    done();
                });

        });
    });
});
