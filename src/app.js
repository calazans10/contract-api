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
    const { id: profile_id } = req.profile
    const contract = await Contract.findOne({where: {id, [Op.or]: [{ ClientId: profile_id }, { ContractorId: profile_id }] }})
    if(!contract) return res.status(404).end()
    res.json(contract)
})

app.get('/contracts', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id: profile_id } = req.profile
    const contracts = await Contract.findAll({where: { [Op.or]: [{ ClientId: profile_id }, { ContractorId: profile_id }], status: { [Op.not]: 'terminated' }}})
    res.json(contracts)
})

app.get('/jobs/unpaid', getProfile, async (req, res) => {
    const { Contract, Job } = req.app.get('models')
    const { id: profile_id } = req.profile
    const jobs = await Job.findAll({ include: { model: Contract, where: { [Op.or]: [{ ClientId: profile_id }, { ContractorId: profile_id }], status: 'in_progress' }, attributes: []}})
    res.json(jobs)
})

module.exports = app;
