import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from src.api import app

client = TestClient(app)

def test_transcribe_empty_file():
    # Sending empty file should raise a 400 or 500 error depending on logic
    response = client.post("/transcribe", files={"file": ("voice.webm", b"")})
    # Since we added `if not audio_data: raise HTTPException(400, "Audio file is empty")`
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]

@patch("requests.post")
def test_transcribe_success_primary(mock_post):
    # Mock primary Whisper endpoint success (status 200)
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"text": "Hello world from primary Whisper"}
    mock_post.return_value = mock_response

    response = client.post("/transcribe", files={"file": ("voice.webm", b"mock-audio-data")})
    assert response.status_code == 200
    assert response.json()["text"] == "Hello world from primary Whisper"
    
    # Assert requests.post was called with primary endpoint
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert args[0] == "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
    assert kwargs["data"] == b"mock-audio-data"

@patch("requests.post")
def test_transcribe_success_fallback(mock_post):
    # Mock primary Whisper endpoint failing (status 503/500), and fallback succeeding (status 200)
    mock_res_primary = MagicMock()
    mock_res_primary.status_code = 503
    mock_res_primary.text = "Model loading..."
    
    mock_res_fallback = MagicMock()
    mock_res_fallback.status_code = 200
    mock_res_fallback.json.return_value = {"text": "Hello world from fallback Whisper"}
    
    # Side effect: first call returns primary error, second call returns fallback success
    mock_post.side_effect = [mock_res_primary, mock_res_fallback]

    response = client.post("/transcribe", files={"file": ("voice.webm", b"mock-audio-data")})
    assert response.status_code == 200
    assert response.json()["text"] == "Hello world from fallback Whisper"
    
    # Assert requests.post was called twice
    assert mock_post.call_count == 2
    
    # Verify first call details
    first_call_args = mock_post.call_args_list[0]
    assert first_call_args[0][0] == "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
    
    # Verify second call details (fallback)
    second_call_args = mock_post.call_args_list[1]
    assert second_call_args[0][0] == "https://api-inference.huggingface.co/models/distil-whisper/distil-large-v3"
