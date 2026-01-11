import { registerUser, loginUser, getUserById } from "./auth.service.js";

const register = async (req, res, next) => {
  try {
   const { name, email, password } = req.body ?? {};
const user = await registerUser({ name, email, password });
    res.status(201).json({ message: "User registered", user });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const result = await loginUser({ email, password });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

export { register, login, me };
