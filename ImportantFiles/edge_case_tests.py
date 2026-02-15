#!/usr/bin/env python3
"""
Edge case testing for Biology Museum API
"""

import requests
import json

BACKEND_URL = "https://biomuseum-scan.preview.emergentagent.com/api"

def test_invalid_organism_id():
    """Test with invalid organism ID"""
    print("Testing invalid organism ID...")
    response = requests.get(f"{BACKEND_URL}/organisms/invalid-id-123")
    if response.status_code == 404:
        print("✅ Correctly returns 404 for invalid organism ID")
    else:
        print(f"❌ Expected 404, got {response.status_code}")

def test_invalid_qr_code():
    """Test with invalid QR code ID"""
    print("Testing invalid QR code ID...")
    response = requests.get(f"{BACKEND_URL}/organisms/qr/invalid-qr-123")
    if response.status_code == 404:
        print("✅ Correctly returns 404 for invalid QR code")
    else:
        print(f"❌ Expected 404, got {response.status_code}")

def test_empty_search():
    """Test search with empty query"""
    print("Testing empty search query...")
    response = requests.get(f"{BACKEND_URL}/search", params={"q": ""})
    if response.status_code == 200:
        results = response.json()
        print(f"✅ Empty search returns {len(results)} results")
    else:
        print(f"❌ Empty search failed with status {response.status_code}")

def test_search_with_actual_data():
    """Test search with actual organism names"""
    print("Testing search with actual organism names...")
    
    # First get organisms to know what to search for
    response = requests.get(f"{BACKEND_URL}/organisms")
    if response.status_code == 200:
        organisms = response.json()
        if organisms:
            # Test search with first organism's name
            test_name = organisms[0]["name"].split()[0]  # First word of name
            search_response = requests.get(f"{BACKEND_URL}/search", params={"q": test_name})
            if search_response.status_code == 200:
                search_results = search_response.json()
                print(f"✅ Search for '{test_name}' returns {len(search_results)} results")
            else:
                print(f"❌ Search failed with status {search_response.status_code}")

def test_invalid_admin_credentials():
    """Test admin login with wrong credentials"""
    print("Testing invalid admin credentials...")
    
    invalid_logins = [
        {"username": "admin", "password": "wrong"},
        {"username": "wrong", "password": "adminSBES"},
        {"username": "", "password": ""},
    ]
    
    for login_data in invalid_logins:
        response = requests.post(f"{BACKEND_URL}/admin/login", json=login_data)
        if response.status_code == 401:
            print(f"✅ Correctly rejects invalid login: {login_data['username']}")
        else:
            print(f"❌ Expected 401 for invalid login, got {response.status_code}")

def test_malformed_organism_creation():
    """Test creating organism with missing required fields"""
    print("Testing malformed organism creation...")
    
    # Get admin token first
    login_response = requests.post(f"{BACKEND_URL}/admin/login", json={
        "username": "admin", 
        "password": "adminSBES"
    })
    
    if login_response.status_code != 200:
        print("❌ Could not get admin token for testing")
        return
        
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test with missing required fields
    incomplete_organism = {
        "name": "Test Only Name"
        # Missing scientific_name, classification, morphology, physiology
    }
    
    response = requests.post(f"{BACKEND_URL}/admin/organisms", 
                           json=incomplete_organism, headers=headers)
    
    if response.status_code == 422:  # Validation error
        print("✅ Correctly rejects organism with missing fields (422)")
    elif response.status_code == 400:  # Bad request
        print("✅ Correctly rejects organism with missing fields (400)")
    else:
        print(f"❌ Expected validation error, got {response.status_code}")

if __name__ == "__main__":
    print("=" * 50)
    print("EDGE CASE TESTING")
    print("=" * 50)
    
    test_invalid_organism_id()
    test_invalid_qr_code()
    test_empty_search()
    test_search_with_actual_data()
    test_invalid_admin_credentials()
    test_malformed_organism_creation()
    
    print("\nEdge case testing complete!")