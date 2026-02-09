from flask import Flask, request, Response
import subprocess
import os
import tempfile

app = Flask(__name__)

MODEL_PATH = "/app/models/en_US-lessac-medium.onnx"

@app.route('/synthesize', methods=['POST'])
def synthesize():
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return "No text provided", 400

    # Run piper binary
    # We pipe text into stdin and get audio from stdout
    cmd = [
        "piper",
        "--model", MODEL_PATH,
        "--output_file", "-"
    ]
    
    try:
        process = subprocess.Popen(
            cmd, 
            stdin=subprocess.PIPE, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate(input=text.encode('utf-8'))
        
        if process.returncode != 0:
            return f"Piper failed: {stderr.decode('utf-8')}", 500
            
        return Response(stdout, mimetype="audio/wav")
        
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
