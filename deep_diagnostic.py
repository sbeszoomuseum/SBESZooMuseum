#!/usr/bin/env python3
"""
Deep diagnostic - Check exactly what's happening with thumbnails
"""

import asyncio
import os
from motor.motor_asyncio import AsyncClient
import json

async def deep_diagnostic():
    """Complete diagnostic of thumbnail storage and retrieval"""
    
    mongo_url = os.environ.get('MONGODB_URL', 'mongodb://localhost:27017')
    client = AsyncClient(mongo_url)
    db = client['biomuseum']
    
    try:
        videos_collection = db['biotube_videos']
        
        # Get all videos
        videos = await videos_collection.find({}).to_list(None)
        
        print("\n" + "="*80)
        print("DEEP THUMBNAIL DIAGNOSTIC")
        print("="*80 + "\n")
        
        if not videos:
            print("❌ NO VIDEOS FOUND IN DATABASE!\n")
            return
        
        print(f"Total videos in database: {len(videos)}\n")
        
        for idx, video in enumerate(videos, 1):
            print(f"Video #{idx}")
            print(f"├─ Title: {video.get('title', 'N/A')}")
            print(f"├─ ID: {video.get('id', 'N/A')}")
            print(f"├─ YouTube URL: {video.get('youtube_url', 'MISSING')}")
            
            # Check thumbnail_url field
            thumb = video.get('thumbnail_url')
            print(f"├─ thumbnail_url exists: {('thumbnail_url' in video)}")
            print(f"├─ thumbnail_url value: {repr(thumb)}")
            print(f"├─ thumbnail_url type: {type(thumb).__name__}")
            print(f"├─ thumbnail_url length: {len(thumb) if isinstance(thumb, str) else 'N/A'}")
            
            # Check QR code
            qr = video.get('qr_code')
            print(f"├─ qr_code exists: {('qr_code' in video)}")
            print(f"├─ qr_code starts with 'data:image': {(qr.startswith('data:image') if qr else False)}")
            
            # Validation
            if thumb:
                if isinstance(thumb, str) and thumb.startswith('http'):
                    print(f"├─ Status: ✓ VALID - Starts with http")
                elif isinstance(thumb, str) and thumb.startswith('data:image'):
                    print(f"├─ Status: ⚠ DATA URI - Embedded as base64")
                elif thumb == '':
                    print(f"├─ Status: ❌ EMPTY STRING")
                else:
                    print(f"├─ Status: ❌ INVALID - Doesn't start with http or data:")
            else:
                print(f"├─ Status: ❌ NULL/MISSING")
            
            print()
        
        # Summary
        with_thumb = sum(1 for v in videos if v.get('thumbnail_url'))
        valid_thumb = sum(1 for v in videos if isinstance(v.get('thumbnail_url'), str) and v.get('thumbnail_url', '').startswith(('http', 'data:')))
        empty_thumb = sum(1 for v in videos if v.get('thumbnail_url') == '')
        missing_thumb = sum(1 for v in videos if 'thumbnail_url' not in v)
        
        print("="*80)
        print("SUMMARY")
        print("="*80)
        print(f"Total videos: {len(videos)}")
        print(f"  ✓ With valid thumbnails: {valid_thumb}")
        print(f"  ⚠ With empty string: {empty_thumb}")
        print(f"  ❌ Missing field entirely: {missing_thumb}")
        print(f"  ⚠ At least has thumbnail field: {with_thumb}\n")
        
        # Check if problem is in database or in code
        if empty_thumb > 0:
            print("⚠️  PROBLEM FOUND: Videos have thumbnail_url field but it's empty!")
            print("   This means the backend is NOT auto-generating YouTube thumbnails")
            print("   Check backend/server.py line 1528\n")
        
        if missing_thumb > 0:
            print("⚠️  PROBLEM FOUND: Videos missing thumbnail_url field entirely!")
            print("   This means older videos don't have the field")
            print("   Run: python fix_thumbnails.py\n")
        
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(deep_diagnostic())
