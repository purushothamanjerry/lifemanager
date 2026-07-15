const publicPaths = ['/api/healthcheck', '/api/ping', '/health', '/api/auth/status'];

module.exports = (req, res, next) => {
  // Allow health/ping and auth-status endpoints to bypass authentication
  if (publicPaths.includes(req.path)) {
    return next();
  }

  const correctPass = process.env.APP_PASSWORD;

  // If APP_PASSWORD is not configured in the environment, bypass check with a warning log
  if (!correctPass) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (token === correctPass) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Invalid or missing security token' });
};
