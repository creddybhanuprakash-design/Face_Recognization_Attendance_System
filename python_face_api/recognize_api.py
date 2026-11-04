import base64
import binascii
import os
import re

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
configured_origins = [
    origin.strip().rstrip("/")
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
CORS(app, origins=configured_origins or default_origins)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FACES_DIR = os.environ.get("FACES_DIR", os.path.join(BASE_DIR, "faces"))
FACE_SIZE = (200, 200)
USN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,32}$")
_trained_model = None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


def decode_image(data):
    if not isinstance(data, dict):
        return None

    image_data = data.get("image")
    if not isinstance(image_data, str):
        return None

    encoded_image = image_data.split(",", 1)[-1]
    try:
        image_bytes = base64.b64decode(encoded_image, validate=True)
    except (binascii.Error, ValueError):
        return None

    return cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)


def get_face_cascade():
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if cascade.empty():
        raise RuntimeError("Unable to load the OpenCV face detector")
    return cascade


@app.route("/enroll", methods=["POST"])
def enroll():
    global _trained_model

    data = request.get_json(silent=True) or {}
    usn = data.get("usn")
    image = decode_image(data)

    if not isinstance(usn, str) or not USN_PATTERN.fullmatch(usn):
        return jsonify({"message": "USN may contain only letters, numbers, underscores, and hyphens"}), 400
    if image is None:
        return jsonify({"message": "A valid base64 image is required"}), 400

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = get_face_cascade().detectMultiScale(
        gray, scaleFactor=1.3, minNeighbors=5
    )
    if len(faces) == 0:
        return jsonify({"message": "No face detected"}), 400

    student_folder = os.path.join(FACES_DIR, usn)
    os.makedirs(student_folder, exist_ok=True)
    existing_images = [
        filename for filename in os.listdir(student_folder)
        if filename.lower().endswith(".jpg")
    ]

    for index, (x, y, width, height) in enumerate(faces, start=1):
        face = cv2.resize(gray[y:y + height, x:x + width], FACE_SIZE)
        img_path = os.path.join(
            student_folder, f"{len(existing_images) + index}.jpg"
        )
        if not cv2.imwrite(img_path, face):
            return jsonify({"message": "Failed to save the enrolled face"}), 500

    _trained_model = None
    return jsonify({"message": f"Student {usn} enrolled successfully"})


def train_model():
    global _trained_model
    if _trained_model is not None:
        return _trained_model

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    faces = []
    labels = []
    label_to_usn = {}

    if not os.path.isdir(FACES_DIR):
        raise ValueError("No enrolled face images found")

    for label, usn in enumerate(sorted(os.listdir(FACES_DIR))):
        if not USN_PATTERN.fullmatch(usn):
            continue
        student_folder = os.path.join(FACES_DIR, usn)
        if not os.path.isdir(student_folder):
            continue

        for filename in sorted(os.listdir(student_folder)):
            if not filename.lower().endswith(".jpg"):
                continue
            image = cv2.imread(
                os.path.join(student_folder, filename), cv2.IMREAD_GRAYSCALE
            )
            if image is None:
                app.logger.warning("Skipping unreadable face image: %s", filename)
                continue
            faces.append(cv2.resize(image, FACE_SIZE))
            labels.append(label)
            label_to_usn[label] = usn

    if not faces:
        raise ValueError("No enrolled face images found")

    recognizer.train(faces, np.asarray(labels, dtype=np.int32))
    _trained_model = (recognizer, label_to_usn)
    return _trained_model


@app.route("/recognize", methods=["POST"])
def recognize():
    image = decode_image(request.get_json(silent=True) or {})
    if image is None:
        return jsonify({"message": "A valid base64 image is required"}), 400

    try:
        recognizer, label_to_usn = train_model()
    except (ValueError, RuntimeError) as error:
        return jsonify({"message": str(error)}), 503

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = get_face_cascade().detectMultiScale(
        gray, scaleFactor=1.3, minNeighbors=5
    )
    if len(faces) == 0:
        return jsonify({"usn": "No face detected"})

    x, y, width, height = faces[0]
    face = cv2.resize(gray[y:y + height, x:x + width], FACE_SIZE)
    label, confidence = recognizer.predict(face)

    if confidence > 100:
        return jsonify({"usn": "Unknown", "confidence": int(confidence)})

    return jsonify({
        "usn": label_to_usn.get(label, "Unknown"),
        "confidence": int(confidence)
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")))
