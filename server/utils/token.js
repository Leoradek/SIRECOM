const jwt = require('jsonwebtoken');
const config = require('../config');

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString(), rol: user.rol }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

const verifyToken = (token) => jwt.verify(token, config.jwtSecret);

module.exports = { signToken, verifyToken };
