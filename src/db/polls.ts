import { db } from "./connection.js";
import type { PollRecord } from "./types.js";

export function createPoll(
  pollId: string,
  groupId: string,
  title: string,
  pollDate: string
): void {
  const createdAt =
    new Date().toISOString();

  db.prepare(`
    INSERT INTO polls (
      poll_id,
      group_id,
      title,
      poll_date,
      status,
      created_at
    )
    VALUES (
      @pollId,
      @groupId,
      @title,
      @pollDate,
      'open',
      @createdAt
    )
  `).run({
    pollId,
    groupId,
    title,
    pollDate,
    createdAt,
  });
}

export function getPollById(
  pollId: string
): PollRecord | null {
  const row =
    db.prepare(`
      SELECT
        id,
        poll_id AS pollId,
        group_id AS groupId,
        title,
        poll_date AS pollDate,
        status,
        created_at AS createdAt,
        closed_at AS closedAt
      FROM polls
      WHERE poll_id = ?
      LIMIT 1
    `).get(pollId) as
      | PollRecord
      | undefined;

  return row ?? null;
}

export function getOpenPollForDate(
  groupId: string,
  pollDate: string
): PollRecord | null {
  const row =
    db.prepare(`
      SELECT
        id,
        poll_id AS pollId,
        group_id AS groupId,
        title,
        poll_date AS pollDate,
        status,
        created_at AS createdAt,
        closed_at AS closedAt
      FROM polls
      WHERE group_id = ?
        AND poll_date = ?
        AND status = 'open'
      ORDER BY id DESC
      LIMIT 1
    `).get(
      groupId,
      pollDate
    ) as PollRecord | undefined;

  return row ?? null;
}

export function closePoll(
  pollId: string
): void {
  db.prepare(`
    UPDATE polls
    SET
      status = 'closed',
      closed_at = ?
    WHERE poll_id = ?
  `).run(
    new Date().toISOString(),
    pollId
  );
}
