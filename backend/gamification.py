"""
Gamification System
Awards points and badges to users for their contributions
"""

from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import uuid
import pytz

# IST Timezone Configuration
IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    """Get current time in IST (Indian Standard Time) UTC+5:30"""
    return datetime.now(IST).isoformat()

class UserStats(BaseModel):
    """User gamification statistics"""
    id: str = None
    user_name: str
    points: int = 0
    total_submissions: int = 0
    verified_submissions: int = 0
    badges: List[str] = []
    level: int = 1
    created_at: str = None
    updated_at: str = None
    
    def __init__(self, **data):
        if not data.get('id'):
            data['id'] = str(uuid.uuid4())
        if not data.get('created_at'):
            data['created_at'] = get_ist_now()
        if not data.get('updated_at'):
            data['updated_at'] = get_ist_now()
        super().__init__(**data)
    
    def dict(self):
        return {
            "id": self.id,
            "user_name": self.user_name,
            "points": self.points,
            "total_submissions": self.total_submissions,
            "verified_submissions": self.verified_submissions,
            "badges": self.badges,
            "level": self.level,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class Badge:
    """Badge definitions and criteria"""
    
    BADGES = {
        "first_submission": {
            "name": "First Step",
            "description": "Made your first suggestion",
            "icon": "🌱",
            "criteria": lambda stats: stats['total_submissions'] >= 1
        },
        "10_submissions": {
            "name": "Active Contributor",
            "description": "Made 10 suggestions",
            "icon": "⭐",
            "criteria": lambda stats: stats['total_submissions'] >= 10
        },
        "25_submissions": {
            "name": "Super Contributor",
            "description": "Made 25 suggestions",
            "icon": "🌟",
            "criteria": lambda stats: stats['total_submissions'] >= 25
        },
        "50_submissions": {
            "name": "Legend",
            "description": "Made 50 suggestions",
            "icon": "👑",
            "criteria": lambda stats: stats['total_submissions'] >= 50
        },
        "verified_master": {
            "name": "Verified Master",
            "description": "Got 10 suggestions verified",
            "icon": "✅",
            "criteria": lambda stats: stats['verified_submissions'] >= 10
        },
        "100_points": {
            "name": "Point Collector",
            "description": "Earned 100 points",
            "icon": "💎",
            "criteria": lambda stats: stats['points'] >= 100
        },
        "500_points": {
            "name": "Master Mind",
            "description": "Earned 500 points",
            "icon": "🧠",
            "criteria": lambda stats: stats['points'] >= 500
        }
    }
    
    @staticmethod
    def check_new_badges(stats: dict) -> List[str]:
        """Check which new badges user should get"""
        new_badges = []
        for badge_id, badge_info in Badge.BADGES.items():
            if badge_info['criteria'](stats) and badge_id not in stats.get('badges', []):
                new_badges.append(badge_id)
        return new_badges
    
    @staticmethod
    def get_badge_info(badge_id: str) -> Optional[dict]:
        """Get badge information"""
        return Badge.BADGES.get(badge_id)
    
    @staticmethod
    def get_all_badges() -> dict:
        """Get all available badges"""
        return Badge.BADGES


def calculate_level(points: int) -> int:
    """Calculate user level based on points"""
    if points < 100:
        return 1
    elif points < 250:
        return 2
    elif points < 500:
        return 3
    elif points < 1000:
        return 4
    elif points < 2000:
        return 5
    else:
        return 6


def get_points_for_action(action: str) -> int:
    """Get points awarded for different actions"""
    points_map = {
        "organism_suggestion": 5,
        "video_suggestion": 5,
        "verified_organism": 15,
        "verified_video": 15,
        "suggestion_approved": 10
    }
    return points_map.get(action, 0)
