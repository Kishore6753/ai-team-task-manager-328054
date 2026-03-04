const userService = require('../services/user');

/**
 * AuthController
 * Handles user registration and authentication.
 * All errors return with error message and status code.
 */

class AuthController {
  // PUBLIC_INTERFACE
  async register(req, res) {
    /**
     * Register a new user.
     * Body: {username, email, password}
     * Returns: {user} on success, {error} on failure
     */
    try {
      const user = await userService.registerUser({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email
      });
      return res.status(201).json({ user });
    } catch (err) {
      console.error('[AuthController.register] Error:', err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // PUBLIC_INTERFACE
  async login(req, res) {
    /**
     * Authenticate user, returns JWT token.
     * Body: {usernameOrEmail, password}
     * Returns: {token, user} or error
     */
    try {
      const { token, user } = await userService.authenticateUser({
        usernameOrEmail: req.body.usernameOrEmail,
        password: req.body.password
      });
      return res.json({ token, user });
    } catch (err) {
      console.error('[AuthController.login] Error:', err.message);
      return res.status(401).json({ error: err.message });
    }
  }
}

module.exports = new AuthController();
