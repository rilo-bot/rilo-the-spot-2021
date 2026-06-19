import { Router } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import type { Db } from 'mongodb';
import type { User } from '../contract';
import { HttpError } from '../middleware/error';
import { signToken, requireAuth } from '../middleware/auth';

// MongoDB stores _id as ObjectId; we serialise it to `id: string` for the API.
type UserDoc = Omit<User, 'id'> & { _id: ObjectId };

/** Strip internal MongoDB _id and return the contract-shaped User. */
function toUser(doc: UserDoc): User {
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

export function createAuthRouter(db: Db): Router {
  const router = Router();
  const users = db.collection<UserDoc>('users');

  // ── POST /api/auth/signup ──────────────────────────────────────────────────
  router.post('/signup', async (req, res) => {
    const { email, password, displayName } = req.body as {
      email?: unknown;
      password?: unknown;
      displayName?: unknown;
    };

    if (typeof email !== 'string' || !email.trim()) {
      throw new HttpError(400, 'A valid email address is required.');
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters long.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      throw new HttpError(409, 'An account with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const doc: UserDoc = {
      _id: new ObjectId(),
      email: normalizedEmail,
      passwordHash,
      displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : undefined,
      avatarUrl: null,
      bio: null,
      createdAt: now,
    };

    await users.insertOne(doc);

    const user = toUser(doc);
    const token = signToken(doc._id.toHexString());

    res.status(201).json({ token, user });
  });

  // ── POST /api/auth/login ───────────────────────────────────────────────────
  router.post('/login', async (req, res) => {
    const { email, password } = req.body as {
      email?: unknown;
      password?: unknown;
    };

    if (typeof email !== 'string' || !email.trim()) {
      throw new HttpError(400, 'Email address is required.');
    }
    if (typeof password !== 'string' || !password) {
      throw new HttpError(400, 'Password is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const doc = await users.findOne({ email: normalizedEmail });
    if (!doc) {
      throw new HttpError(401, 'Invalid email or password.');
    }

    const passwordMatch = await bcrypt.compare(password, doc.passwordHash);
    if (!passwordMatch) {
      throw new HttpError(401, 'Invalid email or password.');
    }

    const user = toUser(doc);
    const token = signToken(doc._id.toHexString());

    res.json({ token, user });
  });

  // ── GET /api/auth/me ───────────────────────────────────────────────────────
  router.get('/me', requireAuth, async (req, res) => {
    const doc = await users.findOne({ _id: new ObjectId(req.userId) });
    if (!doc) {
      throw new HttpError(404, 'User account not found.');
    }
    res.json(toUser(doc));
  });

  // ── PATCH /api/auth/me ─────────────────────────────────────────────────────
  router.patch('/me', requireAuth, async (req, res) => {
    const { displayName, bio, avatarUrl } = req.body as {
      displayName?: unknown;
      bio?: unknown;
      avatarUrl?: unknown;
    };

    // Build only the fields that were explicitly provided.
    const updates: Partial<Pick<UserDoc, 'displayName' | 'bio' | 'avatarUrl'>> = {};

    if ('displayName' in req.body) {
      updates.displayName =
        typeof displayName === 'string' && displayName.trim()
          ? displayName.trim()
          : undefined;
    }
    if ('bio' in req.body) {
      updates.bio = typeof bio === 'string' ? bio : null;
    }
    if ('avatarUrl' in req.body) {
      updates.avatarUrl = typeof avatarUrl === 'string' ? avatarUrl : null;
    }

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(req.userId) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new HttpError(404, 'User account not found.');
    }

    res.json(toUser(result));
  });

  return router;
}
