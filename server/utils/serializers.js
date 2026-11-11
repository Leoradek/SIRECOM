const publicUser = (u) => ({
  id: String(u._id || u.id),
  nombre: u.nombre,
  correo: u.correo,
  rol: u.rol,
  carrera: u.carrera || '',
  fotoUrl: u.fotoUrl || '',
  verificado: Boolean(u.verificado),
});

module.exports = { publicUser };
