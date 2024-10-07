import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import { authService, tokenService } from '../services';
import exclude from '../utils/exclude';

const register = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.createUser(email, password);
  const userWithoutPassword = exclude(user, ['password', 'createdAt', 'updatedAt']);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user: userWithoutPassword, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens({ id: user.id });
  res.send({ user, tokens });
});

export default {
  register,
  login
};
