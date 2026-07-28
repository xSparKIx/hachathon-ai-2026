#!/usr/bin/env node

const { spawnSync } = require("child_process");
const { writeFileSync } = require("fs");

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  // Логируем что пришло от qwen для отладки
  writeFileSync("/tmp/qwen-hook-debug.json", raw);

  let hookData = {};
  try {
    hookData = JSON.parse(raw);
  } catch (e) {
    writeFileSync("/tmp/qwen-hook-error.txt", `Parse error: ${e.message}\nRaw: ${raw}`);
    process.exit(0);
  }

  const toolInput = hookData.tool_input || {};
  const filePath = toolInput.file_path || toolInput.path || "";
  const sessionId = hookData.session_id || "unknown-session";

  const payload = {
    type: "ai_agent",
    repo_working_dir: process.cwd(),
    agent_name: "qwen-code",
    model: "qwen-code",
    conversation_id: sessionId,
    edited_filepaths: filePath ? [filePath] : [],
    transcript: { messages: [] },
  };

  // Логируем payload
  writeFileSync("/tmp/qwen-hook-payload.json", JSON.stringify(payload, null, 2));

  const result = spawnSync(
    "git",
    ["ai", "checkpoint", "agent-v1", "--hook-input", "stdin"],
    {
      input: JSON.stringify(payload),
      stdio: ["pipe", "inherit", "inherit"],
    }
  );

  process.exit(result.status || 0);
});
