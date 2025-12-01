"""
Stop running training process (if needed)
"""

import subprocess
import sys

def stop_training():
    """Stop Python training processes"""
    print("=" * 60)
    print("Stopping Training Process")
    print("=" * 60)
    
    try:
        # Find Python processes running finetune_llm.py
        result = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq python.exe", "/FO", "CSV"],
            capture_output=True,
            text=True
        )
        
        if "finetune" in result.stdout.lower():
            print("Found training process(es)")
            print("\nTo stop training:")
            print("1. Open Task Manager (Ctrl+Shift+Esc)")
            print("2. Find 'python.exe' processes")
            print("3. End the process running finetune_llm.py")
            print("\nOr use PowerShell:")
            print("  Get-Process python | Where-Object {$_.Path -like '*python*'} | Stop-Process")
        else:
            print("No training processes found running")
            
    except Exception as e:
        print(f"Error: {e}")
        print("\nTo stop training manually:")
        print("1. Open Task Manager (Ctrl+Shift+Esc)")
        print("2. Find and end 'python.exe' processes")
        print("3. Or close the minimized window if visible")

if __name__ == "__main__":
    stop_training()

