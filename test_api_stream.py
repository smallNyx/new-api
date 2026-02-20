import requests
import json
import sys
import warnings

# Suppress InsecureRequestWarning
from requests.packages.urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

def read_config(file_path):
    with open(file_path, 'r') as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]
    
    if len(lines) < 3:
        # Try to handle if there are empty lines or different format
        # Filter out empty lines first
        lines = [l for l in lines if l]
        if len(lines) < 3:
            print(f"Error: {file_path} format unexpected. Expected API Key, URL, Model.")
            sys.exit(1)
            
    api_key = lines[0]
    base_url = lines[1]
    model = lines[2]
    
    # Ensure base_url ends with /v1 or handle it properly if it's full endpoint
    if not base_url.endswith('/v1'):
        base_url = base_url.rstrip('/') + '/v1'
        
    return api_key, base_url, model

def test_stream():
    # Hardcoded parameters for testing
    api_key = "sk-6jc6raTxAD0eqMg9IvRRhb7T4kUG6d7Otw1lXWdpSceLD8eO"
    base_url = "https://api.aikeyflow.net"
    model = "Pro/zai-org/GLM-4.7"
    
    # Ensure base_url ends with /v1 like read_config() does
    if not base_url.endswith('/v1'):
        base_url = base_url.rstrip('/') + '/v1'

    print(f"Testing API with:")
    print(f"URL: {base_url}")
    print(f"Model: {model}")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    data = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": "Hello, verify stream works with OpenAI format."
            }
        ],
        "stream": True,
        "temperature": 0.7,
        "max_tokens": 100
    }
    
    url = f"{base_url}/chat/completions"
    
    try:
        print(f"\nSending request to {url}...")
        # Added verify=False to bypass SSL verification issues if any
        response = requests.post(url, headers=headers, json=data, stream=True, verify=False)
        
        if response.status_code != 200:
            print(f"Error: Status Code {response.status_code}")
            try:
                print(response.json())
            except:
                print(response.text)
            return

        print("\nStreaming response:")
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        # Debug: print raw response lines
        raw_lines = []
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                raw_lines.append(line_str)
                print(f"RAW: {line_str}")  # Debug output
                if line_str.startswith("data: "):
                    if line_str.strip() == "data: [DONE]":
                        print("\n[Stream finished]")
                        break
                    try:
                        json_str = line_str[6:]  # Remove "data: " prefix
                        chunk = json.loads(json_str)
                        if "choices" in chunk and len(chunk["choices"]) > 0:
                            delta = chunk["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                print(content, end='', flush=True)
                    except json.JSONDecodeError:
                        print(f"\nFailed to parse JSON: {line_str}")
                else:
                    # Keep-alive or other lines
                    print(f"OTHER: {line_str}")  # Debug other lines
        print("\n\nTest completed successfully.")
        
    except requests.exceptions.SSLError as e:
        print(f"\nSSL Error: {e}")
    except Exception as e:
        print(f"\nException occurred: {e}")

if __name__ == "__main__":
    test_stream()
