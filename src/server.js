const mongoose = require('mongoose');
const config = require('config');
const app = require('./app');

if (!config.get('jwtPrivateKey')) {
  console.error('FATAL ERROR: jwtPrivateKey is not defined. Set the vivesbib_jwtPrivateKey environment variable.');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost/vivesbib';
const port = process.env.PORT || 3000;

mongoose.connect(uri)
  .then(() => {
    console.log('Connected to MongoDB...');
    app.listen(port, () => console.log(`Listening on port ${port}...`));
  })
  .catch((err) => { console.error('Could not connect to MongoDB...', err.message); process.exit(1); });
