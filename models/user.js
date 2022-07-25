/** User class for message.ly */

const { BCRYPT_WORK_FACTOR } = require("../config");
const db = require("../db");
const ExpressError = require("../expressError");
const bcrypt = require("bcrypt");

/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPW = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
        VALUES ($1, $2, $3, $4, $5, LOCALTIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPW, first_name, last_name, phone]);
    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password FROM users WHERE username = $1`,
      [username]);
    const user = result.rows[0];
    if (user) {
      if (await bcrypt.compare(password, user.password) === true) {
        return true;
      }
    }
    return false;
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users
        SET last_login_at = CURRENT_TIMESTAMP
        WHERE username = $1`,
      [username]);
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(
      `SELECT username, first_name, last_name, phone FROM users`
    );
    return results.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const results = await db.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at
        FROM users
        WHERE username = $1`,
      [username]);
    if (results.rows.length === 0) {
      throw new ExpressError(`Could not find user with username ${username}`, 404);
    }
    return results.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const results = await db.query(
      `SELECT m.id, m.to_username, m.body, m.sent_at, m.read_at, u.username, u.first_name, u.last_name, u.phone
        FROM messages as m
        INNER JOIN users as u ON m.to_username = u.username
        WHERE m.from_username = $1`,
      [username]);
    if (results.rows.length === 0) {
      return [];
    }
    const messageData = results.rows.map(msg => ({
        id: msg.id,
        to_user: {
          username: msg.username,
          first_name: msg.first_name,
          last_name: msg.last_name,
          phone: msg.phone,
        },
        body: msg.body,
        sent_at: msg.sent_at,
        read_at: msg.read_at
      }));
    return messageData;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(
      `SELECT m.id, m.from_username, m.body, m.sent_at, m.read_at, u.username, u.first_name, u.last_name, u.phone
        FROM messages as m
        INNER JOIN users as u ON m.from_username = u.username
        WHERE m.to_username = $1`,
      [username]);
    if (results.rows.length === 0) {
      return [];
    }
    const messageData = results.rows.map(msg => ({
        id: msg.id,
        from_user: {
          username: msg.username,
          first_name: msg.first_name,
          last_name: msg.last_name,
          phone: msg.phone,
        },
        body: msg.body,
        sent_at: msg.sent_at,
        read_at: msg.read_at
      }));
    return messageData;
  }
}


module.exports = User;