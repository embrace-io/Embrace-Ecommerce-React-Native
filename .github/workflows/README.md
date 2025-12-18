# GitHub CI/CD Workflows for Embrace Session Generation

This directory contains GitHub Actions workflows that build the React Native app and generate Embrace sessions for telemetry in the dashboard.

## Workflow Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `build.yml` | Push to main, Manual | Builds iOS app and creates reusable test artifacts |
| `ci-scheduled.yml` | Every 2 hours, Manual | Lightweight session generation (non-stitched) |
| `one-simulator.yml` | Every 2 hours (offset), Manual | Multiple sessions on same device (stitched) |

### Session Diversity Strategy

The workflows are designed to create diverse session data:

- **ci-scheduled.yml**: Runs every 2 hours, creates 1 session per run (non-stitched)
- **one-simulator.yml**: Runs every 2 hours (offset by 30 min), creates 5 sessions on the same device (stitched)

Combined, this achieves approximately 50% stitched / 50% non-stitched sessions.

### Crash Simulation

Approximately **20% of CI sessions will experience an intentional crash** to test Embrace crash reporting. This is controlled by the `ciMode: true` flag in the Embrace config written by CI workflows.

When CI mode is enabled:
- A random probability check determines if the session will crash
- If selected for crash (~20% chance), the app will crash after 20-35 seconds
- Session properties `ci_mode` and `ci_crash_scheduled` track the crash simulation state
- The crash is logged with breadcrumb `CI_CRASH_TRIGGERED` before occurring

## Setup Instructions

### 1. Add Repository Variables

Go to your GitHub repository: **Settings > Secrets and variables > Actions > Variables**

Add the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `EMBRACE_IOS_APP_ID` | Your Embrace iOS App ID | `ewbxy` |
| `EMBRACE_ANDROID_APP_ID` | Your Embrace Android App ID | `hoonf` |

### 2. Enable GitHub Actions

Make sure GitHub Actions is enabled for your repository:
**Settings > Actions > General > Allow all actions**

### 3. Trigger Initial Build

1. Go to **Actions** tab
2. Select **Build Test Artifacts** workflow
3. Click **Run workflow**

This will create the initial build artifacts that scheduled workflows can reuse.

## Workflow Details

### build.yml - Build Test Artifacts

**Triggers:**
- Push to `main` branch
- Manual dispatch

**What it does:**
1. Sets up Node.js 20 and Xcode 16.4
2. Installs npm dependencies (using published Embrace packages)
3. Configures Embrace App ID from repository variables
4. Installs CocoaPods dependencies
5. Builds the iOS app for simulator
6. Uploads build artifacts (retained for 7 days)

**Artifacts produced:**
- `test-build-artifacts` - Complete iOS build products

### ci-scheduled.yml - Scheduled Sessions (Lightweight)

**Triggers:**
- Cron: `0 */2 * * *` (every 2 hours)
- Manual dispatch

**What it does:**
1. Downloads pre-built artifacts from `build.yml` (or builds from source)
2. Boots an iPhone 16 simulator
3. Installs and launches the app
4. Runs the app for 60 seconds to generate session telemetry
5. Terminates the app to flush SDK data

**Session tagging:**
- RUN_SOURCE: `scheduled-browse`

### one-simulator.yml - Session Stitching

**Triggers:**
- Cron: `30 */2 * * *` (every 2 hours, offset by 30 min)
- Manual dispatch

**What it does:**
1. Downloads pre-built artifacts from `build.yml` (or builds from source)
2. Boots a single iPhone 16 simulator
3. Runs the app multiple times sequentially on the SAME simulator
4. Each run creates a new session with the same device IDFV
5. This enables session stitching in the Embrace dashboard

**Sessions created per run:**
- `stitched-browse`
- `stitched-cart`
- `stitched-search`
- `stitched-profile`
- `stitched-checkout`

## Scripts

### scripts/run-multiple-sessions.sh

Helper script used by `one-simulator.yml` to run multiple app sessions on the same simulator.

**Usage:**
```bash
SIMULATOR_UDID=<udid> ./scripts/run-multiple-sessions.sh
```

**Environment variables:**
- `SIMULATOR_UDID` (required) - The simulator UDID
- `SESSION_DURATION` (default: 45) - Seconds to run each session
- `NUM_SESSIONS` (default: 5) - Number of sessions to create

## Monitoring Sessions

After workflows run, check the Embrace dashboard at https://dash.embrace.io to see:

1. **Sessions** - Each workflow run creates 1+ sessions
2. **Session Properties** - Look for `RUN_SOURCE` to identify CI sessions
3. **Session Stitching** - Sessions from `one-simulator.yml` will be stitched together

## Troubleshooting

### Build fails with "APP_ID variable not found"

Make sure you've added `EMBRACE_IOS_APP_ID` to repository variables:
**Settings > Secrets and variables > Actions > Variables**

### No artifacts available for scheduled runs

The scheduled workflows try to download artifacts from the last successful `build.yml` run. If no successful builds exist:
1. Manually trigger `build.yml`
2. Wait for it to complete successfully
3. The next scheduled run will use those artifacts

### Simulator not found

The workflows default to iPhone 16. If your macOS runner doesn't have this simulator:
- The workflow will fallback to any available iPhone simulator
- You can modify `DEVICE_NAME` in the workflow file

## Customization

### Change session duration

Edit `SESSION_DURATION` in `ci-scheduled.yml` or `one-simulator.yml`:
```yaml
env:
  SESSION_DURATION: 90  # seconds
```

### Add more devices (matrix testing)

Create a new workflow similar to the native iOS `ci-full-matrix.yml` with a device matrix:
```yaml
strategy:
  matrix:
    device:
      - "iPhone 16"
      - "iPhone 16 Pro"
      - "iPhone SE (3rd generation)"
```

### Add Detox E2E tests

For more sophisticated session generation with actual UI interactions:
1. Add Detox to your project: `npm install detox --save-dev`
2. Create Detox test files
3. Update workflows to run Detox tests instead of just launching the app
