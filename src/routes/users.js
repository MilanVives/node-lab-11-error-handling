const express = require('express');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const auth = require('../middleware/auth');
const { User, validate } = require('../models/user');

const router = express.Router();

router.get('/me', auth, async (req, res) => {
  res.send(await User.findById(req.user._id).select('-password'));
});

router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  if (await User.findOne({ email: req.body.email })) return res.status(400).send('User already registered.');
  const user = new User(_.pick(req.body, ['name', 'email', 'password']));
  user.password = await bcrypt.hash(user.password, await bcrypt.genSalt(10));
  await user.save();
  res.header('x-auth-token', user.generateAuthToken()).send(_.pick(user, ['_id', 'name', 'email']));
});

module.exports = router;
