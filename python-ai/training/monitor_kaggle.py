"""
Kaggle Notebook Monitor for Skillnox AI Training
=================================================
Monitors the status of your Kaggle training notebook using the Kaggle API.

Usage:
    python training/monitor_kaggle.py                    # Check status once
    python training/monitor_kaggle.py --watch             # Watch mode (checks every 5 min)
    python training/monitor_kaggle.py --watch --interval 60  # Watch every 60 seconds

Prerequisites:
    pip install kaggle
    Set up Kaggle API: https://www.kaggle.com/docs/api
    Place kaggle.json in ~/.kaggle/ (or %USERPROFILE%\\.kaggle\\ on Windows)
"""

import subprocess
import sys
import time
import json
import os
import argparse
from datetime import datetime, timedelta
from pathlib import Path


# === Configuration ===
KAGGLE_USERNAME = "surendravarikallu1"
NOTEBOOK_SLUG = "skillnox-kaggle-finetune-v2"  # Update this after creating the notebook
KERNEL_REF = f"{KAGGLE_USERNAME}/{NOTEBOOK_SLUG}"


def check_kaggle_cli():
    """Verify kaggle CLI is installed and configured."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "kaggle", "--version"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            print("❌ Kaggle CLI not working properly.")
            print("   Install: pip install kaggle")
            print("   Configure: Place kaggle.json in ~/.kaggle/")
            return False
        print(f"✅ Kaggle CLI: {result.stdout.strip()}")
        return True
    except FileNotFoundError:
        print("❌ Kaggle CLI not found. Install with: pip install kaggle")
        return False
    except Exception as e:
        print(f"❌ Error checking Kaggle CLI: {e}")
        return False


def get_kernel_status():
    """Get the status of the Kaggle kernel."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "kaggle", "kernels", "status", KERNEL_REF],
            capture_output=True, text=True, timeout=30
        )
        output = result.stdout.strip()
        stderr = result.stderr.strip()

        if result.returncode != 0:
            if "404" in stderr or "not found" in stderr.lower():
                return {"status": "NOT_FOUND", "message": f"Kernel '{KERNEL_REF}' not found"}
            return {"status": "ERROR", "message": stderr or output}

        # Parse the output
        status_info = {"raw": output}

        # Common statuses: running, complete, error, queued, cancelAcknowledged
        output_lower = output.lower()
        if "running" in output_lower:
            status_info["status"] = "RUNNING"
        elif "complete" in output_lower:
            status_info["status"] = "COMPLETE"
        elif "error" in output_lower:
            status_info["status"] = "ERROR"
        elif "queued" in output_lower:
            status_info["status"] = "QUEUED"
        elif "cancel" in output_lower:
            status_info["status"] = "CANCELLED"
        else:
            status_info["status"] = "UNKNOWN"

        status_info["message"] = output
        return status_info

    except subprocess.TimeoutExpired:
        return {"status": "TIMEOUT", "message": "API request timed out"}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


def get_kernel_output():
    """Try to get the kernel output/logs."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "kaggle", "kernels", "output", KERNEL_REF, "-p", "/tmp/kaggle_output"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return None
    except Exception:
        return None


def list_kernel_versions():
    """List recent versions of the kernel."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "kaggle", "kernels", "list", "--mine", "--search", NOTEBOOK_SLUG],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return None
    except Exception:
        return None


