# RTK setup record

- Official repository: https://github.com/rtk-ai/rtk (`develop` is the repository default branch; installer follows the official release endpoint).
- Existing executable was already the correct Rust Token Killer: `/home/husan/.local/bin/rtk`, version `0.48.0`.
- Official latest release metadata verified as `v0.48.0` on 2026-09-09.
- No installer overwrite was needed because the verified correct version was already present.
- Telemetry was explicitly disabled with:

  `/home/husan/.local/bin/rtk telemetry disable`

- Telemetry status verified: `consent: no`, `enabled: no`.
- Persisted RTK config: `/home/husan/.config/rtk/config.toml`.
- RTK local history created/updated at `/home/husan/.local/share/rtk/history.db`.
- Compact verification command:

  `/home/husan/.local/bin/rtk ls /home/husan/lock-in-tool-work/rtk`

  It listed the downloaded README, installer, repository metadata, and this setup record.

## Downloaded official files

- `README.md`
- `INSTALL.md`
- `install.sh`
- `contents.json`
- `repo.json`
- `latest-release.json`

No Codex global configuration, hooks, or Site checkout were modified.

## Effective RTK limits

From `/home/husan/.config/rtk/config.toml`:

- tracking history: 90 days
- grep output: 200 results total, 25 per file
- status output: 15 files, 10 untracked files
- passthrough output: 2000 characters
- tee recovery: failures mode, 20 files, 1 MiB per file
