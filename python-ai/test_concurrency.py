import asyncio
import httpx
import time
from typing import List

async def send_request(client: httpx.AsyncClient, i: int):
    start = time.perf_counter()
    try:
        # Simulate a typical interview evaluation request
        payload = {
            "answer": f"This is a test answer for concurrency test {i}. I hope the system handles this well.",
            "question": "How do you handle high load in a distributed system?"
        }
        # Assuming the service is running on port 8000
        response = await client.post("http://localhost:8000/api/answer/evaluate", json=payload, timeout=300)
        end = time.perf_counter()
        
        if response.status_code == 200:
            print(f"Request {i:2d}: SUCCESS (Status: {response.status_code}, Time: {end - start:.2f}s)")
            return True
        else:
            print(f"Request {i:2d}: FAILED  (Status: {response.status_code}, Time: {end - start:.2f}s)")
            return False
    except Exception as e:
        end = time.perf_counter()
        print(f"Request {i:2d}: ERROR   ({str(e)}, Time: {end - start:.2f}s)")
        return False

async def main():
    print("Starting Concurrency Test (50 concurrent requests)...")
    print("This will test the Semaphore(2) throttling in the Python AI Service.")
    
    async with httpx.AsyncClient() as client:
        tasks = []
        for i in range(50):
            tasks.append(send_request(client, i))
        
        start_all = time.perf_counter()
        results = await asyncio.gather(*tasks)
        end_all = time.perf_counter()
        
        success_count = sum(1 for r in results if r)
        print("\n" + "="*40)
        print(f"Test Completed in {end_all - start_all:.2f} seconds")
        print(f"Total Requests: {len(results)}")
        print(f"Successful:     {success_count}")
        print(f"Failed:         {len(results) - success_count}")
        print("="*40)

if __name__ == "__main__":
    asyncio.run(main())
