import { Router } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import type { MindfulnessResource, MindfulnessSession, SavedResource } from '../contract';
import { HttpError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

// ── MongoDB document types ──────────────────────────────────────────────────

type ResourceDoc = Omit<MindfulnessResource, 'id'> & { _id: ObjectId };
type SessionDoc = Omit<MindfulnessSession, 'id'> & { _id: ObjectId };
type SavedResourceDoc = Omit<SavedResource, 'id'> & { _id: ObjectId };

// ── Mappers ──────────────────────────────────────────────────────────────────

function toResource(doc: ResourceDoc): MindfulnessResource {
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

function toSession(doc: SessionDoc): MindfulnessSession {
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

function toSaved(doc: SavedResourceDoc): SavedResource {
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

// ── Router factory ───────────────────────────────────────────────────────────

export function createMindfulnessRouter(db: Db): Router {
  const router = Router();
  const resources = db.collection<ResourceDoc>('mindfulness_resources');
  const sessions = db.collection<SessionDoc>('mindfulness_sessions');
  const saved = db.collection<SavedResourceDoc>('saved_resources');

  // ── GET /api/mindfulness/resources ────────────────────────────────────────
  // Supports ?type=meditation and/or ?tag=sleep as optional filters
  router.get('/resources', requireAuth, async (req, res) => {
    const filter: Record<string, unknown> = {};

    const { type, tag } = req.query as { type?: string; tag?: string };

    const validTypes = ['playlist', 'guide', 'breathing', 'meditation'] as const;
    if (type !== undefined) {
      if (!validTypes.includes(type as (typeof validTypes)[number])) {
        throw new HttpError(400, `type must be one of: ${validTypes.join(', ')}.`);
      }
      filter.type = type;
    }

    if (tag !== undefined) {
      if (typeof tag !== 'string' || !tag.trim()) {
        throw new HttpError(400, 'tag must be a non-empty string.');
      }
      filter.tags = tag.trim();
    }

    const docs = await resources.find(filter).sort({ createdAt: -1 }).toArray();
    res.json(docs.map(toResource));
  });

  // ── GET /api/mindfulness/sessions ─────────────────────────────────────────
  router.get('/sessions', requireAuth, async (req, res) => {
    const docs = await sessions
      .find({ userId: req.userId! })
      .sort({ completedAt: -1 })
      .toArray();
    res.json(docs.map(toSession));
  });

  // ── POST /api/mindfulness/sessions ────────────────────────────────────────
  router.post('/sessions', requireAuth, async (req, res) => {
    const body = req.body as {
      durationSeconds?: unknown;
      type?: unknown;
      resourceId?: unknown;
      notes?: unknown;
    };

    const { durationSeconds, type, resourceId, notes } = body;

    if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
      throw new HttpError(400, 'durationSeconds must be a non-negative number.');
    }

    const validSessionTypes = ['timer', 'guided'] as const;
    if (typeof type !== 'string' || !validSessionTypes.includes(type as (typeof validSessionTypes)[number])) {
      throw new HttpError(400, "type must be 'timer' or 'guided'.");
    }

    if (resourceId !== undefined && resourceId !== null && typeof resourceId !== 'string') {
      throw new HttpError(400, 'resourceId must be a string or null.');
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      throw new HttpError(400, 'notes must be a string or null.');
    }

    const now = new Date().toISOString();

    const doc: SessionDoc = {
      _id: new ObjectId(),
      userId: req.userId!,
      durationSeconds,
      type: type as 'timer' | 'guided',
      resourceId: typeof resourceId === 'string' ? resourceId : null,
      notes: typeof notes === 'string' ? notes : null,
      completedAt: now,
    };

    await sessions.insertOne(doc);
    res.status(201).json(toSession(doc));
  });

  // ── GET /api/mindfulness/saved ────────────────────────────────────────────
  router.get('/saved', requireAuth, async (req, res) => {
    const docs = await saved
      .find({ userId: req.userId! })
      .sort({ savedAt: -1 })
      .toArray();
    res.json(docs.map(toSaved));
  });

  // ── POST /api/mindfulness/saved ───────────────────────────────────────────
  router.post('/saved', requireAuth, async (req, res) => {
    const { resourceId } = req.body as { resourceId?: unknown };

    if (typeof resourceId !== 'string' || !resourceId.trim()) {
      throw new HttpError(400, 'resourceId is required.');
    }

    // Check that the referenced resource actually exists
    let resourceObjectId: ObjectId;
    if (!ObjectId.isValid(resourceId)) {
      throw new HttpError(400, 'Invalid resourceId.');
    }
    resourceObjectId = new ObjectId(resourceId);

    const resource = await resources.findOne({ _id: resourceObjectId });
    if (!resource) {
      throw new HttpError(404, 'Mindfulness resource not found.');
    }

    // Prevent duplicate saves
    const existing = await saved.findOne({ userId: req.userId!, resourceId });
    if (existing) {
      throw new HttpError(409, 'You have already saved this resource.');
    }

    const now = new Date().toISOString();
    const doc: SavedResourceDoc = {
      _id: new ObjectId(),
      userId: req.userId!,
      resourceId,
      savedAt: now,
    };

    await saved.insertOne(doc);
    res.status(201).json(toSaved(doc));
  });

  // ── DELETE /api/mindfulness/saved/:resourceId ─────────────────────────────
  router.delete('/saved/:resourceId', requireAuth, async (req, res) => {
    const { resourceId } = req.params;

    if (!resourceId) {
      throw new HttpError(400, 'resourceId param is required.');
    }

    const result = await saved.deleteOne({ userId: req.userId!, resourceId });

    if (result.deletedCount === 0) {
      throw new HttpError(404, 'Saved resource not found or already removed.');
    }

    res.status(204).send();
  });

  return router;
}
