import { Router } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import type { Spot } from '../contract';
import { HttpError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

// MongoDB document type: replace `id` with `_id: ObjectId`
type SpotDoc = Omit<Spot, 'id'> & { _id: ObjectId };

function toSpot(doc: SpotDoc): Spot {
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

export function createSpotsRouter(db: Db): Router {
  const router = Router();
  const spots = db.collection<SpotDoc>('spots');

  // ── GET /api/spots ─────────────────────────────────────────────────────────
  router.get('/', requireAuth, async (req, res) => {
    const docs = await spots.find({ userId: req.userId! }).sort({ createdAt: -1 }).toArray();
    res.json(docs.map(toSpot));
  });

  // ── POST /api/spots ────────────────────────────────────────────────────────
  router.post('/', requireAuth, async (req, res) => {
    const body = req.body as {
      name?: unknown;
      notes?: unknown;
      vibe?: unknown;
      lat?: unknown;
      lng?: unknown;
      address?: unknown;
      emoji?: unknown;
    };

    const { name, notes, vibe, lat, lng, address, emoji } = body;

    if (typeof name !== 'string' || !name.trim()) {
      throw new HttpError(400, 'A spot name is required.');
    }

    if (typeof lat !== 'number' || !isFinite(lat)) {
      throw new HttpError(400, 'A valid latitude (number) is required.');
    }

    if (typeof lng !== 'number' || !isFinite(lng)) {
      throw new HttpError(400, 'A valid longitude (number) is required.');
    }

    const validVibes = ['calm', 'cozy', 'energizing', 'social', 'nature', 'focus'] as const;
    if (vibe !== undefined && !validVibes.includes(vibe as typeof validVibes[number])) {
      throw new HttpError(400, `vibe must be one of: ${validVibes.join(', ')}.`);
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      throw new HttpError(400, 'notes must be a string or null.');
    }

    if (address !== undefined && address !== null && typeof address !== 'string') {
      throw new HttpError(400, 'address must be a string or null.');
    }

    if (emoji !== undefined && emoji !== null && typeof emoji !== 'string') {
      throw new HttpError(400, 'emoji must be a string or null.');
    }

    const now = new Date().toISOString();

    const doc: SpotDoc = {
      _id: new ObjectId(),
      userId: req.userId!,
      name: name.trim(),
      notes: typeof notes === 'string' ? notes : null,
      vibe: vibe as Spot['vibe'],
      lat,
      lng,
      address: typeof address === 'string' ? address : null,
      emoji: typeof emoji === 'string' ? emoji : null,
      createdAt: now,
    };

    await spots.insertOne(doc);
    res.status(201).json(toSpot(doc));
  });

  // ── PATCH /api/spots/:id ───────────────────────────────────────────────────
  router.patch('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      throw new HttpError(400, 'Invalid spot ID.');
    }

    const body = req.body as {
      name?: unknown;
      notes?: unknown;
      vibe?: unknown;
      address?: unknown;
      emoji?: unknown;
    };

    const { name, notes, vibe, address, emoji } = body;

    const validVibes = ['calm', 'cozy', 'energizing', 'social', 'nature', 'focus'] as const;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      throw new HttpError(400, 'name must be a non-empty string.');
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      throw new HttpError(400, 'notes must be a string or null.');
    }

    if (vibe !== undefined && !validVibes.includes(vibe as typeof validVibes[number])) {
      throw new HttpError(400, `vibe must be one of: ${validVibes.join(', ')}.`);
    }

    if (address !== undefined && address !== null && typeof address !== 'string') {
      throw new HttpError(400, 'address must be a string or null.');
    }

    if (emoji !== undefined && emoji !== null && typeof emoji !== 'string') {
      throw new HttpError(400, 'emoji must be a string or null.');
    }

    // Build the update patch — only include fields that were provided
    const patch: Partial<Omit<SpotDoc, '_id'>> = {};
    if (name !== undefined) patch.name = (name as string).trim();
    if (notes !== undefined) patch.notes = notes as string | null;
    if (vibe !== undefined) patch.vibe = vibe as Spot['vibe'];
    if (address !== undefined) patch.address = address as string | null;
    if (emoji !== undefined) patch.emoji = emoji as string | null;

    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, 'No update fields provided.');
    }

    const result = await spots.findOneAndUpdate(
      { _id: new ObjectId(id), userId: req.userId! },
      { $set: patch },
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new HttpError(404, 'Spot not found or you do not have permission to update it.');
    }

    res.json(toSpot(result));
  });

  // ── DELETE /api/spots/:id ──────────────────────────────────────────────────
  router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      throw new HttpError(400, 'Invalid spot ID.');
    }

    const result = await spots.deleteOne({ _id: new ObjectId(id), userId: req.userId! });

    if (result.deletedCount === 0) {
      throw new HttpError(404, 'Spot not found or you do not have permission to delete it.');
    }

    res.status(204).send();
  });

  return router;
}
