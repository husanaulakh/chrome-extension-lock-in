# Downloaded efficiency tools

Owner requested Ponytail, RTK and Graphify, then asked to stop comparison work and focus on the application. They are development helpers, not extension dependencies.

- **Ponytail:** upstream reuse-first rules and MIT license saved in `agent-work/tools/ponytail/`; concise reviewed guidance incorporated into the project `AGENTS.md`. No automatic global hooks installed. [Repository](https://github.com/dietrichgebert/ponytail).
- **Graphify:** official `graphifyy` 0.9.57 package installed in `/home/husan/lock-in-tool-work/graphify-env`. A local code-only index is retained in `agent-work/tools/graphify/source/graphify-out/graph.json` (98 nodes, 292 edges at generation). Source hashes record freshness. No LLM semantic pass or API billing was used. [Repository](https://github.com/Graphify-Labs/graphify).
- **RTK:** RTK 0.48.0 is verified at `/home/husan/.local/bin/rtk`; telemetry is disabled. Download/install materials and setup notes are retained under `agent-work/tools/rtk/`. [Repository](https://github.com/rtk-ai/rtk).
- **Existing lightweight tools:** targeted ripgrep searches, Node's structured JSON processing, compact test reporters and retained logs are used instead of dumping whole files/output. No extra search framework was added.

These tools may reduce repeated reads and verbose command output. Savings depend on the task and do not change account limits. Keep failure evidence, security checks and source validation; an index is navigation help, not proof of correctness.

Graphify refresh used here:

```sh
/home/husan/lock-in-tool-work/graphify-env/bin/graphify update agent-work/tools/graphify/source --no-cluster
```

Refresh the copied source and hashes first if the application changes. The isolated Python environment is outside the source release; install `graphifyy==0.9.57` in a venv to recreate it on another machine.
