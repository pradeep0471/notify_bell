/**
 * Stand-in for real auth. In production this would decode/verify a JWT (or
 * session) and attach the tenant + user it resolves to -- see the
 * integration write-up in README.md for how that swap would work. For this
 * exercise we trust two headers directly, as specified by the brief:
 *
 *   X-Tenant-Id: <string>
 *   X-User-Id:   <string>
 */
function requireIdentity(req, res, next) {
  const tenantId = req.header('X-Tenant-Id');
  const userId = req.header('X-User-Id');

  if (!tenantId || !userId) {
    return res.status(401).json({
      error: 'Missing identity headers: X-Tenant-Id and X-User-Id are both required.',
    });
  }

  req.tenantId = tenantId;
  req.userId = userId;
  next();
}

module.exports = { requireIdentity };
