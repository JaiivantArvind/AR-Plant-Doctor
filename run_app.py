import os
import sys
import subprocess
import time
import webbrowser

# Add Node.js directory to PATH environment variable if needed
NODE_PATH = r"C:\Users\dhanv\nodejs"
if NODE_PATH not in os.environ.get("PATH", ""):
    os.environ["PATH"] = NODE_PATH + os.pathsep + os.environ.get("PATH", "")

def main():
    print("=" * 60)
    print("      🌿 AR Plant Doctor & Dashboard Launcher 🌿")
    print("=" * 60)
    
    # Ensure working directory is project root
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)

    print("\n[1/4] Checking port 3000 & Starting Express Server...")

    # Free port 3000 if occupied
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["powershell", "-Command", "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"],
                capture_output=True
            )
    except Exception:
        pass

    # Determine node executable path
    node_exe = os.path.join(NODE_PATH, "node.exe")
    node_cmd = node_exe if os.path.exists(node_exe) else "node"

    try:
        server_process = subprocess.Popen([node_cmd, "server.js"], cwd=project_dir)
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        input("\nPress Enter to exit...")
        return

    # Wait for server startup
    time.sleep(2)

    print("\n[2/4] Launching ngrok HTTPS tunnel in a new terminal window...")
    try:
        ngrok_cmd = os.path.join(NODE_PATH, "ngrok.cmd")
        if not os.path.exists(ngrok_cmd):
            ngrok_cmd = "ngrok"
        subprocess.Popen(f'start "ngrok Tunnel" cmd /k "{ngrok_cmd} http 3000"', shell=True)
    except Exception as e:
        print(f"  ⚠️ Could not launch ngrok automatically: {e}")

    ar_url = "http://localhost:3000"
    dashboard_url = "http://localhost:3000/dashboard"

    print("\n[3/4] Server & Tunnel Status:")
    print("-" * 60)
    print(f"  📱 Local AR App:   {ar_url}")
    print(f"  📊 Dashboard:      {dashboard_url}")
    print(f"  🌐 Mobile Testing: Check the HTTPS URL in the 'ngrok Tunnel' window!")
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
