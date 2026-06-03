import re
import os
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
from prepare_chromadb import store_embeddings
from embeddings import convert_chunks_to_vectors

def get_video_id(url):
    """Extract the video ID from a YouTube URL."""
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"embed\/([0-9A-Za-z_-]{11})",
        r"shorts\/([0-9A-Za-z_-]{11})"
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_video_metadata(url):
    """Get video title and other metadata using yt-dlp."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            return {
                'title': info.get('title', 'Unknown YouTube Video'),
                'author': info.get('uploader', 'Unknown'),
            }
        except Exception as e:
            print(f"Error fetching metadata: {e}")
            return {
                'title': 'YouTube Video',
                'author': 'Unknown',
            }

class SubtitleSegment:
    def __init__(self, text, start):
        self.text = text
        self.start = start

def get_transcript_via_ytdlp_json3(url):
    """Fallback method using yt-dlp to extract the JSON3 timedtext subtitle URL and download it."""
    import requests
    
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
        subtitles = info.get('subtitles', {}) or {}
        auto_captions = info.get('automatic_captions', {}) or {}
        
        en_subs = subtitles.get('en', []) or subtitles.get('en-US', []) or []
        if not en_subs:
            for lang in subtitles:
                if lang.startswith('en'):
                    en_subs = subtitles[lang]
                    break
                    
        if not en_subs:
            en_subs = auto_captions.get('en', []) or auto_captions.get('en-US', []) or []
            if not en_subs:
                for lang in auto_captions:
                    if lang.startswith('en'):
                        en_subs = auto_captions[lang]
                        break
                        
        if not en_subs:
            for lang in auto_captions:
                en_subs = auto_captions[lang]
                break
                
        if not en_subs:
            raise RuntimeError("No English or fallback subtitles found in yt-dlp metadata.")
            
        json3_url = next((s['url'] for s in en_subs if s.get('ext') == 'json3'), None)
        if not json3_url:
            raise RuntimeError(f"No json3 format URL found in subtitles metadata. Available: {[s.get('ext') for s in en_subs]}")
            
        response = requests.get(json3_url, timeout=10)
        if response.status_code != 200:
            raise RuntimeError(f"Failed to fetch json3 subtitles from URL, status code: {response.status_code}")
            
        data = response.json()
        events = data.get('events', [])
        
        transcript = []
        for event in events:
            segs = event.get('segs', [])
            if not segs:
                continue
                
            text = "".join(s.get('utf8', '') for s in segs).strip()
            text = re.sub(r'\s+', ' ', text).strip()
            
            if not text or text == '\n':
                continue
                
            start_ms = event.get('tStartMs', 0)
            start_sec = start_ms / 1000.0
            
            if not transcript or transcript[-1]["text"] != text:
                transcript.append({
                    "text": text,
                    "start": start_sec
                })
                
        return [SubtitleSegment(item["text"], item["start"]) for item in transcript]
        
    except Exception as e:
        print(f"Fallback yt-dlp json3 extraction failed: {e}")
        raise e

def process_youtube_link(url, document_id=None):
    """Fetch transcript, embed, and store in ChromaDB."""
    video_id = get_video_id(url)
    if not video_id:
        print(f"Invalid YouTube URL: {url}")
        return None
    
    if not document_id:
        document_id = f"yt_{video_id}"
        
    print(f"Processing YouTube video: {video_id}")
    
    try:
        # Get metadata
        metadata = get_video_metadata(url)
        video_title = metadata['title']
        
        # Get transcript (try YouTubeTranscriptApi first, then fallback)
        transcript_list = None
        try:
            ytt_api = YouTubeTranscriptApi()
            transcript_list = ytt_api.fetch(video_id)
        except Exception as e:
            print(f"YouTubeTranscriptApi failed: {e}. Trying fallback via yt-dlp json3...")
            
        if not transcript_list:
            transcript_list = get_transcript_via_ytdlp_json3(url)
            
        if not transcript_list:
            raise RuntimeError("Could not retrieve captions/transcript from YouTube video. Please ensure captions are enabled on the video.")
        
        # Combine segments into chunks of roughly 1000 characters
        # We'll preserve timestamps in metadata if possible
        full_text = ""
        chunks = []
        current_chunk_text = ""
        current_start_time = 0
        
        for segment in transcript_list:
            text = segment.text
            start = segment.start
            
            if len(current_chunk_text) + len(text) > 1000:
                chunks.append({
                    "text": current_chunk_text.strip(),
                    "pages": int(current_start_time), # Using timestamp as "page"
                    "chunk_id": len(chunks)
                })
                current_chunk_text = ""
                current_start_time = start
            
            current_chunk_text += " " + text
            
        # Add last chunk
        if current_chunk_text:
            chunks.append({
                "text": current_chunk_text.strip(),
                "pages": int(current_start_time),
                "chunk_id": len(chunks)
            })
            
        if not chunks:
            print("No transcript content found.")
            return None
            
        print(f"Extracted {len(chunks)} chunks from transcript")
        
        # Extract just the text for embedding
        chunk_texts = [chunk["text"] for chunk in chunks]
        
        # Convert to embeddings
        print("Generating embeddings...")
        vectors = convert_chunks_to_vectors(chunk_texts)
        
        # Store in ChromaDB
        store_embeddings(chunks, vectors, document_id)
        
        return {
            "document_id": document_id,
            "title": video_title,
            "chunks_count": len(chunks)
        }
        
    except Exception as e:
        print(f"Error processing YouTube link: {e}")
        raise e

if __name__ == "__main__":
    # Test
    test_url = "https://youtu.be/YqkGauqNP9k?si=sTFOnP8qr3q5XqQ7"
    result = process_youtube_link(test_url)
    print(f"Result: {result}")
