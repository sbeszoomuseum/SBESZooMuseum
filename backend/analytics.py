"""
Analytics Dashboard System
Provides insights into platform usage and engagement
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import Counter
import pytz

# IST Timezone Configuration
IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    """Get current time in IST (Indian Standard Time) UTC+5:30"""
    return datetime.now(IST).isoformat()

class AnalyticsEngine:
    """Generate analytics data for dashboards"""
    
    @staticmethod
    def get_trending_organisms(organisms: List[Dict], limit: int = 10) -> List[Dict]:
        """Get most viewed/interacted organisms"""
        # Sort by interaction count or views
        sorted_organisms = sorted(
            organisms,
            key=lambda x: x.get('view_count', 0) + x.get('comment_count', 0),
            reverse=True
        )
        
        return [
            {
                "organism_name": org.get('organism_name'),
                "view_count": org.get('view_count', 0),
                "comment_count": org.get('comment_count', 0),
                "total_interactions": org.get('view_count', 0) + org.get('comment_count', 0),
                "image_count": len(org.get('images', []))
            }
            for org in sorted_organisms[:limit]
        ]
    
    @staticmethod
    def get_video_analytics(videos: List[Dict], limit: int = 10) -> List[Dict]:
        """Get video performance metrics"""
        video_stats = []
        
        for video in videos:
            video_stats.append({
                "video_title": video.get('video_title'),
                "kingdom": video.get('kingdom'),
                "views": video.get('view_count', 0),
                "comments": video.get('comment_count', 0),
                "created_at": video.get('created_at'),
                "added_by": video.get('added_by', 'N/A'),
                "engagement_rate": (video.get('comment_count', 0) / max(1, video.get('view_count', 1))) * 100
            })
        
        return sorted(video_stats, key=lambda x: x['views'], reverse=True)[:limit]
    
    @staticmethod
    def get_user_engagement(suggestions: List[Dict], limit: int = 20) -> List[Dict]:
        """Get top contributors"""
        user_stats = {}
        
        for suggestion in suggestions:
            user = suggestion.get('user_name', 'Unknown')
            if user not in user_stats:
                user_stats[user] = {
                    "user_name": user,
                    "total_suggestions": 0,
                    "approved": 0,
                    "pending": 0,
                    "dismissed": 0
                }
            
            user_stats[user]['total_suggestions'] += 1
            status = suggestion.get('status', 'pending')
            if status == 'approved' or status == 'added':
                user_stats[user]['approved'] += 1
            elif status == 'pending':
                user_stats[user]['pending'] += 1
            elif status == 'dismissed' or status == 'rejected':
                user_stats[user]['dismissed'] += 1
        
        return sorted(
            list(user_stats.values()),
            key=lambda x: x['total_suggestions'],
            reverse=True
        )[:limit]
    
    @staticmethod
    def get_platform_stats(
        organisms: List[Dict],
        videos: List[Dict],
        suggestions: List[Dict]
    ) -> Dict:
        """Get overall platform statistics"""
        
        pending_suggestions = len([s for s in suggestions if s.get('status') == 'pending'])
        approved_suggestions = len([s for s in suggestions if s.get('status') in ['approved', 'added']])
        
        return {
            "total_organisms": len(organisms),
            "total_videos": len(videos),
            "total_suggestions": len(suggestions),
            "pending_suggestions": pending_suggestions,
            "approved_suggestions": approved_suggestions,
            "unique_contributors": len(set(s.get('user_name') for s in suggestions)),
            "total_organism_images": sum(len(org.get('images', [])) for org in organisms),
            "average_comments_per_video": (
                sum(v.get('comment_count', 0) for v in videos) / max(1, len(videos))
            ),
            "suggestion_approval_rate": (
                approved_suggestions / max(1, len(suggestions)) * 100
            )
        }
    
    @staticmethod
    def get_growth_trends(organisms: List[Dict], videos: List[Dict], days: int = 30) -> Dict:
        """Get growth trends over time"""
        cutoff_date = (datetime.now(IST) - timedelta(days=days)).isoformat()
        
        recent_organisms = [o for o in organisms if o.get('created_at', '') > cutoff_date]
        recent_videos = [v for v in videos if v.get('created_at', '') > cutoff_date]
        
        return {
            "period_days": days,
            "new_organisms": len(recent_organisms),
            "new_videos": len(recent_videos),
            "daily_average_organisms": len(recent_organisms) / max(1, days),
            "daily_average_videos": len(recent_videos) / max(1, days)
        }
    
    @staticmethod
    def get_search_analytics(search_history: List[Dict]) -> Dict:
        """Get search behavior analytics"""
        if not search_history:
            return {
                "total_searches": 0,
                "unique_search_terms": 0,
                "popular_filters": [],
                "trending_searches": []
            }
        
        search_terms = [s.get('search_term', '') for s in search_history]
        filters_used = [s.get('filters_used', {}) for s in search_history]
        
        # Count filter usage
        filter_usage = {}
        for filters in filters_used:
            for filter_key, filter_val in filters.items():
                if filter_val:
                    filter_usage[filter_key] = filter_usage.get(filter_key, 0) + 1
        
        return {
            "total_searches": len(search_history),
            "unique_search_terms": len(set(search_terms)),
            "popular_filters": sorted(
                filter_usage.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5],
            "trending_searches": Counter(search_terms).most_common(5)
        }
