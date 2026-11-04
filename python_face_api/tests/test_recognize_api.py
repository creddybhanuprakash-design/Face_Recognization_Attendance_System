import unittest

from recognize_api import app


class FaceApiValidationTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_enrollment_rejects_path_like_usn(self):
        response = self.client.post(
            "/enroll",
            json={"usn": "../outside", "image": "data:image/jpeg;base64,invalid"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("USN", response.get_json()["message"])

    def test_enrollment_rejects_invalid_image(self):
        response = self.client.post(
            "/enroll",
            json={"usn": "STUDENT_1", "image": "data:image/jpeg;base64,invalid"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("image", response.get_json()["message"])

    def test_recognition_rejects_missing_image(self):
        response = self.client.post("/recognize", json={})

        self.assertEqual(response.status_code, 400)
        self.assertIn("image", response.get_json()["message"])


if __name__ == "__main__":
    unittest.main()
