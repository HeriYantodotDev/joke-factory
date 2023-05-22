import request from 'supertest';
import { app } from '../app';
import { User, UserHelperModel, CredentialBody } from '../models';
import { sequelize } from '../config/database';
import { optionPostUser } from './UserRegister.test';
import en from '../locales/en/translation.json';
import id from '../locales/id/translation.json';

beforeAll( async () => {
  await sequelize.sync();
});

beforeEach( async () => {
  await User.destroy({truncate: true});
});

afterAll(async () => {
  await sequelize.close();
});

const emailUser1 = 'user1@gmail.com';
const passwordUser1 = 'A4GuaN@SmZ';
const randomPassword = 'JuJ*733H_SDsd@!';
const API_URL_POST_AUTH = '/api/1.0/auth';

interface bodyLogin {
  [key: string]: string | boolean | undefined,
  email: string,
  password: string,
}

async function postAuthentication(credentials: CredentialBody, option: optionPostUser = {}) {
  const res = await request(app).post(API_URL_POST_AUTH).send(credentials);

  if (!res.redirect) {
    return res;
  }

  const redirectedUrl = res.headers.location;
  const agent = request(app).get(redirectedUrl);

  return await agent
    .set('Accept-Language', option.language? option.language : 'en')
    .set('cookie', res.headers['set-cookie']? res.headers['set-cookie']: '');
}

async function postAuthenticationManual(credentials = {}, option: optionPostUser = {}) {
  const res = await request(app)
    .post(API_URL_POST_AUTH)
    .send(credentials)
    .set('Accept-Language', option.language? option.language : 'en');

  if (!res.redirect) {
    return res;
  }

  const redirectedUrl = res.headers.location;
  const agent = request(app).get(redirectedUrl);

  return await agent
    .set('Accept-Language', option.language? option.language : 'en')
    .set('cookie', res.headers['set-cookie']? res.headers['set-cookie']: '');
}

async function postAuthenticationUser1(option: optionPostUser = {}) {
  if (option.language) {
    return await postAuthentication(
      {
      email: emailUser1,
      password: passwordUser1,
      }, 
      option)
    ;
  }

  return await postAuthentication({
    email: emailUser1,
    password: passwordUser1,
  });
}

async function postAuthenticationWrongPassword(option: optionPostUser = {}) {
  if (option.language) {
    return await postAuthentication(
      {
      email: emailUser1,
      password: randomPassword,
      }, 
      option)
    ;
  }

  return await postAuthentication({
    email: emailUser1,
    password: randomPassword,
  });
}

