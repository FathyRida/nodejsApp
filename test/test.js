const request = require('supertest');
const assert = require('assert');
const app = require('../index'); // Import the Express app

describe('GET /', () => {
  it('should return "Hello, World!"', (done) => {
    request(app)
      .get('/')
      .expect(200)
      .end((err, res) => {
        assert.strictEqual(res.text, 'Hello, World!');
        done(err);
      });
  });
});
