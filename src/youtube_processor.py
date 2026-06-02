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
        
        # Get transcript
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.fetch(video_id)
        
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
        return None

if __name__ == "__main__":
    # Test
    test_url = "https://www.youtube.com/watch?v=MIQmrBxp2-E"
    result = process_youtube_link(test_url)
    print(f"Result: {result}")
