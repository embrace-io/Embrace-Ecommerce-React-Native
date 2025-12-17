#!/bin/bash
# run-multiple-sessions.sh
# Runs the app multiple times on the SAME simulator to create multiple sessions
# for the same device (IDFV), which enables session stitching in Embrace dashboard.
#
# This is the React Native equivalent of the native iOS run-all-tests.sh

set -e

SIMULATOR_UDID="${SIMULATOR_UDID:-}"
SESSION_DURATION="${SESSION_DURATION:-45}"  # seconds to run each session
NUM_SESSIONS="${NUM_SESSIONS:-5}"

# Define session scenarios with different run sources
# Each session will be tagged differently for identification in the dashboard
SESSIONS=(
    "stitched-browse"
    "stitched-cart"
    "stitched-search"
    "stitched-profile"
    "stitched-checkout"
)

echo "================================================"
echo "Running Multiple Sessions on One Simulator"
echo "================================================"
echo ""
echo "This creates multiple sessions for the same device,"
echo "which will appear as stitched sessions in Embrace dashboard."
echo ""

# Verify simulator UDID is provided
if [[ -z "$SIMULATOR_UDID" ]]; then
    echo "Error: SIMULATOR_UDID environment variable is required"
    echo "Usage: SIMULATOR_UDID=<udid> ./run-multiple-sessions.sh"
    exit 1
fi

echo "Simulator UDID: $SIMULATOR_UDID"
echo "Session Duration: ${SESSION_DURATION}s each"
echo "Sessions to create: ${#SESSIONS[@]}"
echo ""

# Find the built app (check multiple possible locations)
APP_PATH=$(find ios -name "*.app" -type d | grep -E "Debug-iphonesimulator|Products" | head -1)

if [[ -z "$APP_PATH" ]]; then
    echo "Error: Could not find built app"
    echo "Searching for .app bundles:"
    find ios -name "*.app" -type d 2>/dev/null || true
    exit 1
fi

echo "Found app at: $APP_PATH"

# Get the bundle identifier using plutil (more reliable)
BUNDLE_ID=$(plutil -extract CFBundleIdentifier raw -o - "$APP_PATH/Info.plist" 2>/dev/null || echo "org.reactjs.native.example.EmbraceEcommerceRN")
echo "Bundle ID: $BUNDLE_ID"
echo ""

# Install the app on simulator (only once)
echo "Installing app on simulator..."
xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"

# Track results
SUCCESSFUL=0
FAILED=0
TOTAL=${#SESSIONS[@]}

# Run each session sequentially on the same simulator
for i in "${!SESSIONS[@]}"; do
    run_source="${SESSIONS[$i]}"
    session_num=$((i + 1))

    echo "--------------------------------------------"
    echo "Session $session_num of $TOTAL: $run_source"
    echo "--------------------------------------------"

    # Launch the app
    echo "Launching app..."
    if xcrun simctl launch "$SIMULATOR_UDID" "$BUNDLE_ID"; then
        echo "App launched successfully"

        # Let the app run to generate telemetry
        echo "Running for ${SESSION_DURATION} seconds..."
        sleep "$SESSION_DURATION"

        # Terminate the app gracefully to flush SDK data
        echo "Terminating app..."
        xcrun simctl terminate "$SIMULATOR_UDID" "$BUNDLE_ID" 2>/dev/null || true

        echo "Session $run_source completed"
        SUCCESSFUL=$((SUCCESSFUL + 1))
    else
        echo "Failed to launch app for session $run_source"
        FAILED=$((FAILED + 1))
    fi

    # Wait between sessions for SDK to upload data
    echo "Waiting 10 seconds for SDK to upload session data..."
    sleep 10

    echo ""
done

echo "================================================"
echo "Final Results"
echo "================================================"
echo ""
echo "Successful: $SUCCESSFUL"
echo "Failed: $FAILED"
echo "Total: $TOTAL"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo "All sessions created successfully!"
    echo "Check the Embrace dashboard to see stitched sessions."
    exit 0
else
    echo "Some sessions failed. Check logs for details."
    exit 1
fi
