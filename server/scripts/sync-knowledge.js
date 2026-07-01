require("../config/env");

const { syncKnowledgeBase } = require("../utils/knowledgeSync");

syncKnowledgeBase()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error("[Knowledge Sync] failed:", err.response?.data || err.message);
    process.exit(1);
  });
