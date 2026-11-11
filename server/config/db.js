const mongoose = require('mongoose');
const config = require('./index');

mongoose.set('strictQuery', true);

const connectDB = async () => {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 20,
  });
  console.log(`[DB] MongoDB conectado: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

module.exports = connectDB;
