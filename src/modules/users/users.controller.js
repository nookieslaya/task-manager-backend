import { listUsers } from "./users.service.js";

const list = async (req, res, next) => {
  try {
    const users = await listUsers(req.user);
    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

export { list };
