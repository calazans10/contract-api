const { Op } = require("sequelize");
const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')

const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

app.get('/contracts/:id', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id } = req.params
    const { id: profileId } = req.profile
    const contract = await Contract.findOne({where: { id, [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }] }})
    if(!contract) return res.status(404).end()
    res.json(contract)
})

app.get('/contracts', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id: profileId } = req.profile
    const contracts = await Contract.findAll({where: { [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }], status: { [Op.not]: 'terminated' }}})
    res.json(contracts)
})

app.get('/jobs/unpaid', getProfile, async (req, res) => {
    const { Contract, Job } = req.app.get('models')
    const { id: profileId } = req.profile
    const jobs = await Job.findAll({ include: { model: Contract, where: { [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }], status: 'in_progress' }, attributes: []}})
    res.json(jobs)
})

app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {
    const { Contract, Job, Profile } = req.app.get('models')
    const { job_id: id } = req.params
    const { profile } = req
    const job = await Job.findOne({ where: { id }, include: { model: Contract, where: { ClientId: profile.id } }})
    
    if(!job) return res.status(404).end()
    if(job.paid) return res.status(422).end()
    if(profile.balance < job.price) return res.status(422).end()

    const contractor = await Profile.findOne({ where: { id: job.Contract.ContractorId }})

    const t = await sequelize.transaction();

    try {
        profile.balance -= job.price
        await profile.save()

        contractor.balance += job.price
        await contractor.save()

        job.paymentDate = new Date()
        job.paid = true
        await job.save()
    } catch (error) {
        await t.rollback();
    }

    res.status(201).end()
})

app.post('/balances/deposit/:userId', getProfile, async (req, res) => {
    const { Contract, Job, Profile } = req.app.get('models')
    const { userId } = req.params
    const { profile } = req

    const client = await Profile.findOne({ where: { id: userId, type: 'client' } })
    if(!client) return res.status(404).end()

    const sumPrice = await Job.sum('price', { include: { model: Contract, where: { ClientId: profile.id,  status: 'in_progress' } } })
    const limit = sumPrice * (25 / 100)
    const { amount } = req.body 

    if(limit < amount) return res.status(422).end()

    const t = await sequelize.transaction();

    try {
        client.balance += amount
        await client.save()
    } catch (error) {
        await t.rollback();
    }
    
    res.status(201).end()
})

module.exports = app;
