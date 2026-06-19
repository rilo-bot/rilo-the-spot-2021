import { Router } from 'express';
import type { Db } from 'mongodb';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import type { ContactMessage } from '../contract';

export function createContactRouter(db: Db): Router {
  const router = Router();
  const messages = db.collection<ContactMessage>('contact_messages');

  // POST /api/contact — Submit a contact/support message (open to anyone)
  router.post('/', async (req, res) => {
    const { name, email, message } = req.body as {
      name?: unknown;
      email?: unknown;
      message?: unknown;
    };

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new HttpError(400, 'Name is required.');
    }
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new HttpError(400, 'Email is required.');
    }
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new HttpError(400, 'Message is required.');
    }

    // Optionally capture the signed-in user's ID from the token if present,
    // but this endpoint is not protected so userId may be absent.
    const userId: string | null = (req as any).userId ?? null;

    const now = new Date().toISOString();
    const doc: ContactMessage = {
      id: randomUUID(),
      userId,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: now,
    };

    await messages.insertOne({ ...doc } as any);

    res.status(201).json({ success: true });
  });

  // GET /api/contact/messages — Get messages submitted by the signed-in user
  router.get('/messages', requireAuth, async (req, res) => {
    const userId = req.userId!;

    const result = await messages
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const payload: ContactMessage[] = result.map(({ _id, ...rest }) => rest as ContactMessage);

    res.json(payload);
  });

  return router;
}
