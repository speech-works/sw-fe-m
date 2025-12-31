#!/bin/bash
# Close any running emulators
echo "Stopping any running emulators..."
adb emu kill 2>/dev/null || true

# Wait a moment
sleep 2

# Start the emulator with Google DNS
echo "Starting Android Emulator 'Medium_Phone' with Google DNS (8.8.8.8)..."
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone -dns-server 8.8.8.8 &
