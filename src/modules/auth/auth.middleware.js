import jwt from "jsonwebtoken";

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw createError(401, "Missing or invalid authorization header");
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw createError(500, "JWT secret not configured");
    }

    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (error) {
    return next(error.status ? error : createError(401, "Invalid token"));
  }
};

const roleMiddleware = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return next(createError(403, "Forbidden"));
  }
  return next();
};

export { authMiddleware, roleMiddleware };
