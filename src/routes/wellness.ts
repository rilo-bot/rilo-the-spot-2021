import { Router } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import type { WellnessLog } from '../contract';
import { HttpError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

// MongoDB document type: replace `id` with `_id: ObjectId`
type WellnessLogDoc = Omit<WellnessLog, 'id'> & { _id: ObjectId };

function toWellnessLog(doc: WellnessLogDoc): WellnessLog {
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

/** Validate that a string looks like YYYY-MM-DD */
function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function createWellnessRouter(db: Db): Router {
  const router = Router();
  const logs = db.collection<WellnessLogDoc>('wellness_logs');

  // ── GET /api/wellness/logs ─────────────────────────────────────────────────
  // List all logs for the authenticated user, optionally filtered by ?month=YYYY-MM
  router.get('/logs', requireAuth, async (req, res) => {
    const filter: Record<string, unknown> = { userId: req.userId! };

    const { month } = req.query;
    if (typeof month === 'string' && month) {
      // month should be YYYY-MM; match all dates that start with that prefix
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new HttpError(400, 'month query parameter must be in YYYY-MM format.');
      }
      filter.date = { $regex: `^${month}` };
    }

    const docs = await logs.find(filter).sort({ date: -1 }).toArray();
    res.json(docs.map(toWellnessLog));
  });

  // ── GET /api/wellness/logs/:date ───────────────────────────────────────────
  router.get('/logs/:date', requireAuth, async (req, res) => {
    const { date } = req.params;

    if (!isValidDate(date)) {
      throw new HttpError(400, 'Date must be in YYYY-MM-DD format.');
    }

    const doc = await logs.findOne({ userId: req.userId!, date });
    if (!doc) {
      throw new HttpError(404, 'No wellness log found for that date.');
    }

    res.json(toWellnessLog(doc));
  });

  // ── PUT /api/wellness/logs/:date ───────────────────────────────────────────
  // Create or update the log for a specific date (upsert)
  router.put('/logs/:date', requireAuth, async (req, res) => {
    const { date } = req.params;

    if (!isValidDate(date)) {
      throw new HttpError(400, 'Date must be in YYYY-MM-DD format.');
    }

    const { mood, diaryEntry, habits } = req.body as {
      mood?: unknown;
      diaryEntry?: unknown;
      habits?: unknown;
    };

    const validMoods = ['great', 'good', 'okay', 'low', 'rough'] as const;

    if (mood !== undefined && (typeof mood !== 'string' || !validMoods.includes(mood as typeof validMoods[number]))) {
      throw new HttpError(400, `mood must be one of: ${validMoods.join(', ')}.`);
    }

    if (diaryEntry !== undefined && diaryEntry !== null && typeof diaryEntry !== 'string') {
      throw new HttpError(400, 'diaryEntry must be a string or null.');
    }

    if (habits !== undefined && !Array.isArray(habits)) {
      throw new HttpError(400, 'habits must be an array of habit IDs.');
    }

    if (Array.isArray(habits) && !habits.every((h) => typeof h === 'string')) {
      throw new HttpError(400, 'Each entry in habits must be a string.');
    }

    const now = new Date().toISOString();
    const userId = req.userId!;

    // Build the fields to set/update
    const setOnInsert: Partial<WellnessLogDoc> = {
      _id: new ObjectId(),
      userId,
      date,
      habits: [],
      createdAt: now,
    };

    const setFields: Partial<WellnessLogDoc> = { updatedAt: now };

    if (mood !== undefined) {
      setFields.mood = mood as WellnessLog['mood'];
    }
    if (diaryEntry !== undefined) {
      setFields.diaryEntry = diaryEntry as string | null;
    }
    if (habits !== undefined) {
      setFields.habits = habits as string[];
    }

    const result = await logs.findOneAndUpdate(
      { userId, date },
      {
        $set: setFields,
        $setOnInsert: setOnInsert,
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result) {
      throw new HttpError(500, 'Failed to save wellness log.');
    }

    res.json(toWellnessLog(result));
  });

  return router;
}