def format_status_display(status_info, iteration=None):
    """Format status for display."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    status_emoji = {
        "RUNNING": "🟢",
        "COMPLETE": "✅",
        "ERROR": "❌",
        "QUEUED": "⏳",
        "CANCELLED": "🚫",
        "NOT_FOUND": "❓",
        "TIMEOUT": "⏱️",
        "UNKNOWN": "❔",
    }

    emoji = status_emoji.get(status_info["status"], "❔")

    print(f"\n{'='*60}")
    if iteration:
        print(f"  📡 KAGGLE MONITOR — Check #{iteration}")
    else:
        print(f"  📡 KAGGLE MONITOR")
    print(f"{'='*60}")
    print(f"  Time:     {now}")
    print(f"  Kernel:   {KERNEL_REF}")
    print(f"  Status:   {emoji} {status_info['status']}")
    print(f"  Message:  {status_info['message']}")
    print(f"{'='*60}")

    # Action suggestions based on status
    if status_info["status"] == "RUNNING":
        print("  💡 Training is in progress. Checkpoints are saved every 500 steps.")
        print("     The model will auto-resume if the session restarts.")
    elif status_info["status"] == "COMPLETE":
        print("  🎉 Training is complete! Download your model:")
        print(f"     kaggle kernels output {KERNEL_REF} -p ./kaggle_output")
        print("     Then deploy locally with Ollama.")
    elif status_info["status"] == "ERROR":
        print("  ⚠️  Training encountered an error!")
        print("     Check the notebook output for error details:")
        print(f"     https://www.kaggle.com/code/{KERNEL_REF}")
        print("     Common issues: OOM (reduce batch size), timeout (reduce epochs)")
    elif status_info["status"] == "QUEUED":
        print("  ⏳ Notebook is queued for execution. GPUs may be in demand.")
    elif status_info["status"] == "NOT_FOUND":
        print(f"  ⚠️  Kernel not found. Update NOTEBOOK_SLUG in this script.")
        print(f"     Current: {NOTEBOOK_SLUG}")
    print()


def watch_mode(interval_seconds=300, max_checks=None):
    """Continuously monitor the kernel status."""
    print(f"\n🔄 Watch mode: checking every {interval_seconds}s")
    if max_checks:
        print(f"   Max checks: {max_checks}")
    print(f"   Press Ctrl+C to stop\n")

    check_count = 0
    last_status = None

    try:
        while True:
            check_count += 1

            if max_checks and check_count > max_checks:
                print(f"\n✋ Reached max checks ({max_checks}). Stopping.")
                break

            status = get_kernel_status()
            format_status_display(status, iteration=check_count)

            # Alert on status change
            if last_status and last_status != status["status"]:
                print(f"  🔔 STATUS CHANGED: {last_status} → {status['status']}")

                # If completed or errored, show once and exit
                if status["status"] in ("COMPLETE", "ERROR", "CANCELLED"):
                    print("  ℹ️  Terminal status reached. Stopping watch.")
                    break

            last_status = status["status"]

            # Wait for next check
            next_check = datetime.now() + timedelta(seconds=interval_seconds)
            print(f"  ⏰ Next check at: {next_check.strftime('%H:%M:%S')}")

            time.sleep(interval_seconds)

    except KeyboardInterrupt:
        print("\n\n✋ Monitoring stopped by user.")


def download_output():
    """Download the kernel output files."""
    output_dir = Path(__file__).parent.parent / "models" / "kaggle_output"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n📥 Downloading kernel output to {output_dir}...")

    try:
        result = subprocess.run(
            [sys.executable, "-m", "kaggle", "kernels", "output", KERNEL_REF, "-p", str(output_dir)],
            capture_output=True, text=True, timeout=300
        )

        if result.returncode == 0:
            print(f"✅ Output downloaded to: {output_dir}")
            # List downloaded files
            for f in output_dir.iterdir():
                size = f.stat().st_size
                if size > 1024**3:
                    print(f"   {f.name}: {size/(1024**3):.2f} GB")
                elif size > 1024**2:
                    print(f"   {f.name}: {size/(1024**2):.1f} MB")
                else:
                    print(f"   {f.name}: {size/1024:.1f} KB")
        else:
            print(f"❌ Download failed: {result.stderr}")

    except Exception as e:
        print(f"❌ Download error: {e}")


def push_notebook():
    """Push the V2 notebook to Kaggle."""
    notebook_path = Path(__file__).parent / "Skillnox_Kaggle_Finetune_V2.ipynb"

    if not notebook_path.exists():
        print(f"❌ Notebook not found: {notebook_path}")
        return

    # Create kernel metadata
    meta_dir = notebook_path.parent / "kaggle_push"
    meta_dir.mkdir(exist_ok=True)

    # Copy notebook
    import shutil
    shutil.copy2(notebook_path, meta_dir / "Skillnox_Kaggle_Finetune_V2.ipynb")

    # Create kernel-metadata.json
    metadata = {
        "id": KERNEL_REF,
        "title": "Skillnox Kaggle Finetune V2",
        "code_file": "Skillnox_Kaggle_Finetune_V2.ipynb",
        "language": "python",
        "kernel_type": "notebook",
        "is_private": True,
        "enable_gpu": True,
        "enable_internet": True,
        "dataset_sources": [f"{KAGGLE_USERNAME}/skillnox-training-data"],
        "competition_sources": [],
        "kernel_sources": [],
    }

    with open(meta_dir / "kernel-metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n📤 Pushing notebook to Kaggle as {KERNEL_REF}...")

    result = subprocess.run(
        [sys.executable, "-m", "kaggle", "kernels", "push", "-p", str(meta_dir)],
        capture_output=True, text=True, timeout=60
    )

    if result.returncode == 0:
        print(f"✅ Notebook pushed successfully!")
        print(f"   View: https://www.kaggle.com/code/{KERNEL_REF}")
    else:
        print(f"❌ Push failed: {result.stderr}")
        print(f"   stdout: {result.stdout}")

    # Cleanup
    shutil.rmtree(meta_dir)


def push_dataset():
    """Push/update the training dataset to Kaggle."""
    datasets_dir = Path(__file__).parent.parent / "datasets"
    data_file = datasets_dir / "extended_training_data.jsonl"

    if not data_file.exists():
        print(f"❌ Dataset not found: {data_file}")
        print("   Run: python training/generate_extended_dataset.py")
        return

    # Create dataset metadata
    push_dir = datasets_dir / "kaggle_push"
    push_dir.mkdir(exist_ok=True)

    import shutil
    shutil.copy2(data_file, push_dir / "extended_training_data.jsonl")

    dataset_ref = f"{KAGGLE_USERNAME}/skillnox-training-data"

    metadata = {
        "title": "Skillnox Training Data",
        "id": dataset_ref,
        "licenses": [{"name": "CC0-1.0"}],
    }

    with open(push_dir / "dataset-metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    file_size_mb = data_file.stat().st_size / (1024**2)
    print(f"\n📤 Pushing dataset ({file_size_mb:.1f} MB) to Kaggle...")
    print(f"   Dataset: {dataset_ref}")

    # Try to create new version (update)
    result = subprocess.run(
        [sys.executable, "-m", "kaggle", "datasets", "version", "-p", str(push_dir), "-m", "V2: 50k examples with aptitude, GD, coding"],
        capture_output=True, text=True, timeout=120
    )

    if result.returncode == 0:
        print(f"✅ Dataset updated successfully!")
    else:
        # Try creating new dataset
        print(f"   Update failed, trying to create new dataset...")
        result = subprocess.run(
            [sys.executable, "-m", "kaggle", "datasets", "create", "-p", str(push_dir)],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            print(f"✅ Dataset created successfully!")
        else:
            print(f"❌ Dataset push failed: {result.stderr}")

    # Cleanup
    shutil.rmtree(push_dir)


def main():
    parser = argparse.ArgumentParser(description="Monitor Kaggle training notebook")
    parser.add_argument("--watch", action="store_true", help="Watch mode: continuously check status")
    parser.add_argument("--interval", type=int, default=300, help="Check interval in seconds (default: 300)")
    parser.add_argument("--max-checks", type=int, default=None, help="Max number of checks in watch mode")
    parser.add_argument("--download", action="store_true", help="Download kernel output files")
    parser.add_argument("--push-notebook", action="store_true", help="Push notebook to Kaggle")
    parser.add_argument("--push-dataset", action="store_true", help="Push dataset to Kaggle")
    parser.add_argument("--slug", type=str, default=None, help="Override notebook slug")

    args = parser.parse_args()

    global NOTEBOOK_SLUG, KERNEL_REF
    if args.slug:
        NOTEBOOK_SLUG = args.slug
        KERNEL_REF = f"{KAGGLE_USERNAME}/{NOTEBOOK_SLUG}"

    print("🎯 Skillnox AI — Kaggle Training Monitor")
    print(f"   Kernel: {KERNEL_REF}")

    # Check Kaggle CLI
    if not check_kaggle_cli():
        sys.exit(1)

    # Handle actions
    if args.push_dataset:
        push_dataset()
        return

    if args.push_notebook:
        push_notebook()
        return

    if args.download:
        download_output()
        return

    # Status check
    if args.watch:
        watch_mode(interval_seconds=args.interval, max_checks=args.max_checks)
    else:
        status = get_kernel_status()
        format_status_display(status)


if __name__ == "__main__":
    main()
