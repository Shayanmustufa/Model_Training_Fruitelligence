import sys
print("Python:", sys.version)
try:
    import torch
    print("torch:", torch.__version__)
except ImportError:
    print("torch: NOT INSTALLED")
try:
    import fastapi
    print("fastapi:", fastapi.__version__)
except ImportError:
    print("fastapi: NOT INSTALLED")
try:
    import uvicorn
    print("uvicorn: OK")
except ImportError:
    print("uvicorn: NOT INSTALLED")
