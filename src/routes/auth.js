const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const { User } = require('../models/user');

const router = express.Router();

function validate(body) {
  return Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
  }).validate(body);
}

router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(400).send('Invalid email or password.');
  res.send(user.generateAuthToken());
});

module.exports = router;
