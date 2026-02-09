FROM python:3.9-slim

RUN pip install piper-tts flask pathvalidate onnxruntime

# Download the voice model during build to cache it
RUN mkdir -p /app/models
WORKDIR /app/models
# We use a trick to download: just run piper download
RUN pip install piper-tts
# We need to manually download the ONNX file
RUN apt-get update && apt-get install -y wget
RUN wget -O en_US-lessac-medium.onnx https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx
RUN wget -O en_US-lessac-medium.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

COPY server.py /app/server.py
WORKDIR /app

EXPOSE 5002

CMD ["python3", "server.py"]
