const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { Customer, validate } = require('../models/customer');

const router = express.Router();

const fields = (body) => ({ name: body.name, phone: body.phone, isGold: body.isGold });

router.get('/', async (req, res) => {
  res.send(await Customer.find().sort('name'));
});

router.get('/:id', async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).send('The customer with the given ID was not found.');
  res.send(customer);
});

router.post('/', auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  const customer = await new Customer(fields(req.body)).save();
  res.send(customer);
});

router.put('/:id', auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  const customer = await Customer.findByIdAndUpdate(req.params.id, fields(req.body), { new: true });
  if (!customer) return res.status(404).send('The customer with the given ID was not found.');
  res.send(customer);
});

router.delete('/:id', [auth, admin], async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) return res.status(404).send('The customer with the given ID was not found.');
  res.send(customer);
});

module.exports = router;
