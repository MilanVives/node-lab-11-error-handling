process.env.vivesbib_jwtPrivateKey = process.env.vivesbib_jwtPrivateKey || 'test-private-key';
const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const mongoose = require('mongoose');
const request = require('supertest');
const db = require('./helpers/db');
const app = require('../src/app');

before(db.connect);
after(db.disconnect);
const env = process.env.NODE_ENV;
afterEach(() => { process.env.NODE_ENV = env; });

function load(file, exportsHint) {
  assert.ok(fs.existsSync(file), `Create ${file} (${exportsHint})`);
  return require(`../${file}`);
}
const errors = () => load('src/errors.js', 'module.exports = { AppError, NotFoundError, ValidationError }');
const errorMiddleware = () => load('src/middleware/error.js', 'module.exports = errorMiddleware');
const asyncHandler = () => load('src/middleware/asyncHandler.js', 'module.exports = asyncHandler');
const token = () => new (require('../src/models/user').User)({ name: 'Test User', email: 't@example.com', password: 'x' }).generateAuthToken();

function fakeRes() {
  return { statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}

describe('R1: Custom error classes', () => {
  it('AppError, NotFoundError and ValidationError carry a status code', () => {
    const { AppError, NotFoundError, ValidationError } = errors();
    const a = new AppError('Boom', 418);
    assert.ok(a instanceof Error, 'AppError should extend Error');
    assert.equal(a.statusCode, 418, 'new AppError(message, statusCode) should set statusCode');
    assert.equal(a.name, 'AppError', 'Set this.name = this.constructor.name');
    const n = new NotFoundError('Genre not found');
    assert.ok(n instanceof AppError, 'NotFoundError should extend AppError');
    assert.equal(n.statusCode, 404);
    assert.equal(n.message, 'Genre not found');
    assert.equal(new NotFoundError().message, 'Resource not found', 'NotFoundError should default to "Resource not found"');
    const v = new ValidationError('"name" is required');
    assert.ok(v instanceof AppError, 'ValidationError should extend AppError');
    assert.equal(v.statusCode, 400);
  });
});

describe('R2: asyncHandler forwards errors to Express', () => {
  it('passes rejected promises to next', async () => {
    const boom = new Error('boom');
    let received;
    await asyncHandler()(async () => { throw boom; })({}, {}, (err) => { received = err; });
    assert.equal(received, boom, 'asyncHandler should call next(err) when the handler rejects');
  });
  it('does not call next when the handler succeeds', async () => {
    let called = false;
    await asyncHandler()(async () => 'ok')({}, {}, () => { called = true; });
    assert.equal(called, false, 'asyncHandler should not call next when the handler succeeds');
  });
});

describe('R3: The error middleware sends JSON errors', () => {
  it('uses the status code and message of an AppError', (t) => {
    t.mock.method(console, 'error', () => {});
    const res = fakeRes();
    errorMiddleware()(new (errors().NotFoundError)('Genre not found'), {}, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.equal(res.body && res.body.error && res.body.error.message, 'Genre not found', 'Send { error: { message } }');
  });
  it('hides unexpected errors in production and shows the stack in development', (t) => {
    t.mock.method(console, 'error', () => {});
    process.env.NODE_ENV = 'production';
    const prod = fakeRes();
    errorMiddleware()(new Error('database password is wrong'), {}, prod, () => {});
    assert.equal(prod.statusCode, 500);
    assert.equal(prod.body.error.message, 'Something went wrong.', 'In production an unexpected error should say "Something went wrong."');
    assert.equal(prod.body.error.stack, undefined, 'Never send the stack trace in production');
    process.env.NODE_ENV = 'development';
    const dev = fakeRes();
    errorMiddleware()(new Error('boom'), {}, dev, () => {});
    assert.equal(dev.body.error.message, 'boom');
    assert.ok(dev.body.error.stack, 'In development include error.stack');
  });
  it('logs the error', (t) => {
    t.mock.method(console, 'error', () => {});
    errorMiddleware()(new Error('x'), {}, fakeRes(), () => {});
    assert.ok(console.error.mock.callCount() > 0, 'The error middleware should console.error the error');
  });
});

describe('R4: Unknown routes return a JSON 404', () => {
  it('GET /api/does-not-exist', async (t) => {
    t.mock.method(console, 'error', () => {});
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.match((res.body && res.body.error && res.body.error.message) || '', /\/api\/does-not-exist/, 'The message should name the route: "Route /api/does-not-exist not found"');
  });
});

describe('R5: The genres routes use the error classes', () => {
  it('an unknown genre gives a JSON 404', async (t) => {
    t.mock.method(console, 'error', () => {});
    const res = await request(app).get(`/api/genres/${new mongoose.Types.ObjectId()}`);
    assert.equal(res.status, 404);
    assert.ok(res.body && res.body.error && res.body.error.message, 'GET /api/genres/<unknown id> should send { error: { message } } (throw new NotFoundError)');
  });
  it('an invalid genre gives a JSON 400', async (t) => {
    t.mock.method(console, 'error', () => {});
    const auth = token();
    const res = await request(app).post('/api/genres').set('x-auth-token', auth).send({ name: 'ab' });
    assert.equal(res.status, 400);
    assert.ok(res.body && res.body.error && res.body.error.message, 'Invalid input should send { error: { message } } (throw new ValidationError)');
  });
});
