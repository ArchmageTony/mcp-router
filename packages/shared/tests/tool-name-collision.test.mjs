import assert from "node:assert/strict";
import test from "node:test";

import {
  namespaceCollidingTools,
  sanitizeToolNameSegment,
} from "../dist/tool-name-collision.js";

test("sanitizeToolNameSegment keeps alnum and underscore, collapses the rest", () => {
  assert.equal(sanitizeToolNameSegment("ssh-mcp"), "ssh_mcp");
  assert.equal(sanitizeToolNameSegment("ComfyUI MCP"), "ComfyUI_MCP");
  assert.equal(sanitizeToolNameSegment("  foo--bar  "), "foo_bar");
  assert.equal(sanitizeToolNameSegment("___"), "server");
  assert.equal(sanitizeToolNameSegment(""), "server");
});

test("unique original names stay unchanged", () => {
  const result = namespaceCollidingTools([
    {
      originalName: "run_command",
      serverName: "ssh-mcp",
      description: "Run a remote command",
    },
    {
      originalName: "generate_image",
      serverName: "comfy",
      description: "Generate an image",
    },
  ]);

  assert.deepEqual(
    result.map((tool) => tool.exposedName),
    ["run_command", "generate_image"],
  );
  assert.equal(result[0].description, "Run a remote command");
  assert.equal(result[1].description, "Generate an image");
  assert.equal(result[0].originalName, "run_command");
  assert.equal(result[1].originalName, "generate_image");
});

test("colliding original names are prefixed on every copy", () => {
  const result = namespaceCollidingTools([
    {
      originalName: "upload_file",
      serverName: "ssh-mcp",
      description: "Upload over SFTP",
    },
    {
      originalName: "run_command",
      serverName: "ssh-mcp",
      description: "Run a remote command",
    },
    {
      originalName: "upload_file",
      serverName: "comfy",
      description: "Stage a ComfyUI input",
    },
  ]);

  assert.deepEqual(
    result.map((tool) => ({
      exposedName: tool.exposedName,
      originalName: tool.originalName,
      description: tool.description,
    })),
    [
      {
        exposedName: "ssh_mcp__upload_file",
        originalName: "upload_file",
        description: "[ssh-mcp] Upload over SFTP",
      },
      {
        exposedName: "run_command",
        originalName: "run_command",
        description: "Run a remote command",
      },
      {
        exposedName: "comfy__upload_file",
        originalName: "upload_file",
        description: "[comfy] Stage a ComfyUI input",
      },
    ],
  );
});

test("three-way collisions prefix every copy and preserve order", () => {
  const result = namespaceCollidingTools([
    { originalName: "ping", serverName: "a" },
    { originalName: "ping", serverName: "b" },
    { originalName: "ping", serverName: "c" },
  ]);

  assert.deepEqual(
    result.map((tool) => tool.exposedName),
    ["a__ping", "b__ping", "c__ping"],
  );
  assert.deepEqual(
    result.map((tool) => tool.description),
    ["[a]", "[b]", "[c]"],
  );
});

test("servers that sanitize to the same prefix get a numeric suffix", () => {
  const result = namespaceCollidingTools([
    { originalName: "upload_file", serverName: "ssh-mcp" },
    { originalName: "upload_file", serverName: "ssh_mcp" },
  ]);

  assert.deepEqual(
    result.map((tool) => tool.exposedName),
    ["ssh_mcp__upload_file", "ssh_mcp__upload_file_2"],
  );
  assert.equal(result[0].originalName, "upload_file");
  assert.equal(result[1].originalName, "upload_file");
  assert.equal(result[0].serverName, "ssh-mcp");
  assert.equal(result[1].serverName, "ssh_mcp");
});

test("original names that already contain __ stay unique unless they collide", () => {
  const result = namespaceCollidingTools([
    {
      originalName: "foo__upload_file",
      serverName: "other",
      description: "Already prefixed",
    },
    {
      originalName: "upload_file",
      serverName: "foo",
      description: "Upload A",
    },
    {
      originalName: "upload_file",
      serverName: "bar",
      description: "Upload B",
    },
  ]);

  assert.deepEqual(
    result.map((tool) => tool.exposedName),
    ["foo__upload_file", "foo__upload_file_2", "bar__upload_file"],
  );
  assert.equal(result[0].description, "Already prefixed");
  assert.equal(result[1].originalName, "upload_file");
  assert.equal(result[1].description, "[foo] Upload A");
});

test("does not double-prefix descriptions that already start with [serverName]", () => {
  const result = namespaceCollidingTools([
    {
      originalName: "upload_file",
      serverName: "ssh-mcp",
      description: "[ssh-mcp] Upload over SFTP",
    },
    {
      originalName: "upload_file",
      serverName: "comfy",
      description: "[comfy] Stage a ComfyUI input",
    },
  ]);

  assert.equal(result[0].description, "[ssh-mcp] Upload over SFTP");
  assert.equal(result[1].description, "[comfy] Stage a ComfyUI input");
});
