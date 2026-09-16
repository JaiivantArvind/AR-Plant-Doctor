import os
import sys
import subprocess
import time
import webbrowser

# Add common Node.js directories to PATH environment variable if needed
COMMON_NODE_PATHS = [
    r"C:\Program Files\nodejs",
    r"C:\Program Files (x86)\nodejs",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\nodejs"),
    os.path.expandvars(r"%USERPROFILE%\nodejs"),
    r"C:\Users\dhanv\nodejs",
]

for p in COMMON_NODE_PATHS:
    if os.path.exists(p) and p not in os.environ.get("PATH", ""):
        os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")

def main():
    print("=" * 60)
    print("      🌿 AR Plant Doctor & Dashboard Launcher 🌿")
    print("=" * 60)
    
    # Ensure working directory is project root
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)

    # 1. Automatic dependency check (npm install)
    node_modules_dir = os.path.join(project_dir, "node_modules")
    if not os.path.exists(node_modules_dir):
        print("\n[SETUP] First-time setup detected: Installing npm dependencies...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        try:
            subprocess.run([npm_cmd, "install"], cwd=project_dir, check=True)
            print("[SETUP] Dependencies installed successfully!")
        except Exception as e:
            print(f"\n❌ Error installing dependencies: {e}")
            input("\nPress Enter to exit...")
            return

    print("\n[1/4] Checking port 3000 & Starting Express Server...")

    # Free port 3000 if occupied
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["powershell", "-NoProfile", "-Command", "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"],
                capture_output=True
            )
    except Exception:
        pass

    # Start Express server
    try:
        server_process = subprocess.Popen(["node", "server.js"], cwd=project_dir)
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        input("\nPress Enter to exit...")
        return

    # Wait for server startup
    time.sleep(2)

    print("\n[2/4] Checking HTTPS tunnel for mobile testing...")
    try:
        subprocess.Popen('start "ngrok Tunnel" cmd /k "ngrok http 3000"', shell=True)
    except Exception as e:
        print(f"  ℹ️ ngrok not launched automatically: {e}")

    ar_url = "http://localhost:3000"
    dashboard_url = "http://localhost:3000/dashboard"

    print("\n[3/4] Server & Tunnel Status:")
    print("-" * 60)
    print(f"  📱 Local AR App:   {ar_url}")
    print(f"  📊 Dashboard:      {dashboard_url}")
    print(f"  🌐 Mobile Testing: For phone camera access, use an HTTPS tunnel:")
    print(f"                     npx localtunnel --port 3000")
    print(f"                     or: npx ngrok http 3000")
    print("-" * 60)

    print("\n[4/4] Opening browser tabs...")
    try:
        webbrowser.open(dashboard_url)
        time.sleep(1)
        webbrowser.open(ar_url)
    except Exception as e:
        print(f"Could not open browser automatically: {e}")

    print("\n✅ Everything is running! Keep this window open while using the app.")
    print("   Press Ctrl+C to stop the server when finished.\n")

    try:
        server_process.wait()
    except KeyboardInterrupt:
        print("\nStopping Express server...")
        server_process.terminate()
        print("Server stopped. Goodbye!")

if __name__ == "__main__":
    main()
