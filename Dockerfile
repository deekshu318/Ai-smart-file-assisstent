FROM python:3.11-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY . .

# Create uploads directory
RUN mkdir -p src/uploads

# Hugging Face Spaces runs on port 7860 by default
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "7860"]
