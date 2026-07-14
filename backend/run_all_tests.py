import subprocess
import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def run_test_script(script_name):
    print(f"\nRunning {script_name}...")
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    
    # Run python inside the virtual environment
    python_exe = os.path.join(".", "venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = "python"
        
    result = subprocess.run(
        [python_exe, script_name],
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8"
    )
    
    print(result.stdout)
    if result.stderr:
        print(f"Errors/StdErr from {script_name}:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        
    return result.returncode == 0

def main():
    test_scripts = [
        "test_phase2.py",
        "test_phase3.py",
        "test_phase4.py",
        "test_phase5.py",
        "test_phase6.py",
        "test_phase7.py",
        "test_smart_meetings.py",
        "test_github_endpoint.py",
        "test_monday_endpoint.py",
        "test_google_docs_endpoint.py",
        "test_google_analytics_endpoint.py",
        "test_trello_integration.py"
    ]
    
    results = {}
    print("====================================================")
    print("FounDesk Multi-Phase Test Verification Runner")
    print("====================================================\n")
    
    for script in test_scripts:
        if os.path.exists(script):
            success = run_test_script(script)
            results[script] = "PASS" if success else "FAIL"
        else:
            results[script] = "NOT FOUND"
            print(f"Warning: {script} not found in backend directory.")
            
    print("\n====================================================")
    print("Final Verification Summary Report")
    print("====================================================")
    all_passed = True
    for script, status in results.items():
        print(f"{script:<20}: {status}")
        if status != "PASS":
            all_passed = False
            
    if all_passed:
        print("\nAll verification suites passed successfully! [SUCCESS]")
        sys.exit(0)
    else:
        print("\nSome verification suites failed. Please check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
