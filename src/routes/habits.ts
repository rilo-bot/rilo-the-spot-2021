import { Router } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import type { Habit } from '../contract';
import { HttpError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

// MongoDB document type: replace `id` with `_id: ObjectId`
type HabitDoc = Omit<Habit, 'id'> & { _id: ObjectId };

function toHabit(doc: HabitDoc): Habit {
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

export function createHabitsRouter(db: Db): Router {
  const router = Router();
  const habits = db.collection<HabitDoc>('habits');

  // ── GET /api/habits ────────────────────────────────────────────────────────
  router.get('/', requireAuth, async (req, res) => {
    const docs = await habits.find({ userId: req.userId! }).sort({ createdAt: 1 }).toArray();
    res.json(docs.map(toHabit));
  });

  // ── POST /api/habits ───────────────────────────────────────────────────────
  router.post('/', requireAuth, async (req, res) => {
    const { label, icon, color } = req.body as {
      label?: unknown;
      icon?: unknown;
      color?: unknown;
    };

    if (typeof label !== 'string' || !label.trim()) {
      throw new HttpError(400, 'A habit label is required.');
    }

    if (icon !== undefined && icon !== null && typeof icon !== 'string') {
      throw new HttpError(400, 'icon must be a string or null.');
    }

    if (color !== undefined && color !== null && typeof color !== 'string') {
      throw new HttpError(400, 'color must be a string or null.');
    }

    const now = new Date().toISOString();

    const doc: HabitDoc = {
      _id: new ObjectId(),
      userId: req.userId!,
      label: label.trim(),
      icon: typeof icon === 'string' ? icon : null,
      color: typeof color === 'string' ? color : null,
      createdAt: now,
    };

    await habits.insertOne(doc);
    res.status(201).json(toHabit(doc));
  });

  // ── DELETE /api/habits/:id ─────────────────────────────────────────────────
  router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      throw new HttpError(400, 'Invalid habit ID.');
    }

    const result = await habits.deleteOne({ _id: new ObjectId(id), userId: req.userId! });

    if (result.deletedCount === 0) {
      throw new HttpError(404, 'Habit not found or you do not have permission to delete it.');
    }

    res.status(204).send();
  });

  return router;
}
