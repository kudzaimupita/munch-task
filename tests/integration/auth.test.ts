import request from 'supertest';
import { faker } from '@faker-js/faker';
import httpStatus from 'http-status';
import httpMocks from 'node-mocks-http';
import moment from 'moment';
import app from '../../src/app';
import config from '../../src/config/config';
import auth from '../../src/middlewares/auth';
import { tokenService } from '../../src/services';
import ApiError from '../../src/utils/ApiError';
import setupTestDB from '../utils/setupTestDb';
import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { userOne, insertUsers } from '../fixtures/user.fixture';
import { Role, TokenType, User } from '@prisma/client';
import prisma from '../../src/client';

setupTestDB();

describe('Auth routes', () => {
  describe('POST /v1/auth/register', () => {
    let newUser: { email: string; password: string };
    beforeEach(() => {
      newUser = {
        email: faker.internet.email().toLowerCase(),
        password: 'password1'
      };
    });

    test('should return 201 and successfully register user if request data is ok', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).toEqual({
        id: expect.anything(),
        name: null,
        email: newUser.email,
        role: Role.USER,
        isEmailVerified: false
      });

      const dbUser = await prisma.user.findUnique({ where: { id: res.body.user.id } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.password).not.toBe(newUser.password);
      expect(dbUser).toMatchObject({
        name: null,
        email: newUser.email,
        role: Role.USER,
        isEmailVerified: false
      });

      expect(res.body.tokens).toEqual({
        access: { token: expect.anything(), expires: expect.anything() },
        refresh: { token: expect.anything(), expires: expect.anything() }
      });
    });

    test('should return 400 error if email is invalid', async () => {
      newUser.email = 'invalidEmail';

      await request(app).post('/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if email is already used', async () => {
      await insertUsers([userOne]);
      newUser.email = userOne.email;

      await request(app).post('/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if password length is less than 8 characters', async () => {
      newUser.password = 'passwo1';

      await request(app).post('/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if password does not contain both letters and numbers', async () => {
      newUser.password = 'password';

      await request(app).post('/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);

      newUser.password = '11111111';

      await request(app).post('/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /v1/auth/login', () => {
    test('should return 200 and login user if email and password match', async () => {
      await insertUsers([userOne]);
      const loginCredentials = {
        email: userOne.email,
        password: userOne.password
      };

      const res = await request(app)
        .post('/v1/auth/login')
        .send(loginCredentials)
        .expect(httpStatus.OK);

      expect(res.body.user).toMatchObject({
        id: expect.anything(),
        name: userOne.name,
        email: userOne.email,
        role: userOne.role,
        isEmailVerified: userOne.isEmailVerified
      });

      expect(res.body.user).toEqual(expect.not.objectContaining({ password: expect.anything() }));

      expect(res.body.tokens).toEqual({
        access: { token: expect.anything(), expires: expect.anything() },
        refresh: { token: expect.anything(), expires: expect.anything() }
      });
    });

    test('should return 401 error if there are no users with that email', async () => {
      const loginCredentials = {
        email: userOne.email,
        password: userOne.password
      };

      const res = await request(app)
        .post('/v1/auth/login')
        .send(loginCredentials)
        .expect(httpStatus.UNAUTHORIZED);

      expect(res.body).toEqual({
        code: httpStatus.UNAUTHORIZED,
        message: 'Incorrect email or password'
      });
    });

    test('should return 401 error if password is wrong', async () => {
      await insertUsers([userOne]);
      const loginCredentials = {
        email: userOne.email,
        password: 'wrongPassword1'
      };

      const res = await request(app)
        .post('/v1/auth/login')
        .send(loginCredentials)
        .expect(httpStatus.UNAUTHORIZED);

      expect(res.body).toEqual({
        code: httpStatus.UNAUTHORIZED,
        message: 'Incorrect email or password'
      });
    });
  });

  describe('Auth middleware', () => {
    test('should call next with no errors if access token is valid', async () => {
      await insertUsers([userOne]);
      const dbUserOne = (await prisma.user.findUnique({ where: { email: userOne.email } })) as User;
      const userOneAccessToken = tokenService.generateToken(
        dbUserOne.id,
        moment().add(config.jwt.accessExpirationMinutes, 'minutes'),
        TokenType.ACCESS
      );
      const req = httpMocks.createRequest({
        headers: { Authorization: `Bearer ${userOneAccessToken}` }
      });
      const next = jest.fn();

      await auth()(req, httpMocks.createResponse(), next);

      expect(next).toHaveBeenCalledWith();
      expect((req.user as User).id).toEqual(dbUserOne.id);
    });

    test('should call next with unauthorized error if access token is not found in header', async () => {
      await insertUsers([userOne]);
      const req = httpMocks.createRequest();
      const next = jest.fn();

      await auth()(req, httpMocks.createResponse(), next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'Please authenticate'
        })
      );
    });

    test('should call next with unauthorized error if access token is not a valid jwt token', async () => {
      await insertUsers([userOne]);
      const req = httpMocks.createRequest({ headers: { Authorization: 'Bearer randomToken' } });
      const next = jest.fn();

      await auth()(req, httpMocks.createResponse(), next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'Please authenticate'
        })
      );
    });

    test('should call next with unauthorized error if the token is not an access token', async () => {
      await insertUsers([userOne]);
      const dbUserOne = (await prisma.user.findUnique({ where: { email: userOne.email } })) as User;
      const expires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
      const refreshToken = tokenService.generateToken(dbUserOne.id, expires, TokenType.REFRESH);
      const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${refreshToken}` } });
      const next = jest.fn();

      await auth()(req, httpMocks.createResponse(), next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'Please authenticate'
        })
      );
    });

    test('should call next with unauthorized error if access token is generated with an invalid secret', async () => {
      await insertUsers([userOne]);
      const dbUserOne = (await prisma.user.findUnique({ where: { email: userOne.email } })) as User;
      const expires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
      const accessToken = tokenService.generateToken(
        dbUserOne.id,
        expires,
        TokenType.ACCESS,
        'invalidSecret'
      );
      const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${accessToken}` } });
      const next = jest.fn();

      await auth()(req, httpMocks.createResponse(), next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'Please authenticate'
        })
      );
    });

    test('should call next with unauthorized error if access token is expired', async () => {
      await insertUsers([userOne]);
      const dbUserOne = (await prisma.user.findUnique({ where: { email: userOne.email } })) as User;
      const expires = moment().subtract(1, 'minutes');
      const accessToken = tokenService.generateToken(dbUserOne.id, expires, TokenType.ACCESS);
      const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${accessToken}` } });
      const next = jest.fn();

      await auth()(req, httpMocks.createResponse(), next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'Please authenticate'
        })
      );
    });

    test('should call next with unauthorized error if user is not found', async () => {
      const userOneAccessToken = tokenService.generateToken(
        2000,
        moment().add(config.jwt.accessExpirationMinutes, 'minutes'),
        TokenType.ACCESS
      );
      const req = httpMocks.createRequest({
        headers: { Authorization: `Bearer ${userOneAccessToken}` }
      });
      const next = jest.fn();

      await auth()(req, httpMocks.createResponse(), next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'Please authenticate'
        })
      );
    });
  });
});
