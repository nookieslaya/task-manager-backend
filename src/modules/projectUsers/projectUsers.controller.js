import {
  assignUserToProject,
  removeUserFromProject,
  listProjectUsers,
} from "./projectUsers.service.js";

const assignUser = async (req, res, next) => {
  try {
    const { userId } = req.body ?? {};
    const assignment = await assignUserToProject(
      req.user,
      req.params.id,
      userId
    );
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
};

const removeUser = async (req, res, next) => {
  try {
    await removeUserFromProject(req.user, req.params.id, req.params.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await listProjectUsers(req.user, req.params.id);
    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

export { assignUser, removeUser, listUsers };