describe('Authentication', () => {
  test('returns 200 when credentials are correct', async() => {
    await UserHelperModel.addMultipleNewUsers(1);
    const response = await postAuthenticationUser1();

    expect(response.status).toBe(200);
  });

  test('returns only user id, user name and token when login success', async() => {
    const user = await UserHelperModel.addMultipleNewUsers(1);
    const response = await postAuthenticationUser1();
    expect(response.body.id).toBe(user[0].id);
    expect(response.body.username).toBe(user[0].username);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'token']);
  });

  test('returns 401 when user doesn\'t exist', async() => {
    const response = await postAuthenticationUser1();
    expect(response.status).toBe(401);
  });

  test('returns proper error body when authentication fails', async () => {
    const nowInMilis = new Date().getTime();
    const response = await postAuthenticationUser1();
    const error = response.body;

    expect(error.path).toBe('/api/1.0/auth/localFailure');
    expect(error.timeStamp).toBeGreaterThan(nowInMilis);
    expect(Object.keys(error)).toEqual(['path', 'timeStamp', 'message']);
  });

  test.each`
  language        | message
  ${'id'}         | ${id.authFailure}
  ${'en'}         | ${en.authFailure}
  `('returns $message when authentication fails and language is set as $language', async ({language, message}) => {
    const response = await postAuthenticationUser1({language});
    expect(response.body.message).toBe(message);
  });

  test('returns 401 when password is wrong', async () => {
    await UserHelperModel.addMultipleNewUsers(1);
    const response = await postAuthenticationWrongPassword();
    expect(response.status).toBe(401);
  });

  test('returns 403 when logging in with an inactive account', async() => {
    await UserHelperModel.addMultipleNewUsers(0,1);
    const response = await postAuthenticationUser1();
    expect(response.status).toBe(403);
  });
  
  test('returns proper error body when user inactive authentication fails', async () => {
    await UserHelperModel.addMultipleNewUsers(0,1);
    const nowInMilis = new Date().getTime();
    const response = await postAuthenticationUser1();
    const error = response.body;

    expect(error.path).toBe('/api/1.0/auth/localFailure');
    expect(error.timeStamp).toBeGreaterThan(nowInMilis);
    expect(Object.keys(error)).toEqual(['path', 'timeStamp', 'message']);
  });

  test.each`
  language        | message
  ${'id'}         | ${id.inactiveAccount}
  ${'en'}         | ${en.inactiveAccount}
  `('returns $message when authentication fails and language is set as $language', async ({language, message}) => {
    await UserHelperModel.addMultipleNewUsers(0,1);
    const response = await postAuthenticationUser1({language});
    expect(response.body.message).toBe(message);
  });

  test('returns 400 when e-mail is not valid', async() => {
    const response = await postAuthenticationManual({
      password: passwordUser1,
    });

    expect(response.status).toBe(400);
  }); 

  test('returns 400 when password is not valid', async() => {
    const response = await postAuthenticationManual({
      email: emailUser1,
    });

    expect(response.status).toBe(400);
  }); 

  test('returns proper error body when login body validation fails', async() => {
    const credential: bodyLogin = {
      email: '',
      password: passwordUser1,
    };
    const response = await postAuthenticationManual(credential);
    expect(Object.keys(response.body)).toEqual(['path', 'timeStamp', 'message', 'validationErrors']);
  });

  test.each`
    language      | errorMessage
    ${'en'}       | ${en.validationFailure}
    ${'id'}       | ${id.validationFailure}
  `('returns error message "$errorMessage" when login body validation fail & language "$language" is set',
  async({language, errorMessage}) => {
    const credential: bodyLogin = {
      email: '',
      password: passwordUser1,
    };
    const response = await postAuthenticationManual(credential, {language});
    expect(response.body.message).toBe(errorMessage);
  });

  test.each`
  field             | value                     | errorMessage
  ${'email'}        | ${''}                     | ${en.errorEmailEmpty}
  ${'email'}        | ${null}                   | ${en.errorEmailNull}
  ${'email'}        | ${'email'}                | ${en.errorEmailInvalid}
  ${'email'}        | ${'email@'}               | ${en.errorEmailInvalid}
  ${'password'}     | ${''}                     | ${en.errorPasswordEmpty}
  ${'password'}     | ${null}                   | ${en.errorPasswordNull}
`('[.validationErrors]if $field is = "$value", $errorMessage is received', 
  async({field, value, errorMessage}) => {

    const credential: bodyLogin = {
      email: emailUser1,
      password: passwordUser1,
    };

    credential[field] = value;

    const response = await postAuthenticationManual(credential,{language: 'en'} );

    expect(response.body.validationErrors[field]).toBe(errorMessage);
  });

  test.each`
  field             | value                     | errorMessage
  ${'email'}        | ${''}                     | ${id.errorEmailEmpty}
  ${'email'}        | ${null}                   | ${id.errorEmailNull}
  ${'email'}        | ${'email'}                | ${id.errorEmailInvalid}
  ${'email'}        | ${'email@'}               | ${id.errorEmailInvalid}
  ${'password'}     | ${''}                     | ${id.errorPasswordEmpty}
  ${'password'}     | ${null}                   | ${id.errorPasswordNull}
`('[.validationErrors]if $field is = "$value", $errorMessage is received', 
  async({field, value, errorMessage}) => {

    const credential: bodyLogin = {
      email: emailUser1,
      password: passwordUser1,
    };

    credential[field] = value;

    const response = await postAuthenticationManual(credential,{language: 'id'} );

    expect(response.body.validationErrors[field]).toBe(errorMessage);
  });

  test('returns token in response body when credentials are correct', async() => {
    await UserHelperModel.addMultipleNewUsers(1);
    const response = await postAuthenticationUser1();
    expect(response.body.token).not.toBeUndefined();
  });


});
