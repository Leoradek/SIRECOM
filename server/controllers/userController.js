const User = require('../models/User');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { publicUser } = require('../utils/serializers');

// RF-013: edición del perfil (nombre, carrera, fotografía)
exports.updateProfile = asyncHandler(async (req, res) => {
  const update = {};
  if (req.body.nombre !== undefined) update.nombre = String(req.body.nombre).trim();
  if (req.body.carrera !== undefined) update.carrera = String(req.body.carrera).trim();
  if (req.body.fotoUrl !== undefined) update.fotoUrl = String(req.body.fotoUrl).trim();

  if (Object.keys(update).length === 0) {
    throw new HttpError(400, 'Envía al menos uno de los campos: nombre, carrera, fotoUrl');
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true });
  res.json({ message: 'Perfil actualizado', user: publicUser(user) });
});
