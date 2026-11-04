# Face Recognition Attendance System

A local attendance application with a React/Vite frontend, an Express and MongoDB
backend, and a Flask/OpenCV face-recognition service.

## What it does

- Register administrators and sign in to protected management pages.
- Enroll students and capture face samples using a webcam.
- Recognize enrolled faces and record daily or period attendance.
- Review attendance and download reports.

## Services and ports

| Service | Port | Directory |
| --- | ---: | --- |
| React + Vite | 5173 | `client/` |
| Express API + MongoDB | 5001 | `server/` |
| Flask + OpenCV face API | 5000 | `python_face_api/` |

For the simplest setup, run all three services on the same computer. The API
services bind to localhost; this is a development/local-install setup, not a
public production deployment.

## Requirements

- Git
- Node.js **20.19 or newer** (Mongoose 9 requires Node.js 20.19+)
- Python **3.11** recommended
- MongoDB running locally, or a MongoDB Atlas database
- A webcam and a browser that permits camera access on `localhost`

Check the installed tools:

```powershell
git --version
node --version
npm --version
py -3.11 --version
```

## Install and run on Windows

### 1. Clone the repository

Use Git to get a working copy:

```powershell
git clone https://github.com/JaganReddy-33/Face_Attendance_Management_System.git
cd Face_Attendance_Management_System
```

Do not use the old `yourusername` example URL. A Git clone also keeps the
repository history needed to push changes later.

### 2. Configure MongoDB and the server

Start your local MongoDB service, or create an Atlas cluster and allow your
computer's IP address in its network access settings. For Atlas, create a
database user and use its connection string.

In PowerShell, create a private server environment file and generate a
cryptographically random signing key:

```powershell
Copy-Item server\.env.example server\.env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
notepad server\.env
```

Set `MONGODB_URI` to your own MongoDB connection string and replace
`JWT_SECRET` with the generated value. Keep `server\.env` private; it is ignored
by Git. For a local MongoDB install, the URI can be:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/attendance_system
```

Install and start the Express service in the first terminal:

```powershell
cd server
npm install
npm start
```

Wait for the MongoDB connected and server listening messages. Keep this
terminal open.

### 3. Install and start the face API

Open a second terminal at the repository root:

```powershell
cd python_face_api
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python recognize_api.py
```

If PowerShell blocks virtual-environment activation, run
`.\.venv\Scripts\python.exe -m pip install -r requirements.txt` and
`.\.venv\Scripts\python.exe recognize_api.py` instead. Keep this terminal open.

### 4. Install and start the web app

Open a third terminal at the repository root:

```powershell
cd client
npm install
npm run dev
```

Open the localhost URL printed by Vite (normally
`http://localhost:5173`). Keep this terminal open and allow camera access when
the browser asks.

### 5. First use

1. Open the **Sign in** page.
2. Register the first admin using a valid email and a password of 12–72
   characters. Public registration closes after that first account is created.
3. Sign in. Management and attendance API requests require the issued login
   token, which expires after eight hours.
4. Enroll each student from the admin pages and capture their face. The saved
   face samples stay on this computer under `python_face_api/faces/`.
5. Open the attendance page, allow camera use, and use the attendance and
   report screens as needed.

The face API now stores detected, resized face crops instead of whole camera
frames. Re-enroll students whose existing sample files were captured by the
older implementation.

## Install on another computer

On each computer:

1. Install Git, Node.js 20.19+, Python 3.11, and MongoDB (or arrange access to
   the same Atlas database).
2. Clone the repository using the commands in step 1 above.
3. Create that computer's `server\.env` using `server\.env.example`; configure
   its MongoDB URI and generate a fresh `JWT_SECRET`.
4. Follow steps 2–4 above to install and start all three services.
5. Sign in with an existing admin account, or create the first admin if the
   selected database has no admin yet.

Atlas can share student and attendance records between installations that use
the same database. Biometric face samples are intentionally excluded from Git
and are local to the computer that enrolled them; enroll students again on each
computer. Do not copy face images or database credentials into a public
repository. For a shared multi-computer kiosk, the services need a deliberate
HTTPS deployment and network/CORS configuration; this localhost development
setup does not provide that.

### Downloading a ZIP

GitHub's **Code → Download ZIP** option is suitable for trying the application,
but a ZIP has no Git history and cannot be pushed as a normal Git branch. Use
`git clone` if you intend to commit or push changes.

## Tests and checks

From the repository root:

```powershell
npm --prefix client run lint
npm --prefix client run build
npm --prefix client run test
npm --prefix server test
```

The Playwright test command starts Vite automatically. If Playwright reports
that its browser is missing, install Chromium with:

```powershell
cd client
npx playwright install chromium
```

Run the face API request-validation tests from the Python service directory:

```powershell
cd python_face_api
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

Stop each running service with **Ctrl+C** in its terminal.

## Troubleshooting

- **MongoDB connection error:** Check that MongoDB is running, the URI in
  `server\.env` is correct, and Atlas allows your IP address.
- **JWT_SECRET error:** Set a random value of at least 32 characters in
  `server\.env`, then restart Express.
- **OpenCV `cv2.face` missing:** Recreate the virtual environment and install
  only the packages in `python_face_api\requirements.txt`; this project uses
  `opencv-contrib-python-headless`, not both OpenCV distributions together.
- **Camera unavailable:** Grant the browser camera permission. Camera access is
  normally allowed on `localhost`; non-local deployments need HTTPS.
- **Recognition says no samples are enrolled:** Enroll students on this
  computer; face samples are intentionally not cloned from GitHub.

## Data and security notes

- Never commit `.env` files, MongoDB credentials, signing keys, logs, or face
  images. The root `.gitignore` excludes these local files.
- If a MongoDB credential or secret was previously committed, rotate it. A
  normal follow-up commit does not erase secrets from earlier Git history.
- Collect and process biometric data only with appropriate consent and in
  accordance with applicable privacy requirements.
