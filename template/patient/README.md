# Patient template scaffold

**This is the empty template** for the personal-overlay pattern described in [`../../PLAYBOOK.md`](../../PLAYBOOK.md). Copy this entire `patient/` directory into the root of your **private** repo (the one that consumes meicepro-analyzer as a submodule) and start populating it with your own data.

## Setup

```sh
# from the root of your private overlay repo (after adding meicepro/ submodule):
cp -R meicepro/template/patient ./patient
```

Then start filling in:

- [`synopsis.md`](synopsis.md) — narrative spine
- [`profile.md`](profile.md) — demographics, identifiers
- [`medical-history.md`](medical-history.md) — relevant history
- [`blood-tests/`](blood-tests/) — one MD per panel (date-prefixed)
- [`scans/`](scans/) — one folder per Meicepro scan
- [`findings/`](findings/) — analytical outputs
- [`treatment/`](treatment/) — treatment plan
- [`outcomes/`](outcomes/) — procedure outcomes (initially empty)
- [`correspondence/`](correspondence/) — clinic comms (initially empty)

Workflows for each are in [`../../PLAYBOOK.md`](../../PLAYBOOK.md).

## Reminder

Everything in your `patient/` folder is PII. Keep it in a **private** repository only. The submodule mechanism makes this structurally easy: your `patient/` lives in your private repo; the public analyzer lives in `meicepro/` and is read-only from your overlay's perspective.
