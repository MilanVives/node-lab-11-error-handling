# Lab 11: Error Handling

Replace ad-hoc error responses in the Vivesbib API with custom error classes and central error-handling middleware.

This lab continues where Lab 10 ended: the starter contains a working version of that lab.

## Getting started

```bash
npm install
npm test
```

`npm test` runs the same checks as the autograder, against a temporary in-memory MongoDB. Run a single requirement with `node --test --test-name-pattern="^R1:" "test/**/*.test.js"`.

## Requirements

Every error response of the API gets the same JSON shape:

```json
{ "error": { "message": "The genre with the given ID was not found." } }
```

### R1: Custom error classes
**2 points**

Create `src/errors.js` and export three classes:

- `AppError extends Error`: `constructor(message, statusCode = 500)` sets `this.statusCode` and `this.name = this.constructor.name`.
- `NotFoundError extends AppError`: status 404, default message `Resource not found`.
- `ValidationError extends AppError`: status 400.

### R2: asyncHandler forwards errors to Express
**2 points**

Create `src/middleware/asyncHandler.js` exporting `asyncHandler(fn)`: it returns a middleware `(req, res, next)` that runs `fn` and passes a rejected promise to `next(err)`. (Express 5 already does this for async handlers; writing it yourself shows how it works, and it also works in Express 4 projects.)

### R3: The error middleware sends JSON errors
**2 points**

Create `src/middleware/error.js` exporting an error middleware `(err, req, res, next)`:

- log the error with `console.error`;
- status: `err.statusCode` for an `AppError`, otherwise 500;
- message: `err.message`, except for a 500 outside development, which says `Something went wrong.` (never leak internal details);
- in development (`process.env.NODE_ENV === 'development'`) add `stack: err.stack` to the error object;
- respond with `res.status(status).json({ error: { message, ... } })`.

### R4: Unknown routes return a JSON 404
**2 points**

Create `src/middleware/notFound.js`: ``next(new NotFoundError(`Route ${req.originalUrl} not found`))``. In `src/app.js`, after all routes, add `app.use(notFound)` and then `app.use(errorMiddleware)`.

### R5: The genres routes use the error classes
**2 points**

In `src/routes/genres.js` wrap every handler in `asyncHandler(...)`, replace `res.status(404).send(...)` with `throw new NotFoundError('The genre with the given ID was not found.')` and `res.status(400).send(...)` with `throw new ValidationError(error.details[0].message)`.

## Submitting

Commit your work and run `npm run submit`. Your score and feedback appear under **Releases** after a few minutes. You can submit as often as you like; the latest submission counts.
