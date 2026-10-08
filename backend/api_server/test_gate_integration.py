import os
import sys
from pathlib import Path
import asyncio

here = Path(__file__).parent.resolve()
sys.path.append(str(here))

import main
from fastapi.testclient import TestClient

def run_integration_tests():
    print("=" * 60)
    print("TESTING FASTAPI INFERENCE SERVER WITH MOBILENETV4 GATE")
    print("=" * 60)
    
    with TestClient(main.app) as client:
        # 1. Health check
        res_health = client.get("/health")
        print("\n[Health Check]:", res_health.json())
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "ok"
        assert "gate" in res_health.json()
        assert res_health.json()["gate"] in ("onnx", "missing")
        
        # 2. Date Image Test
        date_dir = Path(r"d:\k230808\data\no_class_dataset\test\dates")
        date_files = list(date_dir.glob("*.jpg"))
        if date_files:
            test_date_file = date_files[0]
            print(f"\n[Testing Date Image]: {test_date_file.name}")
            with open(test_date_file, "rb") as f:
                res_date = client.post("/classify", files={"image": (test_date_file.name, f, "image/jpeg")})
            
            print("Response:", res_date.json())
            assert res_date.status_code == 200
            data = res_date.json()
            assert data["is_date"] is True, f"Expected is_date=True, got {data}"
            assert data["variety"] in main.CLASS_NAMES, f"Invalid variety {data['variety']}"
            print(">>> DATE TEST PASSED!")
            
        # 3. Non-Date Image Test
        nondate_dir = Path(r"d:\k230808\data\no_class_dataset\test\non_dates")
        nondate_files = list(nondate_dir.rglob("*.jpg"))
        if nondate_files:
            test_nondate_file = nondate_files[0]
            print(f"\n[Testing Non-Date Image]: {test_nondate_file.name}")
            with open(test_nondate_file, "rb") as f:
                res_nondate = client.post("/classify", files={"image": (test_nondate_file.name, f, "image/jpeg")})
                
            print("Response:", res_nondate.json())
            assert res_nondate.status_code == 200
            data = res_nondate.json()
            assert data["is_date"] is False, f"Expected is_date=False, got {data}"
            assert data["variety"] is None, f"Expected variety=None, got {data['variety']}"
            assert "Please Enter a Correct Date Image" in data["message"], f"Unexpected message: {data['message']}"
            print(">>> NON-DATE REJECTION TEST PASSED!")
            
        print("\n" + "=" * 60)
        print("ALL FASTAPI GATE INTEGRATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 60)

if __name__ == "__main__":
    run_integration_tests()
