const axios = require("axios");
const { knowledgeEntries } = require("./knowledgeEntries");

const AI_DIAGNOSIS_URL = process.env.AI_DIAGNOSIS_URL || "http://142.93.109.200:8000";
const KNOWLEDGE_URL = `${AI_DIAGNOSIS_URL}/knowledge`;

const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();

function getItems(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

function normalizeEntry(entry) {
  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
  };
}

async function createKnowledgeEntry(entry) {
  const { data } = await axios.post(KNOWLEDGE_URL, normalizeEntry(entry), {
    timeout: 30_000,
  });
  return data;
}

async function updateKnowledgeEntry(existing, entry) {
  if (!existing?.id) {
    return {
      updated: false,
      reason: "existing entry has no id for upstream update",
    };
  }

  try {
    const { data } = await axios.put(
      `${KNOWLEDGE_URL}/${encodeURIComponent(existing.id)}`,
      normalizeEntry(entry),
      { timeout: 30_000 }
    );
    return { updated: true, data };
  } catch (err) {
    return {
      updated: false,
      reason: err.response
        ? `upstream update failed with ${err.response.status}`
        : err.message,
    };
  }
}

async function syncKnowledgeBase({ entries = knowledgeEntries } = {}) {
  const { data } = await axios.get(KNOWLEDGE_URL, { timeout: 30_000 });
  const existingItems = getItems(data);
  const byTitle = new Map(existingItems.map((item) => [item.title, item]));
  const results = [];

  for (const entry of entries) {
    const existing = byTitle.get(entry.title);

    if (!existing) {
      const created = await createKnowledgeEntry(entry);
      results.push({
        id: entry.id,
        title: entry.title,
        action: "created",
        upstream: created?.item?.id || created?.id || null,
      });
      continue;
    }

    const contentChanged = normalize(existing.content) !== normalize(entry.content);
    const tagsChanged =
      JSON.stringify([...(existing.tags || [])].sort()) !==
      JSON.stringify([...(entry.tags || [])].sort());

    if (!contentChanged && !tagsChanged) {
      results.push({
        id: entry.id,
        title: entry.title,
        action: "unchanged",
        upstream: existing.id || null,
      });
      continue;
    }

    const update = await updateKnowledgeEntry(existing, entry);
    results.push({
      id: entry.id,
      title: entry.title,
      action: update.updated ? "updated" : "update_unavailable",
      upstream: existing.id || null,
      reason: update.reason || null,
    });
  }

  return {
    source: KNOWLEDGE_URL,
    attempted: entries.length,
    created: results.filter((item) => item.action === "created").length,
    updated: results.filter((item) => item.action === "updated").length,
    unchanged: results.filter((item) => item.action === "unchanged").length,
    updateUnavailable: results.filter((item) => item.action === "update_unavailable").length,
    results,
  };
}

module.exports = {
  KNOWLEDGE_URL,
  knowledgeEntries,
  syncKnowledgeBase,
};
