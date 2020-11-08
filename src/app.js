const { Op } = require("sequelize");
const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')

const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

app.get('/contracts/:id',getProfile ,async (req, res) =>{
    const {Contract} = req.app.get('models')
    const {id} = req.params
    const { id: profile_id } = req.profile
    const contract = await Contract.findOne({where: {id, [Op.or]: [{ ClientId: profile_id }, { ContractorId: profile_id }] }})
    if(!contract) return res.status(404).end()
    res.json(contract)
})
module.exports = app;
